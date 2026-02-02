#!/usr/bin/env node
/**
 * Check preprod wallet balance
 */

import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { readFileSync } from "fs";
import { homedir } from "os";

const seedPhrase = readFileSync(`${homedir()}/.eternl-wallet/seed.txt`, 'utf-8').trim();
const PREPROD_KEY = process.env.BLOCKFROST_API_KEY || "preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL";

async function checkBalance() {
  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_KEY
    ),
    "Preprod"
  );

  lucid.selectWallet.fromSeed(seedPhrase);
  const address = await lucid.wallet().address();
  
  console.log("📍 Address:", address);
  console.log("\n💰 Checking balance...");
  
  const utxos = await lucid.wallet().getUtxos();
  
  if (utxos.length === 0) {
    console.log("\n❌ No funds yet!");
    console.log("\n📋 Get tADA from faucet:");
    console.log(`   Address: ${address}`);
    console.log("   Faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/");
    return;
  }
  
  let totalLovelace = 0n;
  for (const utxo of utxos) {
    totalLovelace += utxo.assets.lovelace;
  }
  
  const ada = Number(totalLovelace) / 1_000_000;
  
  console.log("\n✅ Balance:");
  console.log(`   ${ada.toLocaleString()} tADA`);
  console.log(`   ${utxos.length} UTxO(s)`);
  
  if (ada >= 100) {
    console.log("\n🚀 Ready to deploy!");
  } else if (ada > 0) {
    console.log("\n⚠️  You have some funds, but may need more for deployment");
  }
}

checkBalance().catch(console.error);
