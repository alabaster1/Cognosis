#!/usr/bin/env node
/**
 * Debug: Build tx CBOR and evaluate via Blockfrost API directly
 * to get detailed error messages about why the validator crashes.
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
} from "@lucid-evolution/lucid";
import type { Script, UTxO } from "@lucid-evolution/lucid";
import { slotToUnixTime, unixTimeToSlot } from "@lucid-evolution/utils";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Debug: Detailed tx evaluation\n");

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
  const psiScriptHash = validatorToScriptHash(psiValidator);

  console.log(`Wallet: ${walletAddress}`);
  console.log(`PKH: ${walletPkh}`);
  console.log(`PSI address: ${psiAddress}`);
  console.log(`PSI hash: ${psiScriptHash}\n`);

  // Get UTxOs
  const scriptUtxos = await lucid.utxosAt(psiAddress);
  console.log(`UTxOs at script: ${scriptUtxos.length}`);

  // Use the first one with a proper datum
  const targetUtxo = scriptUtxos.find(u => {
    if (!u.datum) return false;
    try {
      const d = Data.from(u.datum);
      return d instanceof Constr && d.index === 0 && d.fields.length === 15;
    } catch { return false; }
  });

  if (!targetUtxo) {
    console.log("No UTxO with valid PsiDatum found");
    return;
  }

  console.log(`Target: ${targetUtxo.txHash}#${targetUtxo.outputIndex}`);

  // Decode datum
  const datum = Data.from(targetUtxo.datum!) as Constr<any>;
  const joinDeadlineSlot = Number(datum.fields[6]);
  console.log(`Join deadline slot: ${joinDeadlineSlot}`);

  // Get current slot
  const tip = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`, {
    headers: { project_id: BLOCKFROST_KEY },
  }).then(r => r.json());
  console.log(`Current slot: ${tip.slot}`);
  console.log(`Deadline passed: ${tip.slot > joinDeadlineSlot}`);

  // Compute validFrom - must be > deadline slot
  const validFromSlot = joinDeadlineSlot + 2;
  const validFromPosix = slotToUnixTime("Preprod", validFromSlot);
  const validToPosix = Date.now() + 600_000;

  // Verify slot conversion round-trip
  const verifySlot = unixTimeToSlot("Preprod", validFromPosix);
  console.log(`\nvalidFrom: posix ${validFromPosix} -> slot ${verifySlot} (target: ${validFromSlot})`);
  console.log(`Slot > deadline? ${verifySlot} > ${joinDeadlineSlot} = ${verifySlot > joinDeadlineSlot}`);

  const reclaimRedeemer = Data.to(new Constr(6, []));
  console.log(`Redeemer CBOR: ${reclaimRedeemer}`);

  // Try completeSafe to get detailed error
  console.log("\n--- Approach 1: completeSafe with local eval ---");
  try {
    const txBuilder = lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(validFromPosix)
      .validTo(validToPosix);

    const result: any = await txBuilder.completeSafe();
    console.log("Result _tag:", result._tag);
    console.log("Has left:", "left" in result);
    console.log("Has right:", "right" in result);

    if (result._tag === "Right" || result.right) {
      console.log("SUCCESS - got TxSignBuilder");
      const tx = result.right || result;
      console.log("Tx type:", typeof tx);
    } else if (result._tag === "Left" || result.left) {
      const err = result.left || result;
      console.log("ERROR:", JSON.stringify(err, null, 2).substring(0, 1000));
    } else {
      console.log("Unknown result shape:", Object.keys(result));
      console.log("Full result:", JSON.stringify(result, null, 2).substring(0, 1000));
    }
  } catch (e: any) {
    console.log(`Exception: ${e.message?.substring(0, 500)}`);
  }

  // Try completeSafe without local eval
  console.log("\n--- Approach 2: completeSafe WITHOUT local eval ---");
  try {
    const txBuilder = lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(validFromPosix)
      .validTo(validToPosix);

    const result: any = await txBuilder.completeSafe({ localUPLCEval: false });
    console.log("Result _tag:", result._tag);

    if (result._tag === "Right" || result.right) {
      console.log("SUCCESS - got TxSignBuilder (Blockfrost eval passed!)");
      // Try to sign and submit
      try {
        const txObj = result.right || result;
        if (txObj.sign) {
          const signed = await txObj.sign.withWallet().complete();
          const txHash = await signed.submit();
          console.log(`SUBMITTED: ${txHash}`);
        } else {
          console.log("No sign method on result");
          console.log("Keys:", Object.keys(txObj));
        }
      } catch (signErr: any) {
        console.log(`Sign/submit error: ${signErr.message?.substring(0, 300)}`);
      }
    } else if (result._tag === "Left" || result.left) {
      const err = result.left || result;
      console.log("ERROR:", JSON.stringify(err, null, 2).substring(0, 1000));
    } else {
      console.log("Unknown result:", JSON.stringify(result, null, 2).substring(0, 1000));
    }
  } catch (e: any) {
    console.log(`Exception: ${e.message?.substring(0, 500)}`);
  }

  // Try direct Blockfrost evaluation
  console.log("\n--- Approach 3: Build CBOR manually and evaluate via Blockfrost API ---");
  try {
    // Build tx without any evaluation at all - use the complete() but catch it
    // We need to construct the CBOR first
    // Try: use complete() with localUPLCEval: false and if it fails with EvaluateTransaction,
    // extract the CBOR from the error

    const txBuilder = lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(validFromPosix)
      .validTo(validToPosix);

    // Try to just build without evaluating
    const result: any = await txBuilder.completeSafe({ localUPLCEval: false });

    // Check if we can get the CBOR even from the error
    if (result._tag === "Left" || result.left) {
      const err = result.left;
      console.log("Error type:", typeof err);
      // Walk the error structure
      if (err && typeof err === 'object') {
        for (const [key, val] of Object.entries(err)) {
          console.log(`  ${key}: ${JSON.stringify(val).substring(0, 200)}`);
        }
      }
    }
  } catch (e: any) {
    console.log(`Exception: ${e.message?.substring(0, 500)}`);
    if (e.cause) console.log("Cause:", JSON.stringify(e.cause).substring(0, 300));
  }

  // Check what the actual slot conversion gives us
  console.log("\n--- Slot diagnostics ---");
  for (const offset of [0, 1, 2, 5, 10, 60, 120]) {
    const slotVal = joinDeadlineSlot + offset;
    const posix = slotToUnixTime("Preprod", slotVal);
    const backToSlot = unixTimeToSlot("Preprod", posix);
    console.log(`  deadline+${offset}: slot=${slotVal}, posix=${posix}, back=${backToSlot}, posix_date=${new Date(posix).toISOString()}`);
  }

  console.log(`\n  Date.now(): ${Date.now()}`);
  console.log(`  Current time: ${new Date().toISOString()}`);
  const nowSlot = unixTimeToSlot("Preprod", Date.now());
  console.log(`  Now as slot: ${nowSlot}`);
  console.log(`  Now slot > deadline: ${nowSlot > joinDeadlineSlot}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
