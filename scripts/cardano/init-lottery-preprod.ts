#!/usr/bin/env node
/**
 * Initialize PSY Lottery Pool on Preprod
 */

import { Lucid, Blockfrost, Data } from "@lucid-evolution/lucid";
import PSY_REWARD_CONFIG from "./psy-reward-config.js";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const WALLET_SEED = process.env.WALLET_SEED_PHRASE || "";

const LOTTERY_HASH = PSY_REWARD_CONFIG.validators.psyLottery;
const VAULT_HASH = PSY_REWARD_CONFIG.validators.rewardVaultV2;

// Datum schema for lottery pool
const LotteryDatum = Data.Object({
  drawing_frequency_ms: Data.Integer(),
  last_drawing_time: Data.Integer(),
  accumulated_ada: Data.Integer(),
  alpha_weight: Data.Integer(),
  admin_pkh: Data.Bytes(),
  vault_script_hash: Data.Bytes(),
});

type LotteryDatum = Data.Static<typeof LotteryDatum>;

async function initializeLottery() {
  console.log("🎰 Initializing PSY Lottery Pool on Preprod...\n");

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

  console.log("👛 Wallet address:", address);
  console.log("🔑 Admin key hash:", pkh);

  console.log("\n📝 Lottery Parameters:");
  console.log("- Drawing frequency:", PSY_REWARD_CONFIG.lottery.drawingFrequency);
  console.log("- Alpha weight:", PSY_REWARD_CONFIG.lottery.alphaWeight);
  console.log("- Fee per submission:", PSY_REWARD_CONFIG.lottery.feePerSubmission, "ADA");

  // Build datum
  const now = Date.now();
  const datum: LotteryDatum = {
    drawing_frequency_ms: BigInt(PSY_REWARD_CONFIG.lottery.drawingFrequencyMs),
    last_drawing_time: BigInt(now),
    accumulated_ada: 0n,
    alpha_weight: BigInt(PSY_REWARD_CONFIG.aikenParams.alphaWeightScaled),
    admin_pkh: pkh,
    vault_script_hash: VAULT_HASH,
  };

  const datumCbor = Data.to(datum, LotteryDatum);

  // Build lottery script address
  const lotteryAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: LOTTERY_HASH,
  });

  console.log("\n📍 Lottery address:", lotteryAddress);

  // Build transaction - initialize lottery with minimal ADA
  const tx = await lucid
    .newTx()
    .payToContract(
      lotteryAddress,
      { inline: datumCbor },
      { lovelace: 2_000_000n } // 2 ADA for min UTxO
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("\n✅ Lottery pool initialized!");
  console.log("📋 Transaction hash:", txHash);
  console.log("\n⏳ Waiting for confirmation...");

  await lucid.awaitTx(txHash);

  console.log("✅ Confirmed! Lottery is ready.\n");

  // Save lottery info
  const lotteryInfo = {
    network: "preprod",
    lotteryHash: LOTTERY_HASH,
    lotteryAddress,
    txHash,
    drawingFrequency: PSY_REWARD_CONFIG.lottery.drawingFrequency,
    alphaWeight: PSY_REWARD_CONFIG.lottery.alphaWeight,
    initializedAt: new Date().toISOString(),
  };

  console.log("💾 Lottery info:");
  console.log(JSON.stringify(lotteryInfo, null, 2));
}

initializeLottery().catch(console.error);
