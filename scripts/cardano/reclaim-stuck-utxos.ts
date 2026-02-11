#!/usr/bin/env node
/**
 * Reclaim stuck UTxOs at psi_experiment address
 * These are from previous test attempts where the reclaim failed due to
 * incorrect validFrom (lower bound was before the join deadline).
 *
 * Fix: set validFrom to a slot AFTER the join deadline.
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

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function main() {
  console.log("Reclaiming stuck UTxOs from psi_experiment\n");

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

  // Get all UTxOs at script
  const scriptUtxos = await lucid.utxosAt(psiAddress);
  console.log(`Found ${scriptUtxos.length} UTxOs at psi_experiment\n`);

  if (scriptUtxos.length === 0) {
    console.log("Nothing to reclaim!");
    return;
  }

  // Get current slot
  const tip = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/blocks/latest`, {
    headers: { project_id: BLOCKFROST_KEY },
  }).then(r => r.json());
  console.log(`Current slot: ${tip.slot}\n`);

  // Process each UTxO
  for (let i = 0; i < scriptUtxos.length; i++) {
    const utxo = scriptUtxos[i];
    console.log(`--- UTxO ${i + 1}/${scriptUtxos.length}: ${utxo.txHash}#${utxo.outputIndex} ---`);
    console.log(`  Lovelace: ${utxo.assets.lovelace}`);

    if (!utxo.datum) {
      console.log("  No inline datum - skipping");
      continue;
    }

    // Decode datum to get join_deadline_slot
    const decoded = Data.from(utxo.datum);
    if (!(decoded instanceof Constr)) {
      console.log("  Datum is not a Constr - skipping");
      continue;
    }

    const sessionState = decoded.fields[4];
    const joinDeadlineSlot = Number(decoded.fields[6]);
    const hostPkh = decoded.fields[1] as string;

    console.log(`  Session state: Constr(${(sessionState as Constr<any>).index})`);
    console.log(`  Join deadline slot: ${joinDeadlineSlot}`);
    console.log(`  Host PKH: ${hostPkh}`);
    console.log(`  Deadline passed: ${tip.slot > joinDeadlineSlot}`);
    console.log(`  Is our UTxO: ${hostPkh === walletPkh}`);

    // Only reclaim if:
    // 1. Session state is AwaitingParticipant (Constr 0)
    // 2. Deadline has passed
    // 3. We are the host
    if ((sessionState as Constr<any>).index !== 0) {
      console.log("  Not in AwaitingParticipant state - skipping");
      continue;
    }
    if (tip.slot <= joinDeadlineSlot) {
      console.log("  Deadline not yet passed - skipping");
      continue;
    }
    if (hostPkh !== walletPkh) {
      console.log("  Not our UTxO - skipping");
      continue;
    }

    // Build reclaim tx with CORRECT validFrom
    // Key fix: lower bound must be > join_deadline_slot
    const validFromPosix = slotToUnixTime("Preprod", joinDeadlineSlot + 2);
    console.log(`  validFrom: slot ${joinDeadlineSlot + 2} = posix ${validFromPosix}`);

    const reclaimRedeemer = Data.to(new Constr(6, [])); // ClaimParticipantTimeout

    try {
      console.log("  Building tx...");
      // Must add explicit output to host PKH - Lucid change address differs from wallet PKH
      const tx = await lucid
        .newTx()
        .collectFrom([utxo], reclaimRedeemer)
        .attach.SpendingValidator(psiValidator)
        .addSigner(walletAddress)
        .pay.ToAddress(walletAddress, { lovelace: BigInt(Number(decoded.fields[8])) })
        .validFrom(validFromPosix)
        .validTo(Date.now() + 600_000)
        .complete();

      console.log("  TX built! Signing...");
      const signed = await tx.sign.withWallet().complete();
      const txHash = await signed.submit();
      console.log(`  Submitted: ${txHash}`);
      console.log(`  Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);

      console.log("  Waiting for confirmation...");
      await lucid.awaitTx(txHash);
      console.log("  Confirmed! UTxO reclaimed.\n");
    } catch (e: any) {
      console.log(`  FAILED: ${e.message}\n`);
    }
  }

  // Final check
  const remaining = await lucid.utxosAt(psiAddress);
  console.log(`\nRemaining UTxOs at psi_experiment: ${remaining.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
