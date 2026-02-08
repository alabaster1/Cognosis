#!/usr/bin/env node
/**
 * Deploy and Initialize Cognosis Reward Vault
 * 
 * This script:
 * 1. Deploys the reward vault validator contract
 * 2. Initializes it with PSY token details
 * 3. Creates the initial vault UTxO with parameters
 * 4. Optionally funds it with PSY tokens
 * 
 * Usage:
 *   npx tsx scripts/cardano/setup-vault.ts [network] [initialPsy]
 * 
 * Examples:
 *   npx tsx scripts/cardano/setup-vault.ts preprod 10000    # Deploy to preprod with 10k PSY
 *   npx tsx scripts/cardano/setup-vault.ts mainnet 1000000  # Deploy to mainnet with 1M PSY
 */

import { Lucid, Blockfrost, Data, Constr, getAddressDetails } from "@lucid-evolution/lucid";
import { getPsyConfig } from "./psy-token-config";
import { buildRewardVaultDatum } from "../../src/lib/cardano/rewardVault";
import * as fs from "fs";
import * as path from "path";

interface VaultDeployment {
  network: "mainnet" | "preprod";
  vaultAddress: string;
  vaultScript: string;
  policyId: string;
  assetName: string;
  txHash: string;
  initialPsyAmount: bigint;
  baseReward: bigint;
  decayFactor: bigint;
}

async function deployVault(
  network: "mainnet" | "preprod",
  initialPsyAmount: bigint = 100_000n
): Promise<VaultDeployment> {
  console.log(`\n🚀 Deploying Reward Vault on ${network.toUpperCase()}...\n`);

  // Get PSY token config for this network
  const psyConfig = getPsyConfig(network);
  
  if (!psyConfig.policyId) {
    throw new Error(`PSY token not minted on ${network} yet. Run mint-preprod-psy.ts first if using preprod.`);
  }

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

  // Load wallet
  const seedPhrase = process.env.WALLET_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error("WALLET_SEED_PHRASE not set in .env");
  }
  lucid.selectWallet.fromSeed(seedPhrase);

  const adminAddress = await lucid.wallet().address();
  const addressDetails = getAddressDetails(adminAddress);
  const adminPkh = addressDetails.paymentCredential?.hash;
  
  if (!adminPkh) {
    throw new Error("Could not extract admin PKH");
  }

  console.log(`Admin address: ${adminAddress}`);
  console.log(`Admin PKH: ${adminPkh}\n`);

  // TODO: Load the actual compiled Aiken validator
  // For now, we'll use a placeholder (you'll need to compile the Aiken code first)
  const vaultValidatorScript = "5907d..."; // Placeholder - needs actual compiled validator
  
  console.log("⚠️  WARNING: Using placeholder validator script!");
  console.log("You need to:");
  console.log("1. Write the Aiken reward vault validator");
  console.log("2. Compile it: aiken build");
  console.log("3. Update this script with the compiled validator\n");

  // For now, create a basic script address for testing
  const vaultAddress = lucid.utils.validatorToAddress({
    type: "PlutusV3",
    script: vaultValidatorScript
  });

  console.log(`Vault address: ${vaultAddress}\n`);

  // Reward parameters
  const baseReward = 100n; // 100 PSY tokens per claim initially
  const decayFactor = 1n; // Decay: reward = base / (1 + decay * claims)
  const totalClaims = 0n; // Start at 0
  
  // Get experiment script hash (placeholder - you'll need the actual psi_experiment validator)
  const experimentScriptHash = "0".repeat(56); // Placeholder

  // Build initial vault datum
  const vaultDatum = buildRewardVaultDatum(
    psyConfig.policyId,
    psyConfig.assetName,
    baseReward,
    decayFactor,
    totalClaims,
    experimentScriptHash,
    adminPkh
  );

  // Build transaction to create initial vault UTxO
  const psyUnit = psyConfig.unit;
  const minAda = 2_000_000n; // 2 ADA minimum

  console.log(`Creating vault with:`);
  console.log(`- ${initialPsyAmount} PSY tokens`);
  console.log(`- Base reward: ${baseReward} PSY`);
  console.log(`- Decay factor: ${decayFactor}`);
  console.log(`- Min ADA: ${minAda / 1_000_000n} ADA\n`);

  const tx = await lucid
    .newTx()
    .pay.ToContract(
      vaultAddress,
      { kind: "inline", value: Data.to(vaultDatum) },
      {
        lovelace: minAda,
        [psyUnit]: initialPsyAmount
      }
    )
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  console.log(`✅ Vault deployment transaction submitted!`);
  console.log(`Tx hash: ${txHash}\n`);

  console.log("⏳ Waiting for confirmation...");
  await lucid.awaitTx(txHash);
  console.log("✅ Transaction confirmed!\n");

  const deployment: VaultDeployment = {
    network,
    vaultAddress,
    vaultScript: vaultValidatorScript,
    policyId: psyConfig.policyId,
    assetName: psyConfig.assetName,
    txHash,
    initialPsyAmount,
    baseReward,
    decayFactor
  };

  // Save deployment info
  const deploymentPath = path.join(__dirname, `vault-deployment-${network}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`📝 Saved deployment info to: ${deploymentPath}\n`);

  // Update the rewardVault.ts with initialization call
  console.log("📝 To use this vault in your app, call:");
  console.log(`\ninitializeRewardVault(`);
  console.log(`  "${vaultAddress}",`);
  console.log(`  "${vaultValidatorScript}",`);
  console.log(`  "${psyConfig.policyId}",`);
  console.log(`  "${psyConfig.assetName}"`);
  console.log(`);\n`);

  // Print summary
  console.log("═══════════════════════════════════════════════════════");
  console.log(`REWARD VAULT DEPLOYED ON ${network.toUpperCase()}`);
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Vault Address:   ${vaultAddress}`);
  console.log(`PSY Policy:      ${psyConfig.policyId}`);
  console.log(`PSY Asset:       ${psyConfig.assetName} (${psyConfig.assetNameDecoded})`);
  console.log(`Initial PSY:     ${initialPsyAmount}`);
  console.log(`Base Reward:     ${baseReward} PSY`);
  console.log(`Decay Factor:    ${decayFactor}`);
  console.log(`Tx Hash:         ${txHash}`);
  const explorerBase = network === "mainnet" 
    ? "https://cardanoscan.io" 
    : "https://preprod.cardanoscan.io";
  console.log(`Explorer:        ${explorerBase}/transaction/${txHash}`);
  console.log("═══════════════════════════════════════════════════════\n");

  return deployment;
}

// Run if called directly
if (require.main === module) {
  const network = (process.argv[2] as "mainnet" | "preprod") || "preprod";
  const initialPsy = process.argv[3] ? BigInt(process.argv[3]) : 100_000n;

  if (network !== "mainnet" && network !== "preprod") {
    console.error("❌ Network must be 'mainnet' or 'preprod'");
    process.exit(1);
  }

  deployVault(network, initialPsy)
    .then(() => {
      console.log("✅ Vault deployment complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

export { deployVault };
