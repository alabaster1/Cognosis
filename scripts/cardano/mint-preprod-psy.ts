#!/usr/bin/env node
/**
 * Mint PSY tokens on Cardano Preprod for testing
 *
 * This creates a test version of the mainnet PSY token
 * so we can test the reward vault without using real tokens.
 *
 * Usage:
 *   npx tsx scripts/cardano/mint-preprod-psy.ts [amount]
 *
 * Example:
 *   npx tsx scripts/cardano/mint-preprod-psy.ts 1000000  # Mint 1M PSY
 */

import {
  Lucid,
  Blockfrost,
  mintingPolicyToId,
  scriptFromNative,
  getAddressDetails,
} from "@lucid-evolution/lucid";
import type { Native, PolicyId, Script } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const PSY_ASSET_NAME_HEX = "507379"; // "Psy" in hex
const PSY_ASSET_NAME = "Psy";

interface MintResult {
  policyId: string;
  assetName: string;
  unit: string;
  txHash: string;
  amount: bigint;
}

async function mintPsyPreprod(amount: bigint = 1_000_000n): Promise<MintResult> {
  console.log("Minting PSY tokens on Cardano Preprod...\n");

  if (!PREPROD_BLOCKFROST_KEY) {
    throw new Error("BLOCKFROST_API_KEY not set in environment");
  }

  // Initialize Lucid with Blockfrost (preprod)
  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_BLOCKFROST_KEY
    ),
    "Preprod"
  );

  // Get wallet from environment
  const seedPhrase = process.env.WALLET_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error("WALLET_SEED_PHRASE not set. Run generate-preprod-wallet.ts first.");
  }

  lucid.selectWallet.fromSeed(seedPhrase);

  const address = await lucid.wallet().address();
  console.log(`Wallet address: ${address}\n`);

  // Check wallet balance
  const utxos = await lucid.wallet().getUtxos();
  if (utxos.length === 0) {
    throw new Error("Wallet has no UTxOs. Please fund it from the faucet:\nhttps://docs.cardano.org/cardano-testnets/tools/faucet/");
  }

  const totalAda = utxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);
  console.log(`Wallet balance: ${totalAda / 1_000_000n} ADA\n`);

  // Extract payment credential for native script
  const { paymentCredential } = getAddressDetails(address);

  if (!paymentCredential) {
    throw new Error("Could not extract payment credential from address");
  }

  // Native script: requires wallet signature to mint
  const nativeScript: Native = {
    type: "all",
    scripts: [
      {
        type: "sig",
        keyHash: paymentCredential.hash
      }
    ]
  };

  // Convert native script to Script object for Lucid
  const mintingPolicy: Script = scriptFromNative(nativeScript);
  const policyId: PolicyId = mintingPolicyToId(mintingPolicy);
  const unit = policyId + PSY_ASSET_NAME_HEX;

  console.log(`Policy ID: ${policyId}`);
  console.log(`Asset name: ${PSY_ASSET_NAME} (hex: ${PSY_ASSET_NAME_HEX})`);
  console.log(`Unit: ${unit}`);
  console.log(`Minting amount: ${amount} PSY\n`);

  // Build minting transaction
  const tx = await lucid
    .newTx()
    .mintAssets({ [unit]: amount })
    .attach.MintingPolicy(mintingPolicy)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  console.log(`Minting transaction submitted!`);
  console.log(`Tx hash: ${txHash}\n`);

  console.log("Waiting for confirmation...");
  await lucid.awaitTx(txHash);

  console.log("Transaction confirmed!\n");

  const result: MintResult = {
    policyId,
    assetName: PSY_ASSET_NAME_HEX,
    unit,
    txHash,
    amount
  };

  // Save to config file
  const configPath = path.join(__dirname, "psy-token-config.ts");
  let configContent = fs.readFileSync(configPath, "utf-8");

  configContent = configContent.replace(
    /preprod: \{[^}]+\}/s,
    `preprod: {
    policyId: "${policyId}",
    assetName: "${PSY_ASSET_NAME_HEX}",
    assetNameDecoded: "${PSY_ASSET_NAME}",
    fingerprint: "",
    unit: "${unit}",
  }`
  );

  fs.writeFileSync(configPath, configContent);
  console.log(`Updated psy-token-config.ts with preprod details\n`);

  // Also update backend .env
  const backendEnvPath = path.resolve(__dirname, "../../backend/.env");
  try {
    let envContent = fs.readFileSync(backendEnvPath, "utf-8");
    if (envContent.includes("PSY_POLICY_ID")) {
      envContent = envContent.replace(/PSY_POLICY_ID=.*/, `PSY_POLICY_ID=${policyId}`);
    } else {
      envContent += `\nPSY_POLICY_ID=${policyId}\n`;
    }
    fs.writeFileSync(backendEnvPath, envContent);
    console.log("Updated backend/.env with PSY_POLICY_ID\n");
  } catch {
    console.log("Could not update backend/.env - update manually");
  }

  // Also update .env.local
  const envLocalPath = path.resolve(__dirname, "../../.env.local");
  try {
    let envContent = fs.readFileSync(envLocalPath, "utf-8");
    if (envContent.includes("NEXT_PUBLIC_PSY_POLICY_ID")) {
      envContent = envContent.replace(/NEXT_PUBLIC_PSY_POLICY_ID=.*/, `NEXT_PUBLIC_PSY_POLICY_ID=${policyId}`);
    } else {
      envContent += `\nNEXT_PUBLIC_PSY_POLICY_ID=${policyId}\n`;
    }
    fs.writeFileSync(envLocalPath, envContent);
    console.log("Updated .env.local with NEXT_PUBLIC_PSY_POLICY_ID\n");
  } catch {
    console.log("Could not update .env.local - update manually");
  }

  // Print summary
  console.log("===================================================");
  console.log("PREPROD PSY TOKEN MINTED SUCCESSFULLY");
  console.log("===================================================");
  console.log(`Policy ID:     ${policyId}`);
  console.log(`Asset Name:    ${PSY_ASSET_NAME} (${PSY_ASSET_NAME_HEX})`);
  console.log(`Unit:          ${unit}`);
  console.log(`Amount Minted: ${amount} PSY`);
  console.log(`Tx Hash:       ${txHash}`);
  console.log(`Explorer:      https://preprod.cardanoscan.io/transaction/${txHash}`);
  console.log("===================================================\n");

  return result;
}

// Run if called directly
const amountArg = process.argv[2];
const amount = amountArg ? BigInt(amountArg) : 1_000_000n;

mintPsyPreprod(amount)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });

export { mintPsyPreprod };
