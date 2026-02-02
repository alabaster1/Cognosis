#!/usr/bin/env node
/**
 * Top Up Cognosis Reward Vault with PSY Tokens
 * 
 * Allows admin to add more PSY tokens to the vault
 * 
 * Usage:
 *   npx tsx scripts/cardano/top-up-vault.ts [network] [amount]
 * 
 * Examples:
 *   npx tsx scripts/cardano/top-up-vault.ts preprod 50000   # Add 50k PSY to preprod vault
 *   npx tsx scripts/cardano/top-up-vault.ts mainnet 100000  # Add 100k PSY to mainnet vault
 */

import { Lucid, Blockfrost, Data } from "@lucid-evolution/lucid";
import { getPsyConfig } from "./psy-token-config";
import { topUpVault, getVaultData, initializeRewardVault } from "../../src/lib/cardano/rewardVault";
import * as fs from "fs";
import * as path from "path";

async function runTopUp(network: "mainnet" | "preprod", amount: bigint) {
  console.log(`\n💰 Topping up vault on ${network.toUpperCase()} with ${amount} PSY...\n`);

  // Load deployment info
  const deploymentPath = path.join(__dirname, `vault-deployment-${network}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for ${network}. Run setup-vault.ts first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  // Initialize Lucid
  const blockfrostUrl = network === "mainnet"
    ? "https://cardano-mainnet.blockfrost.io/api/v0"
    : "https://cardano-preprod.blockfrost.io/api/v0";

  const blockfrostKey = process.env.BLOCKFROST_API_KEY;
  if (!blockfrostKey) {
    throw new Error("BLOCKFROST_API_KEY not set");
  }

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, blockfrostKey),
    network === "mainnet" ? "Mainnet" : "Preprod"
  );

  // Load admin wallet
  const seedPhrase = process.env.WALLET_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error("WALLET_SEED_PHRASE not set in .env");
  }
  lucid.selectWallet.fromSeed(seedPhrase);

  const adminAddress = await lucid.wallet().address();
  console.log(`Admin address: ${adminAddress}\n`);

  // Initialize reward vault contract state
  initializeRewardVault(
    deployment.vaultAddress,
    deployment.vaultScript,
    deployment.policyId,
    deployment.assetName
  );

  // Get current vault state
  console.log("📊 Checking current vault state...");
  const vaultState = await getVaultData(lucid);
  
  if (!vaultState) {
    throw new Error("Could not find vault UTxO");
  }

  const psyConfig = getPsyConfig(network);
  const psyUnit = psyConfig.unit;
  const currentPsy = vaultState.utxo.assets[psyUnit] ?? 0n;

  console.log(`Current PSY balance: ${currentPsy}`);
  console.log(`Adding: ${amount} PSY`);
  console.log(`New balance will be: ${currentPsy + amount} PSY\n`);

  // Check if wallet has enough PSY
  const walletUtxos = await lucid.wallet().getUtxos();
  const walletPsy = walletUtxos.reduce((sum, utxo) => {
    return sum + (utxo.assets[psyUnit] ?? 0n);
  }, 0n);

  console.log(`Your wallet PSY balance: ${walletPsy}`);
  
  if (walletPsy < amount) {
    throw new Error(`Insufficient PSY tokens. You have ${walletPsy} but need ${amount}`);
  }

  // Execute top-up
  console.log("\n⚡ Building top-up transaction...");
  const txHash = await topUpVault(lucid, vaultState.utxo, amount);

  console.log(`✅ Top-up successful!`);
  console.log(`Tx hash: ${txHash}\n`);

  // Verify new state
  console.log("📊 Verifying new vault state...");
  const newVaultState = await getVaultData(lucid);
  
  if (newVaultState) {
    const newPsy = newVaultState.utxo.assets[psyUnit] ?? 0n;
    console.log(`New PSY balance: ${newPsy}`);
    console.log(`Difference: +${newPsy - currentPsy} PSY\n`);
  }

  // Print summary
  const explorerBase = network === "mainnet"
    ? "https://cardanoscan.io"
    : "https://preprod.cardanoscan.io";

  console.log("═══════════════════════════════════════════════════════");
  console.log("VAULT TOP-UP SUCCESSFUL");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Network:         ${network.toUpperCase()}`);
  console.log(`Amount Added:    ${amount} PSY`);
  console.log(`New Balance:     ${newVaultState ? newVaultState.utxo.assets[psyUnit] : 'unknown'} PSY`);
  console.log(`Tx Hash:         ${txHash}`);
  console.log(`Explorer:        ${explorerBase}/transaction/${txHash}`);
  console.log("═══════════════════════════════════════════════════════\n");
}

// Run if called directly
if (require.main === module) {
  const network = (process.argv[2] as "mainnet" | "preprod") || "preprod";
  const amount = process.argv[3] ? BigInt(process.argv[3]) : 10_000n;

  if (network !== "mainnet" && network !== "preprod") {
    console.error("❌ Network must be 'mainnet' or 'preprod'");
    process.exit(1);
  }

  runTopUp(network, amount)
    .then(() => {
      console.log("✅ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
      process.exit(1);
    });
}

export { runTopUp };
