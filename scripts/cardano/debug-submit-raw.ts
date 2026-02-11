#!/usr/bin/env node
/**
 * Debug: Submit raw transaction bypassing Lucid evaluation
 * Uses Blockfrost tx submit endpoint directly
 */

import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  applyDoubleCborEncoding,
  applyParamsToScript,
  validatorToAddress,
  validatorToScriptHash,
  getAddressDetails,
  CML,
} from "@lucid-evolution/lucid";
import type { Script, UTxO } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Debug: Attempting raw tx submission\n");

  const deployment = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "PREPROD_DEPLOYMENT.json"), "utf-8")
  );
  const plutusJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../cardano/plutus.json"), "utf-8")
  );

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", BLOCKFROST_KEY),
    "Preprod"
  );
  lucid.selectWallet.fromSeed(SEED_PHRASE);

  const walletAddress = await lucid.wallet().address();
  const { paymentCredential } = getAddressDetails(walletAddress);
  const walletPkh = paymentCredential!.hash;

  // Reconstruct validator
  const psiValidatorData = plutusJson.validators.find(
    (v: any) => v.title === "psi_experiment.psi_experiment.spend"
  );
  const researchPoolScriptHash = deployment.researchPool.scriptHash;
  const researchPoolAddressParam = new Constr(0, [
    new Constr(1, [researchPoolScriptHash]),
    new Constr(1, []),
  ]);
  const parameterizedPsiScript = applyParamsToScript(
    applyDoubleCborEncoding(psiValidatorData.compiledCode),
    [researchPoolAddressParam]
  );
  const psiValidator: Script = {
    type: "PlutusV3",
    script: parameterizedPsiScript,
  };
  const psiAddress = validatorToAddress("Preprod", psiValidator);

  // Get the UTxO to spend
  const scriptUtxos = await lucid.utxosAt(psiAddress);
  console.log(`UTxOs at script: ${scriptUtxos.length}`);
  const targetUtxo = scriptUtxos[0];
  console.log(`Target: ${targetUtxo.txHash}#${targetUtxo.outputIndex}`);

  // Try: Use Blockfrost evaluation endpoint directly
  // First, let's build the tx CBOR without evaluation
  console.log("\nBuilding tx CBOR without evaluation...");

  try {
    // Build using Lucid but patch the evaluation
    // Use the completeSafe method to get detailed errors
    const txBuilder = lucid
      .newTx()
      .collectFrom([targetUtxo], Data.to(new Constr(6, [])))
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(Date.now() - 120_000)
      .validTo(Date.now() + 600_000);

    // Try completeSafe for better error details
    const result = await txBuilder.completeSafe({ localUPLCEval: false });

    if ('left' in result) {
      console.log("completeSafe left (success):", typeof result.left);
      const signed = await result.left.sign.withWallet().complete();
      const txHash = await signed.submit();
      console.log(`Submitted! Tx: ${txHash}`);
      await lucid.awaitTx(txHash);
      console.log("Confirmed!");
    } else {
      console.log("completeSafe right (error):", JSON.stringify(result.right, null, 2).substring(0, 500));
    }
  } catch (e: any) {
    console.log(`Error: ${e.message?.substring(0, 500)}`);
  }

  // Try: Evaluate the CBOR via Blockfrost directly
  console.log("\n--- Direct Blockfrost evaluation ---");
  try {
    // Build tx CBOR first
    // Try using the Effect-based API
    const txBuilder = lucid
      .newTx()
      .collectFrom([targetUtxo], Data.to(new Constr(6, [])))
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(Date.now() - 120_000)
      .validTo(Date.now() + 600_000);

    // Get the raw tx builder output
    console.log("Attempting to evaluate...");
    const result = await txBuilder.completeSafe();

    // Check the Either type
    const anyResult: any = result;
    if (anyResult.right) {
      const errMsg = JSON.stringify(anyResult.right);
      console.log(`Error details: ${errMsg.substring(0, 1000)}`);

      // Parse the error for more info
      if (errMsg.includes('ScriptFailures')) {
        console.log("\nScript failure detected. This means the script evaluated and failed.");
        console.log("The empty ScriptFailures suggests Blockfrost couldn't capture the trace.");
      }
    } else if (anyResult.left) {
      console.log("Unexpectedly succeeded!");
    }
  } catch (e: any) {
    console.log(`Error: ${e.message?.substring(0, 500)}`);
  }

  // Let's also check: what does the inline datum look like when decoded by Lucid?
  console.log("\n--- Datum analysis ---");
  if (targetUtxo.datum) {
    const rawDatum = targetUtxo.datum;
    console.log(`Raw datum hex (first 200 chars): ${rawDatum.substring(0, 200)}`);

    // Try to decode as generic Data
    const decoded = Data.from(rawDatum);
    console.log(`Decoded type: ${decoded.constructor?.name || typeof decoded}`);

    if (decoded instanceof Constr) {
      console.log(`Index: ${decoded.index}`);
      console.log(`Fields (${decoded.fields.length}):`);
      decoded.fields.forEach((field: any, i: number) => {
        let repr: string;
        if (field instanceof Constr) {
          repr = `Constr(${field.index}, [${field.fields.map((f: any) => typeof f === 'bigint' ? f.toString() : JSON.stringify(f)).join(', ')}])`;
        } else if (typeof field === 'bigint') {
          repr = field.toString();
        } else if (typeof field === 'string') {
          repr = `"${field}" (${field.length / 2} bytes)`;
        } else if (Array.isArray(field)) {
          repr = `Array(${field.length})`;
        } else {
          repr = JSON.stringify(field);
        }
        console.log(`  [${i}] = ${repr}`);
      });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
