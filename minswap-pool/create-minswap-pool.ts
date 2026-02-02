#!/usr/bin/env ts-node
/**
 * Aurumelius - Create Minswap Pool
 * Create PSY/ADA pool on preprod testnet
 */

import {
  ADA,
  Asset,
  BlockfrostAdapter,
  DexV2,
  getBackendBlockfrostLucidInstance,
  NetworkId,
} from "@minswap/sdk";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

// Configuration
const BLOCKFROST_PROJECT_ID = "preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL";
const BLOCKFROST_URL = "https://cardano-preprod.blockfrost.io/api/v0";
const WALLET_ADDRESS = "addr_test1qpq9s2sxfmqhfvg6acem0aaye4hdk7vrm6hf8hc4zrkxpx266lf3ugvulgzeyvhg6t9a4xdj009nea8pwfax2da46zasy2me46";
const WALLET_SKEY_PATH = "/home/albert/cardano-preprod/wallet/payment.skey";

// PSY token (already minted on preprod)
const PSY_ASSET: Asset = {
  policyId: "52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e",
  tokenName: "505359" // "PSY" in hex
};

// Pool parameters
const ADA_AMOUNT = 50_000_000n; // 50 ADA
const PSY_AMOUNT = 200_000_000n;  // 200 PSY (wallet has 245 PSY)
const TRADING_FEE_NUMERATOR = 30n; // 0.3% fee (Minswap default)

async function main() {
  console.log("🦞 AURUMELIUS - Create Minswap PSY/ADA Pool");
  console.log("=".repeat(70));
  console.log();

  // Load wallet signing key
  const fs = require("fs");
  let walletSkey: string;
  try {
    const skeyFile = fs.readFileSync(WALLET_SKEY_PATH, "utf-8");
    const skeyJson = JSON.parse(skeyFile);
    walletSkey = skeyJson.cborHex;
  } catch (err: any) {
    console.error("❌ Error: Could not load wallet signing key");
    console.error(`   Path: ${WALLET_SKEY_PATH}`);
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }

  try {
    console.log("🔧 Step 1: Initialize Lucid & Blockfrost adapter...");
    const lucid = await getBackendBlockfrostLucidInstance(
      NetworkId.TESTNET,
      BLOCKFROST_PROJECT_ID,
      BLOCKFROST_URL,
      WALLET_ADDRESS
    );

    const adapter = new BlockfrostAdapter(
      NetworkId.TESTNET,
      new BlockFrostAPI({
        projectId: BLOCKFROST_PROJECT_ID,
        network: "preprod",
      })
    );

    console.log(`✅ Connected to preprod`);
    console.log(`   Wallet: ${WALLET_ADDRESS}`);
    console.log();

    console.log("📊 Step 2: Check if pool already exists...");
    const existingPool = await adapter.getV2PoolByPair(ADA, PSY_ASSET);
    if (existingPool) {
      console.error("❌ Pool already exists!");
      console.error(`   LP Asset: ${existingPool.lpAsset.policyId}.${existingPool.lpAsset.tokenName}`);
      console.error("   Use deposit/swap instead of creating a new pool");
      process.exit(1);
    }
    console.log("✅ No existing pool found - proceeding with creation");
    console.log();

    console.log("💰 Step 3: Verify wallet has sufficient funds...");
    const utxos = await lucid.utxosAt(WALLET_ADDRESS);
    
    // Check ADA balance
    const adaBalance = utxos.reduce((sum, utxo) => {
      return sum + (utxo.assets["lovelace"] || 0n);
    }, 0n);
    
    // Check PSY balance
    const psyAssetId = `${PSY_ASSET.policyId}${PSY_ASSET.tokenName}`;
    const psyBalance = utxos.reduce((sum, utxo) => {
      return sum + (utxo.assets[psyAssetId] || 0n);
    }, 0n);

    console.log(`   ADA: ${Number(adaBalance) / 1_000_000} ADA`);
    console.log(`   PSY: ${Number(psyBalance) / 1_000_000} PSY`);

    if (adaBalance < ADA_AMOUNT + 5_000_000n) { // +5 ADA for fees
      console.error(`❌ Insufficient ADA: need ${Number(ADA_AMOUNT + 5_000_000n) / 1_000_000} ADA, have ${Number(adaBalance) / 1_000_000}`);
      process.exit(1);
    }

    if (psyBalance < PSY_AMOUNT) {
      console.error(`❌ Insufficient PSY: need ${Number(PSY_AMOUNT) / 1_000_000} PSY, have ${Number(psyBalance) / 1_000_000}`);
      process.exit(1);
    }

    console.log("✅ Sufficient funds available");
    console.log();

    console.log("🔨 Step 4: Building pool creation transaction...");
    const dexV2 = new DexV2(lucid, adapter);
    const txComplete = await dexV2.createPoolTx({
      assetA: ADA,
      assetB: PSY_ASSET,
      amountA: ADA_AMOUNT,
      amountB: PSY_AMOUNT,
      tradingFeeNumerator: TRADING_FEE_NUMERATOR,
    });

    console.log("✅ Transaction built successfully");
    console.log();

    console.log("📝 Step 5: Signing transaction...");
    const signedTx = await txComplete
      .signWithPrivateKey(walletSkey)
      .complete();

    console.log("✅ Transaction signed");
    console.log();

    console.log("🚀 Step 6: Submitting transaction to preprod...");
    const txHash = await signedTx.submit();

    console.log("✅ Transaction submitted successfully!");
    console.log();
    console.log("=" .repeat(70));
    console.log(`🎯 Transaction Hash: ${txHash}`);
    console.log(`🔍 View on explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
    console.log();
    console.log("📊 Pool Details:");
    console.log(`   Asset A: ADA (${Number(ADA_AMOUNT) / 1_000_000} ADA)`);
    console.log(`   Asset B: PSY (${Number(PSY_AMOUNT) / 1_000_000} PSY)`);
    console.log(`   Trading Fee: ${Number(TRADING_FEE_NUMERATOR) / 100}%`);
    console.log();
    console.log("⏳ Wait for confirmation (~1-2 minutes), then you can:");
    console.log("   1. Query the pool with adapter.getV2PoolByPair(ADA, PSY)");
    console.log("   2. Add more liquidity");
    console.log("   3. Start trading PSY/ADA");
    console.log();
    console.log("✅ POOL CREATION COMPLETE!");
    console.log("=".repeat(70));

  } catch (err: any) {
    console.error("❌ Error:", err.message || err);
    if (err.stack) {
      console.error("\nStack trace:");
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
