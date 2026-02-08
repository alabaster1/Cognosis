#!/usr/bin/env node
/**
 * Initialize PSY Reward Vault on Preprod
 * Locks 5B PSY tokens in the vault contract
 */

import { Lucid, Blockfrost, Data } from "@lucid-evolution/lucid";
import PSY_REWARD_CONFIG from "./psy-reward-config.js";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const WALLET_SEED = process.env.WALLET_SEED_PHRASE || "";

// Vault parameters
const VAULT_HASH = PSY_REWARD_CONFIG.validators.rewardVaultV2;
const LOTTERY_HASH = PSY_REWARD_CONFIG.validators.psyLottery;

const PSY_AMOUNT = 5_000_000_000; // 5 billion PSY for rewards

// Datum schema for reward vault
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

  if (!PREPROD_BLOCKFROST_KEY) {
    throw new Error("BLOCKFROST_API_KEY not set");
  }

  if (!WALLET_SEED) {
    throw new Error("WALLET_SEED_PHRASE not set");
  }

  // Initialize Lucid
  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_BLOCKFROST_KEY
    ),
    "Preprod"
  );

  lucid.selectWallet.fromSeed(WALLET_SEED);

  const address = await lucid.wallet.address();
  const pkh = lucid.utils.getAddressDetails(address).paymentCredential?.hash;

  if (!pkh) {
    throw new Error("Could not extract payment key hash");
  }

  console.log("👛 Wallet address:", address);
  console.log("🔑 Payment key hash:", pkh);

  // TODO: Get PSY policy ID from minting transaction
  const PSY_POLICY_ID = process.env.PSY_POLICY_ID || "";
  
  if (!PSY_POLICY_ID) {
    console.log("\n⚠️  PSY_POLICY_ID not set. You need to:");
    console.log("1. Mint PSY tokens first: npx tsx mint-preprod-psy.ts 10000000000");
    console.log("2. Set PSY_POLICY_ID environment variable");
    console.log("3. Run this script again\n");
    throw new Error("PSY_POLICY_ID required");
  }

  console.log("\n📝 Vault Parameters:");
  console.log("- Base reward:", PSY_REWARD_CONFIG.rewards.baseReward, "PSY");
  console.log("- Max reward:", PSY_REWARD_CONFIG.rewards.maxReward, "PSY");
  console.log("- Steepness:", PSY_REWARD_CONFIG.rewards.steepness);
  console.log("- Lottery fee:", PSY_REWARD_CONFIG.lottery.feePerSubmission, "ADA");
  console.log("- PSY amount:", PSY_AMOUNT.toLocaleString(), "PSY");

  // Build datum
  const datum: RewardVaultDatum = {
    psy_policy_id: PSY_POLICY_ID,
    psy_asset_name: Buffer.from("PSY").toString("hex"), // "PSY" in hex
    base_reward: BigInt(PSY_REWARD_CONFIG.aikenParams.baseReward),
    max_reward: BigInt(PSY_REWARD_CONFIG.aikenParams.maxReward),
    reward_steepness: BigInt(PSY_REWARD_CONFIG.aikenParams.rewardSteepness),
    lottery_fee_lovelace: BigInt(PSY_REWARD_CONFIG.aikenParams.lotteryFeeLovelace),
    lottery_script_hash: LOTTERY_HASH,
    experiment_script_hash: "", // TODO: Set after experiment validator deployed
    admin_pkh: pkh,
    total_claims: 0n,
  };

  const datumCbor = Data.to(datum, RewardVaultDatum);

  // Build vault script address
  const vaultAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: VAULT_HASH,
  });

  console.log("\n📍 Vault address:", vaultAddress);

  // Build transaction - lock PSY in vault
  const psyUnit = PSY_POLICY_ID + Buffer.from("PSY").toString("hex");

  const tx = await lucid
    .newTx()
    .payToContract(
      vaultAddress,
      { inline: datumCbor },
      {
        lovelace: 2_000_000n, // 2 ADA for min UTxO
        [psyUnit]: BigInt(PSY_AMOUNT),
      }
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("\n✅ Vault initialized!");
  console.log("📋 Transaction hash:", txHash);
  console.log("\n⏳ Waiting for confirmation...");

  await lucid.awaitTx(txHash);

  console.log("✅ Confirmed! Vault is ready.\n");

  // Save vault info
  const vaultInfo = {
    network: "preprod",
    vaultHash: VAULT_HASH,
    vaultAddress,
    txHash,
    psyPolicyId: PSY_POLICY_ID,
    psyAmount: PSY_AMOUNT,
    baseReward: PSY_REWARD_CONFIG.rewards.baseReward,
    maxReward: PSY_REWARD_CONFIG.rewards.maxReward,
    initializedAt: new Date().toISOString(),
  };

  console.log("💾 Vault info:");
  console.log(JSON.stringify(vaultInfo, null, 2));
}

initializeVault().catch(console.error);
