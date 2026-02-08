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

import { Lucid, Blockfrost, MintingPolicy, PolicyId, UTxO } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";
import { generateMnemonic } from "bip39";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const PSY_ASSET_NAME_HEX = "507379"; // "Psy" in hex
const PSY_ASSET_NAME = "Psy";

interface MintResult {
  policyId: string;
  assetName: string;
  fingerprint: string;
  unit: string;
  txHash: string;
  amount: bigint;
}

async function mintPsyPreprod(amount: bigint = 1_000_000n): Promise<MintResult> {
  console.log("🔨 Minting PSY tokens on Cardano Preprod...\n");

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

  // Get wallet from environment or generate new one
  const seedPhrase = process.env.WALLET_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error("WALLET_SEED_PHRASE not set. Please export your seed phrase or use the seed in ~/.eternl-wallet/seed.txt");
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

  // Create minting policy (simple time-locked policy for testing)
  // In production, you'd use a more sophisticated policy
  const { paymentCredential } = lucid.utils.getAddressDetails(address);
  
  if (!paymentCredential) {
    throw new Error("Could not extract payment credential from address");
  }

  // Create a simple minting policy that allows minting only once
  const mintingPolicy: MintingPolicy = {
    type: "PlutusV2",
    script: "5907d..." // Placeholder - we'll use a native script instead
  };

  // For testing, use a native script (simpler)
  // This allows the wallet to mint tokens
  const nativeScript = {
    type: "all",
    scripts: [
      {
        type: "sig",
        keyHash: paymentCredential.hash
      }
    ]
  };

  const policyId: PolicyId = lucid.utils.mintingPolicyToId(nativeScript);
  const unit = policyId + PSY_ASSET_NAME_HEX;

  console.log(`Policy ID: ${policyId}`);
  console.log(`Asset name: ${PSY_ASSET_NAME} (hex: ${PSY_ASSET_NAME_HEX})`);
  console.log(`Unit: ${unit}`);
  console.log(`Minting amount: ${amount} PSY\n`);

  // Build minting transaction
  const tx = await lucid
    .newTx()
    .mint.Assets({ [unit]: amount }, nativeScript)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  console.log(`✅ Minting transaction submitted!`);
  console.log(`Tx hash: ${txHash}\n`);

  console.log("⏳ Waiting for confirmation...");
  await lucid.awaitTx(txHash);

  console.log("✅ Transaction confirmed!\n");

  // Calculate fingerprint
  const fingerprint = lucid.utils.assetFingerprint(policyId, PSY_ASSET_NAME_HEX);

  const result: MintResult = {
    policyId,
    assetName: PSY_ASSET_NAME_HEX,
    fingerprint,
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
    fingerprint: "${fingerprint}",
    unit: "${unit}",
  }`
  );

  fs.writeFileSync(configPath, configContent);
  console.log(`📝 Updated psy-token-config.ts with preprod details\n`);

  // Print summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("PREPROD PSY TOKEN MINTED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Policy ID:     ${policyId}`);
  console.log(`Asset Name:    ${PSY_ASSET_NAME} (${PSY_ASSET_NAME_HEX})`);
  console.log(`Fingerprint:   ${fingerprint}`);
  console.log(`Unit:          ${unit}`);
  console.log(`Amount Minted: ${amount} PSY`);
  console.log(`Tx Hash:       ${txHash}`);
  console.log(`Explorer:      https://preprod.cardanoscan.io/transaction/${txHash}`);
  console.log("═══════════════════════════════════════════════════════\n");

  return result;
}

// Run if called directly
if (require.main === module) {
  const amountArg = process.argv[2];
  const amount = amountArg ? BigInt(amountArg) : 1_000_000n;

  mintPsyPreprod(amount)
    .then(() => {
      console.log("✅ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

export { mintPsyPreprod };
