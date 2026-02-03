#!/usr/bin/env node
/**
 * Deploy PSY Rewards Distributor to Preprod Using Signing Key
 */

import { Lucid, Blockfrost, Data, Constr } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL";
const ORACLE_SKEY_PATH = "/home/albert/cardano-preprod/oracle/payment.skey";

// Load compiled contract
const PLUTUS_JSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../psy-rewards-distributor/plutus.json"), "utf-8")
);

const DISTRIBUTOR_VALIDATOR = PLUTUS_JSON.validators[0];
const DISTRIBUTOR_SCRIPT = DISTRIBUTOR_VALIDATOR.compiledCode;
const DISTRIBUTOR_HASH = DISTRIBUTOR_VALIDATOR.hash;

async function deployDistributor() {
  console.log("💰 Deploying PSY Rewards Distributor to Preprod\n");

  // Load signing key
  const skeyJson = JSON.parse(fs.readFileSync(ORACLE_SKEY_PATH, "utf-8"));
  const privateKey = skeyJson.cborHex;

  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_BLOCKFROST_KEY
    ),
    "Preprod"
  );

  lucid.selectWallet.fromPrivateKey(privateKey);

  const address = await lucid.wallet.address();
  const addressDetails = lucid.utils.getAddressDetails(address);
  const adminPkh = addressDetails.paymentCredential?.hash;

  if (!adminPkh) {
    throw new Error("Could not extract admin PKH");
  }

  console.log("👛 Admin wallet:", address);
  console.log("🔑 Admin PKH:", adminPkh);
  console.log("");

  // Check balance
  const utxos = await lucid.wallet.getUtxos();
  const totalLovelace = utxos.reduce((sum, utxo) => {
    const lovelace = utxo.assets.lovelace || 0n;
    return sum + lovelace;
  }, 0n);

  console.log("💰 Wallet balance:", Number(totalLovelace) / 1_000_000, "tADA");
  console.log("");

  if (totalLovelace < 12_000_000n) {
    throw new Error("Insufficient balance. Need at least 12 tADA (10 for contract + 2 for fees)");
  }

  // Build distributor address
  const distributorAddress = lucid.utils.validatorToAddress({
    type: "PlutusV3",
    script: DISTRIBUTOR_SCRIPT,
  });

  console.log("📍 Distributor address:", distributorAddress);
  console.log("📜 Script hash:", DISTRIBUTOR_HASH);
  console.log("");

  // Create placeholder Merkle root
  const placeholderRoot = "0".repeat(64);

  // Build initial datum
  const now = Date.now();

  const datum = new Constr(0, [
    placeholderRoot,          // merkle_root
    1_000_000n,               // total_psy_supply (placeholder)
    0n,                       // accumulated_ada
    BigInt(now),              // snapshot_time
    0n,                       // snapshot_period
    [],                       // claimed_addresses
    adminPkh,                 // admin_pkh
    5_000_000n,               // min_reward_threshold (5 ADA)
  ]);

  const datumCbor = Data.to(datum);

  console.log("📝 Initial distributor state:");
  console.log("  - Merkle root: placeholder");
  console.log("  - Total PSY supply: 1,000,000 (placeholder)");
  console.log("  - Reward pool: 0 ADA");
  console.log("  - Snapshot period: 0");
  console.log("  - Min threshold: 5 ADA");
  console.log("");

  // Build transaction
  const tx = await lucid
    .newTx()
    .payToContract(
      distributorAddress,
      { inline: datumCbor },
      { lovelace: 10_000_000n } // 10 ADA
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("✅ Distributor deployed!");
  console.log("📋 TX Hash:", txHash);
  console.log("");
  console.log("⏳ Waiting for confirmation...");

  await lucid.awaitTx(txHash);

  console.log("✅ Confirmed!\n");

  // Save deployment info
  const deploymentInfo = {
    network: "preprod",
    deployedAt: new Date().toISOString(),
    distributorAddress,
    scriptHash: DISTRIBUTOR_HASH,
    txHash,
    adminAddress: address,
    adminPkh,
    minThreshold: 5,
    initialAda: 10,
  };

  const infoPath = path.join(__dirname, "../psy-rewards-distributor/deployment-preprod.json");
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:", infoPath);
  console.log("");
  console.log("🎉 Distributor is live on preprod!");
  console.log("");
  console.log("Verify on Cardano Explorer:");
  console.log(`https://preprod.cardanoscan.io/address/${distributorAddress}`);
  console.log("");
}

deployDistributor().catch(err => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
