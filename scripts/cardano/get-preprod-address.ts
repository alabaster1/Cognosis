#!/usr/bin/env node
/**
 * Get preprod address from Eternl seed phrase
 */

import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { readFileSync } from "fs";
import { homedir } from "os";

const seedPhrase = readFileSync(`${homedir()}/.eternl-wallet/seed.txt`, 'utf-8').trim();
const PREPROD_KEY = process.env.BLOCKFROST_API_KEY;

async function getPreprodAddress() {
  if (!PREPROD_KEY) {
    throw new Error("BLOCKFROST_API_KEY is required");
  }
  console.log("🔑 Deriving preprod address from seed phrase...\n");

  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_KEY
    ),
    "Preprod"
  );

  lucid.selectWallet.fromSeed(seedPhrase);

  const address = await lucid.wallet().address();

  console.log("✅ Preprod Wallet Address:");
  console.log(address);
  
  console.log("\n📋 Get Test ADA:");
  console.log("1. Go to: https://docs.cardano.org/cardano-testnets/tools/faucet/");
  console.log("2. Select 'Preprod Testnet'");
  console.log("3. Paste the address above");
  console.log("4. Request 10,000 tADA");
  
  console.log("\n⏳ After funding, check balance:");
  console.log(`   npx tsx check-balance-preprod.ts\n`);
}

getPreprodAddress().catch(console.error);
