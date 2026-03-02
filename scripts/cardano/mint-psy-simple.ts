#!/usr/bin/env node
/**
 * Simple PSY token minting on preprod
 * Uses native script for testing
 */

import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { readFileSync } from "fs";
import { homedir } from "os";

const seedPhrase = readFileSync(`${homedir()}/.eternl-wallet/seed.txt`, 'utf-8').trim();
const PREPROD_KEY = process.env.BLOCKFROST_API_KEY;

const amount = process.argv[2] ? BigInt(process.argv[2]) : 10_000_000_000n; // 10 billion default

async function mintPsy() {
  if (!PREPROD_KEY) {
    throw new Error("BLOCKFROST_API_KEY is required");
  }
  console.log(`🪙 Minting ${amount.toLocaleString()} PSY tokens on preprod...\n`);

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", PREPROD_KEY),
    "Preprod"
  );

  lucid.selectWallet.fromSeed(seedPhrase);
  const address = await lucid.wallet().address();
  
  console.log("📍 Wallet:", address);

  // Get payment credential
  const { paymentCredential } = lucid.utils.getAddressDetails(address);
  
  if (!paymentCredential || paymentCredential.type !== "Key") {
    throw new Error("Could not get payment key hash");
  }

  const paymentKeyHash = paymentCredential.hash;

  // Create native script (simple signature check)
  const nativeScript = lucid.utils.nativeScriptFromJson({
    type: "sig",
    keyHash: paymentKeyHash,
  });

  const policyId = lucid.utils.mintingPolicyToId(nativeScript);
  
  const assetName = "PSY";
  const unit = policyId + Buffer.from(assetName).toString("hex");

  console.log("\n📋 Token Info:");
  console.log(`Policy ID: ${policyId}`);
  console.log(`Asset Name: ${assetName}`);
  console.log(`Unit: ${unit}`);

  // Build minting transaction
  console.log("\n🔨 Building transaction...");
  
  const tx = await lucid
    .newTx()
    .mintAssets({
      [unit]: amount,
    })
    .attach.MintingPolicy(nativeScript)
    .complete();

  console.log("✍️  Signing transaction...");
  const signed = await tx.sign().complete();

  console.log("📤 Submitting to blockchain...");
  const txHash = await signed.submit();

  console.log("\n✅ PSY tokens minted!");
  console.log(`📋 Transaction: ${txHash}`);
  console.log(`\n🔍 View on explorer:`);
  console.log(`https://preprod.cardanoscan.io/transaction/${txHash}`);
  
  console.log("\n💾 IMPORTANT - Save this:");
  console.log(`export PSY_POLICY_ID="${policyId}"`);
  console.log(`\nAdd to ~/.bashrc or use in next steps`);

  // Wait for confirmation
  console.log("\n⏳ Waiting for confirmation...");
  await lucid.awaitTx(txHash);
  
  console.log("✅ Transaction confirmed!");
  console.log(`\n🎉 You now have ${amount.toLocaleString()} PSY tokens!`);
}

mintPsy().catch(console.error);
