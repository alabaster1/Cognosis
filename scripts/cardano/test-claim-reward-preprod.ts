#!/usr/bin/env node
/**
 * Test PSY reward claim on Preprod
 * Simulates a participant claiming reward based on accuracy score
 */

import { Lucid, Blockfrost, Data } from "@lucid-evolution/lucid";
import PSY_REWARD_CONFIG, { calculateReward } from "./psy-reward-config.js";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const WALLET_SEED = process.env.WALLET_SEED_PHRASE || "";

const VAULT_HASH = PSY_REWARD_CONFIG.validators.rewardVaultV2;
const LOTTERY_HASH = PSY_REWARD_CONFIG.validators.psyLottery;

// Get accuracy from command line
const accuracy = parseInt(process.argv[2] || "75");

if (accuracy < 0 || accuracy > 100) {
  console.error("❌ Accuracy must be 0-100");
  process.exit(1);
}

async function testClaimReward() {
  console.log(`🧪 Testing reward claim (${accuracy}% accuracy) on Preprod...\n`);

  if (!PREPROD_BLOCKFROST_KEY) {
    throw new Error("BLOCKFROST_API_KEY not set");
  }

  if (!WALLET_SEED) {
    throw new Error("WALLET_SEED_PHRASE not set");
  }

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

  console.log("👛 Participant address:", address);

  // Calculate expected reward
  const expectedReward = calculateReward(accuracy);
  console.log(`\n💰 Expected reward for ${accuracy}% accuracy: ${expectedReward} PSY`);

  // Get vault UTxO
  const vaultAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: VAULT_HASH,
  });

  console.log("\n📍 Vault address:", vaultAddress);
  console.log("🔍 Looking for vault UTxO...");

  const vaultUtxos = await lucid.utxosAt(vaultAddress);

  if (vaultUtxos.length === 0) {
    throw new Error("No vault UTxO found. Initialize vault first!");
  }

  const vaultUtxo = vaultUtxos[0];
  console.log("✅ Found vault UTxO");

  // Get lottery UTxO
  const lotteryAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: LOTTERY_HASH,
  });

  const lotteryUtxos = await lucid.utxosAt(lotteryAddress);

  if (lotteryUtxos.length === 0) {
    throw new Error("No lottery UTxO found. Initialize lottery first!");
  }

  const lotteryUtxo = lotteryUtxos[0];
  console.log("✅ Found lottery UTxO");

  // TODO: Build claim transaction
  // This requires:
  // 1. Creating a mock experiment UTxO (or using real one)
  // 2. Building ClaimReward redeemer
  // 3. Spending vault UTxO
  // 4. Sending PSY to participant
  // 5. Sending 0.01 ADA to lottery
  // 6. Continuing vault with updated datum

  console.log("\n⚠️  Full claim transaction not implemented yet.");
  console.log("Next steps:");
  console.log("1. Deploy experiment validator");
  console.log("2. Create mock experiment submission");
  console.log("3. Build full claim transaction");
  console.log("\nFor now, vault and lottery are initialized and ready!");
}

testClaimReward().catch(console.error);
