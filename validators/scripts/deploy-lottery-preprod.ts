#!/usr/bin/env node
/**
 * Deploy On-Chain Lottery to Preprod Testnet
 * 
 * Initializes lottery contract with:
 * - 1 hour drawing frequency (for testing)
 * - Admin key from wallet
 * - Empty participant list
 * - Zero accumulated ADA
 */

import { Lucid, Blockfrost, Data, Constr, fromText } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const WALLET_SEED = process.env.WALLET_SEED_PHRASE || "";

// Load compiled contract
const PLUTUS_JSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../on-chain-lottery/plutus.json"), "utf-8")
);

const LOTTERY_VALIDATOR = PLUTUS_JSON.validators[0];
const LOTTERY_SCRIPT = LOTTERY_VALIDATOR.compiledCode;
const LOTTERY_HASH = LOTTERY_VALIDATOR.hash;

// Lottery datum type
interface LotteryDatum {
  drawing_frequency_ms: bigint;
  last_drawing_time: bigint;
  accumulated_ada: bigint;
  participants: any[];
  alpha_weight: bigint;
  admin_pkh: string;
}

async function deployLottery() {
  console.log("🎰 Deploying On-Chain Lottery to Preprod\n");

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
  const addressDetails = lucid.utils.getAddressDetails(address);
  const adminPkh = addressDetails.paymentCredential?.hash;

  if (!adminPkh) {
    throw new Error("Could not extract admin PKH");
  }

  console.log("👛 Admin wallet:", address);
  console.log("🔑 Admin PKH:", adminPkh);
  console.log("");

  // Build lottery script address
  const lotteryAddress = lucid.utils.validatorToAddress({
    type: "PlutusV3",
    script: LOTTERY_SCRIPT,
  });

  console.log("📍 Lottery contract address:", lotteryAddress);
  console.log("📜 Script hash:", LOTTERY_HASH);
  console.log("");

  // Build initial datum
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  const datum = new Constr(0, [
    BigInt(hourMs),           // drawing_frequency_ms (1 hour)
    BigInt(now),              // last_drawing_time
    0n,                       // accumulated_ada
    [],                       // participants (empty)
    50n,                      // alpha_weight (0.5 scaled by 100)
    adminPkh,                 // admin_pkh
  ]);

  const datumCbor = Data.to(datum);

  console.log("📝 Initial lottery state:");
  console.log("  - Drawing frequency: 1 hour");
  console.log("  - Last drawing:", new Date(now).toISOString());
  console.log("  - Prize pool: 0 ADA");
  console.log("  - Participants: 0");
  console.log("  - Alpha weight: 0.5");
  console.log("");

  // Build transaction - initialize lottery with 5 ADA
  const tx = await lucid
    .newTx()
    .payToContract(
      lotteryAddress,
      { inline: datumCbor },
      { lovelace: 5_000_000n } // 5 ADA for initial UTxO
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("✅ Lottery deployed!");
  console.log("📋 TX Hash:", txHash);
  console.log("");
  console.log("⏳ Waiting for confirmation...");

  await lucid.awaitTx(txHash);

  console.log("✅ Confirmed!\n");

  // Save deployment info
  const deploymentInfo = {
    network: "preprod",
    deployedAt: new Date().toISOString(),
    lotteryAddress,
    scriptHash: LOTTERY_HASH,
    txHash,
    adminAddress: address,
    adminPkh,
    drawingFrequency: "1 hour",
    initialAda: 5,
  };

  const infoPath = path.join(__dirname, "../on-chain-lottery/deployment-preprod.json");
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:", infoPath);
  console.log("");
  console.log("🎉 Lottery is live on preprod!");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Test permissionless draw trigger");
  console.log("  2. Add test participants");
  console.log("  3. Trigger first drawing");
  console.log("");
}

deployLottery().catch(err => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
