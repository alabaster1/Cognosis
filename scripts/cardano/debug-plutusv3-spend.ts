#!/usr/bin/env node
/**
 * Debug: Test basic PlutusV3 spend with Lucid-Evolution
 *
 * Creates a minimal test to verify:
 * 1. Can we lock funds at a PlutusV3 script?
 * 2. Can we spend from it with the correct redeemer?
 *
 * Uses the simplest possible validator: always succeeds for spending
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
  mintingPolicyToId,
  scriptFromNative,
} from "@lucid-evolution/lucid";
import type { Script, UTxO, Native } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Debug: Testing PlutusV3 basic spend mechanics\n");

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

  // ===== TEST 1: Use the research pool validator (simpler) =====
  // Research pool has no parameters and is simpler
  // Try spending from it with the Contribute redeemer

  // Actually, let's try the SIMPLEST possible thing:
  // Lock 2 ADA at psi_experiment, then try to reclaim
  // But instead of ClaimParticipantTimeout, try the Settle redeemer
  // (which only checks session_state == Settled)
  // This will ALSO crash, which tells us the crash happens during datum deserialization

  console.log("===== TEST: Datum deserialization check =====\n");

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

  // Get existing UTxOs
  const scriptUtxos = await lucid.utxosAt(psiAddress);
  console.log(`Existing UTxOs: ${scriptUtxos.length}`);

  if (scriptUtxos.length === 0) {
    console.log("No UTxOs to test with. Exiting.");
    return;
  }

  const testUtxo = scriptUtxos[0];
  console.log(`Test UTxO: ${testUtxo.txHash}#${testUtxo.outputIndex}`);

  // Try Settle redeemer (Constr 4) - will fail validation (wrong state)
  // But we can see if the crash is before or after state check
  console.log("\n--- Test: Settle redeemer (Constr 4) ---");
  try {
    const settleRedeemer = Data.to(new Constr(4, []));
    const tx = await lucid
      .newTx()
      .collectFrom([testUtxo], settleRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .complete();
    console.log("TX built (unexpected success)");
  } catch (e: any) {
    console.log(`Result: ${e.message.substring(0, 200)}`);
  }

  // Try MutualCancel redeemer (Constr 7) - needs both parties to sign
  // This tests if the script gets past datum deserialization
  console.log("\n--- Test: MutualCancel redeemer (Constr 7) ---");
  try {
    const cancelRedeemer = Data.to(new Constr(7, []));
    const tx = await lucid
      .newTx()
      .collectFrom([testUtxo], cancelRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .complete();
    console.log("TX built (unexpected success)");
  } catch (e: any) {
    console.log(`Result: ${e.message.substring(0, 200)}`);
  }

  // Try with a completely wrong datum - lock a new UTxO with a simple integer datum
  console.log("\n\n===== TEST: Lock with simple datum, spend back =====\n");

  const simpleDatum = Data.to(42n);
  console.log("Locking 2 ADA with datum=42...");

  try {
    const lockTx = await lucid
      .newTx()
      .pay.ToContract(
        psiAddress,
        { kind: "inline", value: simpleDatum },
        { lovelace: 2_000_000n }
      )
      .complete();

    const signedLock = await lockTx.sign.withWallet().complete();
    const lockHash = await signedLock.submit();
    console.log(`Lock tx: ${lockHash}`);
    console.log("Waiting for confirmation...");
    await lucid.awaitTx(lockHash);
    console.log("Confirmed!");

    // Now try to spend it back
    console.log("\nTrying to spend with ClaimParticipantTimeout...");
    const newUtxos = await lucid.utxosAt(psiAddress);
    const newUtxo = newUtxos.find(u => u.txHash === lockHash);
    if (!newUtxo) throw new Error("New UTxO not found");

    try {
      const reclaimRedeemer = Data.to(new Constr(6, []));
      const spendTx = await lucid
        .newTx()
        .collectFrom([newUtxo], reclaimRedeemer)
        .attach.SpendingValidator(psiValidator)
        .addSigner(walletAddress)
        .validFrom(Date.now() - 120_000)
        .validTo(Date.now() + 600_000)
        .complete();
      console.log("TX built successfully (datum=42 -> crash expected at deserialization)");
    } catch (e: any) {
      console.log(`Spend result: ${e.message.substring(0, 200)}`);
      // If this also says "crashed / exited prematurely", the crash is during datum deserialization
      // If it gives a different error, the crash is after deserialization
    }
  } catch (e: any) {
    console.log(`Lock failed: ${e.message.substring(0, 200)}`);
  }

  // ===== Final diagnostic: check Lucid-Evolution version =====
  console.log("\n\n===== Diagnostic Info =====");
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../node_modules/@lucid-evolution/lucid/package.json"), "utf-8")
    );
    console.log(`Lucid-Evolution version: ${pkg.version}`);
  } catch {
    console.log("Could not read Lucid-Evolution version");
  }

  // Check network era
  try {
    const epochInfo = await fetch(
      `https://cardano-preprod.blockfrost.io/api/v0/epochs/latest`,
      { headers: { project_id: BLOCKFROST_KEY } }
    ).then(r => r.json());
    console.log(`Current epoch: ${epochInfo.epoch}`);
    console.log(`Block count: ${epochInfo.block_count}`);

    // Check protocol parameters for PlutusV3 support
    const params = await fetch(
      `https://cardano-preprod.blockfrost.io/api/v0/epochs/latest/parameters`,
      { headers: { project_id: BLOCKFROST_KEY } }
    ).then(r => r.json());
    console.log(`Protocol version: ${params.protocol_major_ver}.${params.protocol_minor_ver}`);
    console.log(`Cost model V3 exists: ${!!params.cost_models?.PlutusV3}`);
    console.log(`Min fee coefficient: ${params.min_fee_a}`);
  } catch (e: any) {
    console.log(`Epoch info error: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
