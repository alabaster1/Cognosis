#!/usr/bin/env node
/**
 * Debug script: Test reclaiming from psi_experiment via ClaimParticipantTimeout
 * Uses the existing UTxOs that were committed but not reclaimed
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
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Debug: Testing ClaimParticipantTimeout reclaim\n");

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
  console.log(`Wallet: ${walletAddress}`);
  console.log(`PKH: ${walletPkh}\n`);

  // Reconstruct the psi_experiment validator
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
  const psiScriptHash = validatorToScriptHash(psiValidator);
  const psiAddress = validatorToAddress("Preprod", psiValidator);

  console.log(`PSI validator hash: ${psiScriptHash}`);
  console.log(`PSI address: ${psiAddress}\n`);

  // Verify hash matches deployment
  console.log(`Deployment hash: ${deployment.psiExperiment.scriptHash}`);
  console.log(`Match: ${psiScriptHash === deployment.psiExperiment.scriptHash}\n`);

  // Also try using the stored validator script directly
  const storedPsiValidator: Script = {
    type: "PlutusV3",
    script: deployment.psiExperiment.validatorScript,
  };
  const storedHash = validatorToScriptHash(storedPsiValidator);
  console.log(`Stored validator hash: ${storedHash}`);
  console.log(`Stored match: ${storedHash === deployment.psiExperiment.scriptHash}\n`);

  // Get script UTxOs
  const scriptUtxos = await lucid.utxosAt(psiAddress);
  console.log(`Script UTxOs: ${scriptUtxos.length}`);

  if (scriptUtxos.length === 0) {
    console.log("No UTxOs to reclaim!");
    return;
  }

  // Use the FIRST UTxO (oldest)
  const targetUtxo = scriptUtxos[0];
  console.log(`\nTarget UTxO: ${targetUtxo.txHash}#${targetUtxo.outputIndex}`);
  console.log(`  Lovelace: ${targetUtxo.assets.lovelace}`);
  console.log(`  Has datum: ${!!targetUtxo.datum}`);
  console.log(`  Datum hash: ${targetUtxo.datumHash || "inline"}`);

  // Decode and inspect the datum
  if (targetUtxo.datum) {
    console.log(`  Datum (raw): ${targetUtxo.datum.substring(0, 100)}...`);
    try {
      const decoded = Data.from(targetUtxo.datum);
      console.log(`  Decoded datum type: ${typeof decoded}`);
      if (decoded instanceof Constr) {
        console.log(`  Constr index: ${decoded.index}`);
        console.log(`  Field count: ${decoded.fields.length}`);
        // Field 4 should be session_state
        console.log(`  Field 4 (session_state): ${JSON.stringify(decoded.fields[4])}`);
        // Field 6 should be join_deadline_slot
        console.log(`  Field 6 (join_deadline_slot): ${decoded.fields[6]}`);
      }
    } catch (e: any) {
      console.log(`  Decode error: ${e.message}`);
    }
  }

  // Get reference script UTxO
  const refScriptTxHash = deployment.psiExperiment.refScriptTxHash;
  console.log(`\nRef script tx: ${refScriptTxHash}`);
  const refUtxos = await lucid.utxosByOutRef([{ txHash: refScriptTxHash, outputIndex: 0 }]);
  console.log(`Ref UTxO found: ${refUtxos.length > 0}`);
  if (refUtxos.length > 0) {
    console.log(`  Ref script hash: ${refUtxos[0].scriptRef?.type} ${refUtxos[0].scriptRef?.script?.substring(0, 20)}...`);
  }

  // Build redeemer
  const reclaimRedeemer = Data.to(new Constr(6, [])); // ClaimParticipantTimeout
  console.log(`\nRedeemer CBOR: ${reclaimRedeemer}`);

  // Check current slot vs deadline
  const tip = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`, {
    headers: { project_id: BLOCKFROST_KEY },
  }).then(r => r.json());
  console.log(`Current slot: ${tip.slot}`);

  if (targetUtxo.datum) {
    const decoded = Data.from(targetUtxo.datum);
    if (decoded instanceof Constr) {
      console.log(`Join deadline (datum field 6): ${decoded.fields[6]}`);
      console.log(`Deadline passed: ${tip.slot > Number(decoded.fields[6])}`);
    }
  }

  // Try multiple approaches
  console.log("\n--- Approach 1: Attach validator directly ---");
  try {
    const tx = await lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(Date.now() - 120_000)
      .validTo(Date.now() + 600_000)
      .complete();

    console.log("TX built successfully! Signing...");
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();
    console.log(`Submitted: ${txHash}`);
    await lucid.awaitTx(txHash);
    console.log("Confirmed!");
    return;
  } catch (e: any) {
    console.log(`Failed: ${e.message}`);
  }

  console.log("\n--- Approach 2: Use reference script ---");
  try {
    if (refUtxos.length === 0) {
      console.log("No reference script UTxO found");
    } else {
      const tx = await lucid
        .newTx()
        .collectFrom([targetUtxo], reclaimRedeemer)
        .readFrom([refUtxos[0]])
        .addSigner(walletAddress)
        .validFrom(Date.now() - 120_000)
        .validTo(Date.now() + 600_000)
        .complete();

      console.log("TX built successfully! Signing...");
      const signed = await tx.sign.withWallet().complete();
      const txHash = await signed.submit();
      console.log(`Submitted: ${txHash}`);
      await lucid.awaitTx(txHash);
      console.log("Confirmed!");
      return;
    }
  } catch (e: any) {
    console.log(`Failed: ${e.message}`);
  }

  console.log("\n--- Approach 3: Skip local eval, submit directly ---");
  try {
    const tx = await lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(Date.now() - 120_000)
      .validTo(Date.now() + 600_000)
      .complete({ localUPLCEval: false });

    console.log("TX built (no local eval)! Signing...");
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();
    console.log(`Submitted: ${txHash}`);
    await lucid.awaitTx(txHash);
    console.log("Confirmed!");
    return;
  } catch (e: any) {
    console.log(`Failed: ${e.message}`);
  }

  console.log("\n--- Approach 4: Use stored validator from deployment ---");
  try {
    const tx = await lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(storedPsiValidator)
      .addSigner(walletAddress)
      .validFrom(Date.now() - 120_000)
      .validTo(Date.now() + 600_000)
      .complete({ localUPLCEval: false });

    console.log("TX built (stored validator, no local eval)! Signing...");
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();
    console.log(`Submitted: ${txHash}`);
    await lucid.awaitTx(txHash);
    console.log("Confirmed!");
    return;
  } catch (e: any) {
    console.log(`Failed: ${e.message}`);
  }

  console.log("\nAll approaches failed. Let's try to evaluate the tx CBOR via Blockfrost...");

  // Build and evaluate via Blockfrost
  try {
    const tx = lucid
      .newTx()
      .collectFrom([targetUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .validFrom(Date.now() - 120_000)
      .validTo(Date.now() + 600_000);

    // Get the built CBOR before evaluation
    console.log("Building without evaluation to get CBOR...");
  } catch (e: any) {
    console.log(`Build error: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
