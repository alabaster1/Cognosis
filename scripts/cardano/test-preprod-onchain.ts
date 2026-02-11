#!/usr/bin/env node
/**
 * Standalone On-Chain Integration Test for Cardano Preprod
 *
 * Tests the smart contract lifecycle WITHOUT the backend API:
 *   1. Commit target to psi_experiment (lock 2 ADA with datum)
 *   2. Reclaim via ClaimParticipantTimeout (after short deadline)
 *   3. Verify vault PSY balance on-chain
 *   4. Verify all deployed contract UTxOs
 *
 * Usage:
 *   set -a && source backend/.env && set +a && npx tsx scripts/cardano/test-preprod-onchain.ts
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
import { slotToUnixTime } from "@lucid-evolution/utils";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

interface TestResult {
  step: string;
  success: boolean;
  details: string;
  duration: number;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`[TEST] ${msg}`);
}

function logStep(step: number, name: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  STEP ${step}: ${name}`);
  console.log(`${"=".repeat(60)}\n`);
}

async function recordResult(step: string, fn: () => Promise<string>) {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({ step, success: true, details, duration: Date.now() - start });
    log(`PASS: ${step} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ step, success: false, details: err.message, duration: Date.now() - start });
    log(`FAIL: ${step} - ${err.message}`);
    throw err;
  }
}

async function main() {
  log("Starting standalone on-chain integration test\n");

  if (!BLOCKFROST_KEY || !SEED_PHRASE) {
    throw new Error("BLOCKFROST_API_KEY and WALLET_SEED_PHRASE must be set");
  }

  // Load deployment config
  const deploymentPath = path.resolve(__dirname, "PREPROD_DEPLOYMENT.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  // Load plutus.json for validators
  const plutusJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../cardano/plutus.json"), "utf-8")
  );

  // ================================================================
  // Step 0: Initialize Lucid + wallet
  // ================================================================
  logStep(0, "Initialize Lucid & wallet");

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", BLOCKFROST_KEY),
    "Preprod"
  );
  lucid.selectWallet.fromSeed(SEED_PHRASE);

  const walletAddress = await lucid.wallet().address();
  const { paymentCredential } = getAddressDetails(walletAddress);
  const walletPkh = paymentCredential!.hash;

  log(`Wallet: ${walletAddress}`);
  log(`PKH: ${walletPkh}`);

  // Check balances
  const utxos = await lucid.wallet().getUtxos();
  let walletAda = 0n;
  let walletPsy = 0n;
  const psyUnit = deployment.rewardVault.psyUnit;

  for (const utxo of utxos) {
    walletAda += utxo.assets.lovelace ?? 0n;
    walletPsy += utxo.assets[psyUnit] ?? 0n;
  }
  log(`Wallet ADA: ${Number(walletAda) / 1_000_000}`);
  log(`Wallet PSY: ${walletPsy}`);

  // Reconstruct the psi_experiment validator (parameterized)
  const psiValidatorData = plutusJson.validators.find(
    (v: any) => v.title === "psi_experiment.psi_experiment.spend"
  );
  const researchPoolScriptHash = deployment.researchPool.scriptHash;

  const researchPoolAddressParam = new Constr(0, [
    new Constr(1, [researchPoolScriptHash]), // Script credential
    new Constr(1, []),                       // No stake credential
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

  log(`PSI Experiment address: ${psiAddress}`);
  log(`PSI Experiment hash: ${psiScriptHash}`);

  // Reward vault validator (unparameterized)
  const vaultValidatorData = plutusJson.validators.find(
    (v: any) => v.title === "reward_vault.reward_vault.spend"
  );
  const vaultValidator: Script = {
    type: "PlutusV3",
    script: applyDoubleCborEncoding(vaultValidatorData.compiledCode),
  };
  const vaultAddress = validatorToAddress("Preprod", vaultValidator);
  const vaultScriptHash = validatorToScriptHash(vaultValidator);

  log(`Reward Vault address: ${vaultAddress}`);

  // Research pool validator
  const poolValidatorData = plutusJson.validators.find(
    (v: any) => v.title === "research_pool.research_pool.spend"
  );
  const poolValidator: Script = {
    type: "PlutusV3",
    script: applyDoubleCborEncoding(poolValidatorData.compiledCode),
  };
  const poolAddress = validatorToAddress("Preprod", poolValidator);

  log(`Research Pool address: ${poolAddress}`);

  // ================================================================
  // Step 1: Verify deployed contracts have UTxOs
  // ================================================================
  logStep(1, "Verify deployed contract UTxOs");

  await recordResult("Verify Research Pool UTxO", async () => {
    const poolUtxos = await lucid.utxosAt(poolAddress);
    log(`Research Pool UTxOs: ${poolUtxos.length}`);
    if (poolUtxos.length === 0) throw new Error("No UTxOs at research pool address");
    const poolAda = poolUtxos[0].assets.lovelace;
    log(`Research Pool ADA: ${Number(poolAda) / 1_000_000}`);
    return `${poolUtxos.length} UTxOs, ${Number(poolAda) / 1_000_000} ADA`;
  });

  await recordResult("Verify Reward Vault UTxO", async () => {
    const vaultUtxos = await lucid.utxosAt(vaultAddress);
    log(`Reward Vault UTxOs: ${vaultUtxos.length}`);
    if (vaultUtxos.length === 0) throw new Error("No UTxOs at reward vault address");
    const vaultPsy = vaultUtxos[0].assets[psyUnit] ?? 0n;
    const vaultAda = vaultUtxos[0].assets.lovelace;
    log(`Vault PSY: ${vaultPsy}`);
    log(`Vault ADA: ${Number(vaultAda) / 1_000_000}`);
    return `${vaultPsy} PSY locked, ${Number(vaultAda) / 1_000_000} ADA`;
  });

  // ================================================================
  // Step 2: Commit target to psi_experiment (lock 2 ADA)
  // ================================================================
  logStep(2, "Commit target to psi_experiment");

  // Generate a random target + nonce for testing
  const targetValue = `test_rv_target_${Date.now()}`;
  const nonce = crypto.randomBytes(32);
  // Blake2b-256(target || nonce) - using the same method as the Aiken contract
  const { blake2b } = await import("blakejs");
  const targetBytes = Buffer.from(targetValue, "utf8");
  const combined = Buffer.concat([targetBytes, nonce]);
  const targetHash = Buffer.from(blake2b(combined, undefined, 32)).toString("hex");

  log(`Target: ${targetValue}`);
  log(`Nonce: ${nonce.toString("hex")}`);
  log(`Target hash: ${targetHash}`);

  // Get current slot for deadline calculation
  const tip = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`, {
    headers: { project_id: BLOCKFROST_KEY },
  }).then(r => r.json());
  const currentSlot = tip.slot;
  log(`Current slot: ${currentSlot}`);

  // Set a SHORT join deadline (5 minutes) for testing timeout reclaim
  const joinDeadlineSlot = currentSlot + 300;  // 5 minutes
  const revealDeadlineSlot = currentSlot + 600; // 10 minutes

  const stakeLovelace = 2_000_000n;

  let commitTxHash: string;
  await recordResult("Build & submit commit tx", async () => {
    // Build PsiDatum (Constr 0)
    // Fields: target_hash, host_pkh, participant_pkh, game_type, session_state,
    //         commit_slot, join_deadline_slot, reveal_deadline_slot, stake_lovelace,
    //         research_pool_pct, max_participants, current_participants,
    //         participant_guesses, ipfs_cid, ai_score
    const datum = new Constr(0, [
      targetHash,                        // target_hash: ByteArray
      walletPkh,                         // host_pkh: ByteArray
      new Constr(1, []),                 // participant_pkh: None
      new Constr(6, []),                 // game_type: RemoteViewing = Constr 6
      new Constr(0, []),                 // session_state: AwaitingParticipant = Constr 0
      BigInt(currentSlot),               // commit_slot
      BigInt(joinDeadlineSlot),          // join_deadline_slot
      BigInt(revealDeadlineSlot),        // reveal_deadline_slot
      stakeLovelace,                     // stake_lovelace
      5n,                                // research_pool_pct: 5%
      1n,                                // max_participants
      0n,                                // current_participants
      [],                                // participant_guesses: empty list
      new Constr(1, []),                 // ipfs_cid: None
      new Constr(1, []),                 // ai_score: None
    ]);

    const tx = await lucid
      .newTx()
      .pay.ToContract(
        psiAddress,
        { kind: "inline", value: Data.to(datum) },
        { lovelace: stakeLovelace }
      )
      .complete();

    const signed = await tx.sign.withWallet().complete();
    commitTxHash = await signed.submit();

    log(`Commit tx hash: ${commitTxHash}`);
    log(`Explorer: https://preprod.cardanoscan.io/transaction/${commitTxHash}`);

    log("Waiting for on-chain confirmation...");
    await lucid.awaitTx(commitTxHash);
    log("Confirmed!");

    return `Tx: ${commitTxHash}`;
  });

  // ================================================================
  // Step 3: Verify UTxO exists at psi_experiment
  // ================================================================
  logStep(3, "Verify session UTxO at psi_experiment");

  let sessionUtxo: UTxO;
  await recordResult("Verify session UTxO", async () => {
    const scriptUtxos = await lucid.utxosAt(psiAddress);
    log(`Found ${scriptUtxos.length} UTxOs at psi_experiment`);

    // Find our UTxO (from our commit tx)
    const found = scriptUtxos.find(u => u.txHash === commitTxHash);
    if (!found) throw new Error("Session UTxO not found at script address");

    sessionUtxo = found;
    log(`Session UTxO: ${found.txHash}#${found.outputIndex}`);
    log(`ADA locked: ${Number(found.assets.lovelace) / 1_000_000}`);
    return `UTxO ${found.txHash}#${found.outputIndex} with ${Number(found.assets.lovelace) / 1_000_000} ADA`;
  });

  // ================================================================
  // Step 4: Wait for join deadline to pass, then reclaim via timeout
  // ================================================================
  logStep(4, "Reclaim stake via ClaimParticipantTimeout");

  await recordResult("Wait for join deadline", async () => {
    // Wait for join deadline to pass (5 minutes)
    log(`Join deadline slot: ${joinDeadlineSlot}`);
    log("Waiting for join deadline to pass...");

    let latestSlot = currentSlot;
    // Wait until slot is > deadline + 10 (extra buffer for safety)
    const targetSlot = joinDeadlineSlot + 10;
    while (latestSlot <= targetSlot) {
      await new Promise(r => setTimeout(r, 15000)); // Wait 15 seconds
      const latestTip = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`,
        { headers: { project_id: BLOCKFROST_KEY } }
      ).then(r => r.json());
      latestSlot = latestTip.slot;
      log(`  Current slot: ${latestSlot} (need > ${targetSlot})`);
    }

    log("Join deadline passed (with buffer)!");
    return `Slot ${latestSlot} > deadline ${joinDeadlineSlot}`;
  });

  let reclaimTxHash: string;
  await recordResult("Build & submit reclaim tx", async () => {
    // Refresh UTxOs - the session UTxO might have shifted
    const scriptUtxos = await lucid.utxosAt(psiAddress);
    const ourUtxo = scriptUtxos.find(u => u.txHash === commitTxHash);
    if (!ourUtxo) throw new Error("Session UTxO not found");

    log(`Session UTxO datum hash: ${ourUtxo.datumHash || "inline"}`);
    log(`Session UTxO has inline datum: ${!!ourUtxo.datum}`);

    // ClaimParticipantTimeout = PsiRedeemer Constr 6
    const reclaimRedeemer = Data.to(new Constr(6, []));

    // CRITICAL FIX: The validator's is_after_deadline checks that the tx's
    // lower_bound_slot > deadline_slot. So validFrom must correspond to a
    // slot AFTER the join deadline, not before it.
    // Convert deadline slot to POSIX time and add 2-slot buffer
    const deadlinePosix = slotToUnixTime("Preprod", joinDeadlineSlot + 2);
    log(`Using validFrom: slot ${joinDeadlineSlot + 2} (deadline+2) = posix ${deadlinePosix}`);

    log("Building reclaim transaction...");

    // CRITICAL FIX #2: Lucid-Evolution's complete() sends change to an HD wallet
    // change address (different PKH). The validator's verify_full_refund checks
    // for an output to the host's PKH. We must add an explicit output to the
    // wallet address so the validator can find it.
    const tx = await lucid
      .newTx()
      .collectFrom([ourUtxo], reclaimRedeemer)
      .attach.SpendingValidator(psiValidator)
      .addSigner(walletAddress)
      .pay.ToAddress(walletAddress, { lovelace: stakeLovelace })
      .validFrom(deadlinePosix)
      .validTo(Date.now() + 600_000)
      .complete();

    const signed = await tx.sign.withWallet().complete();
    reclaimTxHash = await signed.submit();

    log(`Reclaim tx hash: ${reclaimTxHash}`);
    log(`Explorer: https://preprod.cardanoscan.io/transaction/${reclaimTxHash}`);

    log("Waiting for on-chain confirmation...");
    await lucid.awaitTx(reclaimTxHash);
    log("Confirmed! Stake reclaimed.");

    return `Tx: ${reclaimTxHash}`;
  });

  // ================================================================
  // Step 5: Verify final balances
  // ================================================================
  logStep(5, "Verify final balances");

  await recordResult("Verify wallet balance restored", async () => {
    const finalUtxos = await lucid.wallet().getUtxos();
    let finalAda = 0n;
    let finalPsy = 0n;
    for (const utxo of finalUtxos) {
      finalAda += utxo.assets.lovelace ?? 0n;
      finalPsy += utxo.assets[psyUnit] ?? 0n;
    }
    log(`Final ADA: ${Number(finalAda) / 1_000_000} (was ${Number(walletAda) / 1_000_000})`);
    log(`Final PSY: ${finalPsy} (was ${walletPsy})`);

    // ADA should be approximately the same (minus tx fees)
    const adaDiff = Number(walletAda - finalAda) / 1_000_000;
    log(`ADA difference (fees): ~${adaDiff.toFixed(2)} ADA`);

    if (adaDiff > 5) throw new Error("Too much ADA lost - expected only tx fees");

    return `ADA diff: ${adaDiff.toFixed(2)} ADA (tx fees), PSY: ${finalPsy}`;
  });

  await recordResult("Verify vault still intact", async () => {
    const vaultUtxos = await lucid.utxosAt(vaultAddress);
    if (vaultUtxos.length === 0) throw new Error("Vault UTxO missing!");
    const vaultPsy = vaultUtxos[0].assets[psyUnit] ?? 0n;
    log(`Vault PSY balance: ${vaultPsy} (should be 800000)`);
    return `Vault: ${vaultPsy} PSY`;
  });

  await recordResult("Verify psi_experiment is clean", async () => {
    const scriptUtxos = await lucid.utxosAt(psiAddress);
    // Our UTxO should be consumed
    const ourUtxo = scriptUtxos.find(u => u.txHash === commitTxHash);
    if (ourUtxo) throw new Error("Session UTxO still present - reclaim failed!");
    log(`psi_experiment UTxOs: ${scriptUtxos.length} (our session consumed)`);
    return `Clean - ${scriptUtxos.length} UTxOs remaining`;
  });

  // ================================================================
  // Summary
  // ================================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log("  TEST SUMMARY");
  console.log(`${"=".repeat(60)}\n`);

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.success ? "PASS" : "FAIL";
    console.log(`  ${icon}  ${r.step} (${r.duration}ms)`);
    if (r.success) passed++;
    else failed++;
  }

  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  // Transaction links
  console.log(`\n  Transactions:`);
  console.log(`    Commit:  https://preprod.cardanoscan.io/transaction/${commitTxHash!}`);
  console.log(`    Reclaim: https://preprod.cardanoscan.io/transaction/${reclaimTxHash!}`);

  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

main()
  .then(() => {
    log("All tests passed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[TEST] Fatal error:", error.message);
    process.exit(1);
  });
