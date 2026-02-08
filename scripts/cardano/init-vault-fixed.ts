#!/usr/bin/env node
/**
 * Initialize PSY Reward Vault on Preprod (fixed for Lucid 0.4.29)
 */

import { Lucid, Blockfrost, Data } from "@lucid-evolution/lucid";
import { getAddressDetails, validatorToAddress } from "@lucid-evolution/utils";
import { readFileSync } from "fs";
import { homedir } from "os";
import PSY_REWARD_CONFIG from "./psy-reward-config.js";

const seedPhrase = readFileSync(`${homedir()}/.eternl-wallet/seed.txt`, 'utf-8').trim();
const PREPROD_KEY = "preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL";
const PSY_POLICY_ID = process.env.PSY_POLICY_ID || "bfbc85f5efcac03780fa4b32ee03522a410d525a5bb5cbb5938bca25";

// Vault parameters
const VAULT_HASH = PSY_REWARD_CONFIG.validators.rewardVaultV2;
const LOTTERY_HASH = PSY_REWARD_CONFIG.validators.psyLottery;
const PSY_AMOUNT = 5_000_000_000n; // 5 billion PSY

// Datum schema
const RewardVaultDatum = Data.Object({
  psy_policy_id: Data.Bytes(),
  psy_asset_name: Data.Bytes(),
  base_reward: Data.Integer(),
  max_reward: Data.Integer(),
  reward_steepness: Data.Integer(),
  lottery_fee_lovelace: Data.Integer(),
  lottery_script_hash: Data.Bytes(),
  experiment_script_hash: Data.Bytes(),
  admin_pkh: Data.Bytes(),
  total_claims: Data.Integer(),
});

type RewardVaultDatum = Data.Static<typeof RewardVaultDatum>;

async function initializeVault() {
  console.log("🔧 Initializing PSY Reward Vault on Preprod...\n");

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", PREPROD_KEY),
    "Preprod"
  );

  lucid.selectWallet.fromSeed(seedPhrase);

  const address = await lucid.wallet().address();
  const { paymentCredential } = getAddressDetails(address);

  if (!paymentCredential || paymentCredential.type !== "Key") {
    throw new Error("Could not extract payment key hash");
  }

  const pkh = paymentCredential.hash;

  console.log("👛 Wallet address:", address);
  console.log("🔑 Payment key hash:", pkh);
  console.log("💰 PSY Policy ID:", PSY_POLICY_ID);

  // Create datum
  const datum: RewardVaultDatum = {
    psy_policy_id: PSY_POLICY_ID,
    psy_asset_name: Buffer.from("PSY").toString("hex"),
    base_reward: 100n,
    max_reward: 400n,
    reward_steepness: 250n, // 2.5 (stored as 250/100)
    lottery_fee_lovelace: 10_000n, // 0.01 ADA
    lottery_script_hash: LOTTERY_HASH,
    experiment_script_hash: "00", // Placeholder
    admin_pkh: pkh,
    total_claims: 0n,
  };

  const psyUnit = PSY_POLICY_ID + Buffer.from("PSY").toString("hex");

  console.log("\n📋 Vault Datum:");
  console.log(`- Base reward: ${datum.base_reward} PSY`);
  console.log(`- Max reward: ${datum.max_reward} PSY`);
  console.log(`- Steepness: ${Number(datum.reward_steepness) / 100}`);
  console.log(`- Lottery fee: ${Number(datum.lottery_fee_lovelace) / 1_000_000} ADA`);

  // Build transaction
  console.log("\n🔨 Building vault initialization transaction...");

  const vaultAddress = validatorToAddress("Preprod", {
    type: "PlutusV2",
    script: VAULT_HASH,
  });

  console.log("📍 Vault address:", vaultAddress);

  const tx = await lucid
    .newTx()
    .pay.ToAddressWithData(
      vaultAddress,
      { kind: "inline", value: Data.to(datum, RewardVaultDatum) },
      { [psyUnit]: PSY_AMOUNT }
    )
    .complete();

  console.log("✍️  Signing transaction...");
  const signed = await tx.sign.withWallet().complete();

  console.log("📤 Submitting to blockchain...");
  const txHash = await signed.submit();

  console.log("\n✅ Reward vault initialized!");
  console.log(`📋 Transaction: ${txHash}`);
  console.log(`🔍 View: https://preprod.cardanoscan.io/transaction/${txHash}`);

  console.log("\n⏳ Waiting for confirmation...");
  await lucid.awaitTx(txHash);

  console.log("✅ Transaction confirmed!");
  console.log(`\n🎉 Vault is live with ${PSY_AMOUNT.toLocaleString()} PSY tokens!`);
}

initializeVault().catch(console.error);
