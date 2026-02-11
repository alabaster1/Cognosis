#!/usr/bin/env node
/**
 * Generate a preprod wallet for testing
 */

import { generateMnemonic } from "bip39";
import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import * as fs from "fs";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";

async function generateWallet() {
  console.log("🔐 Generating new preprod wallet...\n");

  if (!PREPROD_BLOCKFROST_KEY) {
    throw new Error("BLOCKFROST_API_KEY not set");
  }

  // Generate 24-word seed phrase
  const seedPhrase = generateMnemonic(256);

  // Initialize Lucid
  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_BLOCKFROST_KEY
    ),
    "Preprod"
  );

  // Select wallet from seed
  lucid.selectWallet.fromSeed(seedPhrase);

  // Get address
  const address = await lucid.wallet().address();

  // Save to .env
  const envPath = "./backend/.env";
  let envContent = "";
  try {
    envContent = fs.readFileSync(envPath, "utf-8");
  } catch (e) {
    // File doesn't exist, will create
  }

  // Update or add WALLET_SEED_PHRASE
  if (envContent.includes("WALLET_SEED_PHRASE")) {
    envContent = envContent.replace(
      /WALLET_SEED_PHRASE=.*/,
      `WALLET_SEED_PHRASE="${seedPhrase}"`
    );
  } else {
    envContent += `\nWALLET_SEED_PHRASE="${seedPhrase}"\n`;
  }

  fs.writeFileSync(envPath, envContent);
  fs.chmodSync(envPath, 0o600);

  console.log("✅ Wallet generated and saved!\n");
  console.log("📍 Address:", address);
  console.log("\n🔑 Seed phrase saved to backend/.env");
  console.log("\n💰 Fund this wallet with test ADA:");
  console.log("   1. Go to: https://docs.cardano.org/cardano-testnets/tools/faucet/");
  console.log("   2. Select 'Preprod Testnet'");
  console.log(`   3. Paste address: ${address}`);
  console.log("   4. Request 10,000 tADA");
  console.log("\n⏳ After funding, run:");
  console.log("   npx tsx scripts/cardano/mint-preprod-psy.ts 1000000\n");
}

generateWallet().catch(console.error);
