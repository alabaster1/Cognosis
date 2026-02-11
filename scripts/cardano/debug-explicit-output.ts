#!/usr/bin/env node
/**
 * Debug: Test reclaim with explicit output to host
 * The validator's verify_full_refund checks for an output to the host PKH
 * with at least stake_lovelace. Maybe Lucid's change output doesn't satisfy this.
 * Try adding an explicit pay.ToAddress to ensure the check passes.
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
  paymentCredentialOf,
} from "@lucid-evolution/lucid";
import type { Script } from "@lucid-evolution/lucid";
import { slotToUnixTime } from "@lucid-evolution/utils";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Debug: Test with explicit output to host\n");

  const deployment = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "PREPROD_DEPLOYMENT.json"), "utf-8")
  );
  // Use trace-enabled plutus.json for better error messages
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
  console.log(`Wallet: ${walletAddress}`);
  console.log(`PKH: ${walletPkh}`);

  // Use the TRACE-ENABLED validator (already built with --trace-level verbose)
  const psiValidatorData = plutusJson.validators.find(
    (v: any) => v.title === "psi_experiment.psi_experiment.spend"
  );
  const researchPoolScriptHash = deployment.researchPool.scriptHash;
  const researchPoolAddressParam = new Constr(0, [
    new Constr(1, [researchPoolScriptHash]),
    new Constr(1, []),
  ]);
  const parameterizedScript = applyParamsToScript(
    applyDoubleCborEncoding(psiValidatorData.compiledCode),
    [researchPoolAddressParam]
  );
  const traceValidator: Script = {
    type: "PlutusV3",
    script: parameterizedScript,
  };
  const traceAddress = validatorToAddress("Preprod", traceValidator);

  // Get the UTxO we committed in the previous test
  const scriptUtxos = await lucid.utxosAt(traceAddress);
  console.log(`UTxOs at trace address: ${scriptUtxos.length}`);

  if (scriptUtxos.length === 0) {
    console.log("No UTxOs to test with. Run debug-trace-test.ts first.");
    return;
  }

  const utxo = scriptUtxos[0];
  console.log(`UTxO: ${utxo.txHash}#${utxo.outputIndex}`);

  if (!utxo.datum) {
    console.log("No inline datum!");
    return;
  }

  const decoded = Data.from(utxo.datum) as Constr<any>;
  const joinDeadlineSlot = Number(decoded.fields[6]);
  const stakeLovelace = Number(decoded.fields[8]);
  const hostPkh = decoded.fields[1] as string;

  console.log(`Join deadline: ${joinDeadlineSlot}`);
  console.log(`Stake: ${stakeLovelace} lovelace`);
  console.log(`Host PKH: ${hostPkh}`);
  console.log(`Wallet PKH matches host: ${hostPkh === walletPkh}\n`);

  const validFromPosix = slotToUnixTime("Preprod", joinDeadlineSlot + 2);
  const reclaimRedeemer = Data.to(new Constr(6, []));

  // Approach 1: WITHOUT explicit output (just like before - should fail)
  console.log("--- Test 1: Without explicit output (baseline) ---");
  try {
    const result: any = await lucid
      .newTx()
      .collectFrom([utxo], reclaimRedeemer)
      .attach.SpendingValidator(traceValidator)
      .addSigner(walletAddress)
      .validFrom(validFromPosix)
      .validTo(Date.now() + 600_000)
      .completeSafe();

    if (result._tag === "Left") {
      console.log(`FAILED (expected): ${result.left.cause?.substring(0, 200)}`);
    } else {
      console.log("Unexpectedly succeeded!");
    }
  } catch (e: any) {
    console.log(`Exception: ${e.message?.substring(0, 200)}`);
  }

  // Approach 2: WITH explicit output to wallet address
  console.log("\n--- Test 2: With explicit pay.ToAddress(walletAddress, 2 ADA) ---");
  try {
    const result: any = await lucid
      .newTx()
      .collectFrom([utxo], reclaimRedeemer)
      .attach.SpendingValidator(traceValidator)
      .addSigner(walletAddress)
      .pay.ToAddress(walletAddress, { lovelace: BigInt(stakeLovelace) })
      .validFrom(validFromPosix)
      .validTo(Date.now() + 600_000)
      .completeSafe();

    if (result._tag === "Left") {
      console.log(`FAILED: ${result.left.cause?.substring(0, 200)}`);
    } else {
      console.log("SUCCESS! TX built.");
      try {
        const signed = await result.right.sign.withWallet().complete();
        const txHash = await signed.submit();
        console.log(`Submitted: ${txHash}`);
        console.log("Waiting for confirmation...");
        await lucid.awaitTx(txHash);
        console.log("CONFIRMED!");
      } catch (e2: any) {
        console.log(`Sign/submit error: ${e2.message?.substring(0, 300)}`);
      }
    }
  } catch (e: any) {
    console.log(`Exception: ${e.message?.substring(0, 200)}`);
  }

  // Approach 3: With explicit output to a simple PKH-only address
  console.log("\n--- Test 3: With explicit pay to PKH-only address ---");
  try {
    // Construct an enterprise address (no staking credential) from just the PKH
    // This isolates whether the issue is with the staking credential in the address
    const result: any = await lucid
      .newTx()
      .collectFrom([utxo], reclaimRedeemer)
      .attach.SpendingValidator(traceValidator)
      .addSigner(walletAddress)
      .pay.ToAddress(walletAddress, { lovelace: 3_000_000n })
      .validFrom(validFromPosix)
      .validTo(Date.now() + 600_000)
      .completeSafe();

    if (result._tag === "Left") {
      console.log(`FAILED: ${result.left.cause?.substring(0, 200)}`);
    } else {
      console.log("SUCCESS with 3 ADA explicit output!");
    }
  } catch (e: any) {
    console.log(`Exception: ${e.message?.substring(0, 200)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
