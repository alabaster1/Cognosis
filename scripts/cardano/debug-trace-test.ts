#!/usr/bin/env node
/**
 * Debug: Deploy trace-enabled psi_experiment, commit, and reclaim
 * The trace messages will tell us exactly where the validator crashes.
 * Uses a 90-second deadline so we can test quickly.
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
import type { Script } from "@lucid-evolution/lucid";
import { slotToUnixTime } from "@lucid-evolution/utils";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Debug: Trace-enabled validator test\n");

  const deployment = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "PREPROD_DEPLOYMENT.json"), "utf-8")
  );
  // Uses the TRACE-ENABLED plutus.json (compiled with --trace-level verbose)
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

  // Build TRACE-ENABLED validator (different hash from deployed!)
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
  const traceHash = validatorToScriptHash(traceValidator);
  const traceAddress = validatorToAddress("Preprod", traceValidator);

  console.log(`Wallet: ${walletAddress}`);
  console.log(`PKH: ${walletPkh}`);
  console.log(`Trace validator hash: ${traceHash}`);
  console.log(`Trace address: ${traceAddress}`);
  console.log(`(This is DIFFERENT from deployed address - expected)\n`);

  // Step 1: Commit a UTxO to the trace-enabled validator
  const tip = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`, {
    headers: { project_id: BLOCKFROST_KEY },
  }).then(r => r.json());
  const currentSlot = tip.slot;

  // 90-second deadline
  const joinDeadlineSlot = currentSlot + 90;
  const revealDeadlineSlot = currentSlot + 300;

  const targetValue = `trace_test_${Date.now()}`;
  const nonce = crypto.randomBytes(32);
  const { blake2b } = await import("blakejs");
  const targetHash = Buffer.from(
    blake2b(Buffer.concat([Buffer.from(targetValue, "utf8"), nonce]), undefined, 32)
  ).toString("hex");

  console.log(`Current slot: ${currentSlot}`);
  console.log(`Join deadline: ${joinDeadlineSlot} (in 90s)`);

  // Build PsiDatum
  const psiDatum = new Constr(0, [
    targetHash,
    walletPkh,
    new Constr(1, []),     // participant_pkh: None
    new Constr(6, []),     // game_type: RemoteViewing (index 6)
    new Constr(0, []),     // session_state: AwaitingParticipant (index 0)
    BigInt(currentSlot),
    BigInt(joinDeadlineSlot),
    BigInt(revealDeadlineSlot),
    2_000_000n,            // stake_lovelace
    5n,                    // research_pool_pct
    1n,                    // max_participants
    0n,                    // current_participants
    [],                    // participant_guesses
    new Constr(1, []),     // ipfs_cid: None
    new Constr(1, []),     // ai_score: None
  ]);

  console.log("\nStep 1: Committing 2 ADA to trace-enabled validator...");
  const commitTx = await lucid
    .newTx()
    .pay.ToContract(
      traceAddress,
      { kind: "inline", value: Data.to(psiDatum) },
      { lovelace: 2_000_000n }
    )
    .complete();
  const signedCommit = await commitTx.sign.withWallet().complete();
  const commitHash = await signedCommit.submit();
  console.log(`Commit tx: ${commitHash}`);
  console.log("Waiting for confirmation...");
  await lucid.awaitTx(commitHash);
  console.log("Confirmed!\n");

  // Step 2: Wait for deadline + buffer
  console.log("Step 2: Waiting for join deadline to pass...");
  const targetWaitSlot = joinDeadlineSlot + 15; // 15 extra seconds
  let latestSlot = currentSlot;
  while (latestSlot <= targetWaitSlot) {
    await new Promise(r => setTimeout(r, 10_000));
    const latestTip = await fetch(
      `https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`,
      { headers: { project_id: BLOCKFROST_KEY } }
    ).then(r => r.json());
    latestSlot = latestTip.slot;
    console.log(`  Slot: ${latestSlot} (need > ${targetWaitSlot})`);
  }
  console.log("Deadline passed!\n");

  // Step 3: Try to reclaim - the trace messages will tell us where it crashes
  console.log("Step 3: Building reclaim transaction...");

  const validFromPosix = slotToUnixTime("Preprod", joinDeadlineSlot + 2);
  const reclaimRedeemer = Data.to(new Constr(6, [])); // ClaimParticipantTimeout

  // Get the UTxO we committed
  const scriptUtxos = await lucid.utxosAt(traceAddress);
  const ourUtxo = scriptUtxos.find(u => u.txHash === commitHash);
  if (!ourUtxo) throw new Error("UTxO not found!");

  console.log(`UTxO: ${ourUtxo.txHash}#${ourUtxo.outputIndex}`);
  console.log(`validFrom slot: ${joinDeadlineSlot + 2}`);

  // Try with local eval first (should show trace messages)
  console.log("\n--- Local UPLC evaluation (with traces) ---");
  try {
    const tx = await lucid
      .newTx()
      .collectFrom([ourUtxo], reclaimRedeemer)
      .attach.SpendingValidator(traceValidator)
      .addSigner(walletAddress)
      .validFrom(validFromPosix)
      .validTo(Date.now() + 600_000)
      .complete();

    console.log("TX built successfully!");
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();
    console.log(`Submitted: ${txHash}`);
    await lucid.awaitTx(txHash);
    console.log("CONFIRMED! Reclaim successful!");
  } catch (e: any) {
    console.log(`FAILED: ${e.message?.substring(0, 1000)}`);
    if (e.cause) console.log(`Cause: ${JSON.stringify(e.cause).substring(0, 500)}`);

    // Try completeSafe for more detail
    console.log("\n--- completeSafe with local eval ---");
    try {
      const result: any = await lucid
        .newTx()
        .collectFrom([ourUtxo], reclaimRedeemer)
        .attach.SpendingValidator(traceValidator)
        .addSigner(walletAddress)
        .validFrom(validFromPosix)
        .validTo(Date.now() + 600_000)
        .completeSafe();

      if (result._tag === "Left") {
        console.log("Error:", JSON.stringify(result.left, null, 2).substring(0, 2000));
      } else {
        console.log("Success (unexpected):", result._tag);
      }
    } catch (e2: any) {
      console.log(`completeSafe exception: ${e2.message?.substring(0, 500)}`);
    }

    // Try without local eval (Blockfrost)
    console.log("\n--- Blockfrost evaluation ---");
    try {
      const result: any = await lucid
        .newTx()
        .collectFrom([ourUtxo], reclaimRedeemer)
        .attach.SpendingValidator(traceValidator)
        .addSigner(walletAddress)
        .validFrom(validFromPosix)
        .validTo(Date.now() + 600_000)
        .completeSafe({ localUPLCEval: false });

      if (result._tag === "Left") {
        console.log("Error:", JSON.stringify(result.left, null, 2).substring(0, 2000));
      } else {
        console.log("Success (Blockfrost eval passed!)");
        try {
          const tx = result.right;
          const signed = await tx.sign.withWallet().complete();
          const txHash = await signed.submit();
          console.log(`Submitted: ${txHash}`);
          await lucid.awaitTx(txHash);
          console.log("CONFIRMED!");
        } catch (e3: any) {
          console.log(`Sign/submit error: ${e3.message?.substring(0, 300)}`);
        }
      }
    } catch (e2: any) {
      console.log(`Exception: ${e2.message?.substring(0, 500)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
