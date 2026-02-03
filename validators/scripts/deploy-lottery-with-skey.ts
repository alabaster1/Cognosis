#!/usr/bin/env node
/**
 * Deploy On-Chain Lottery to Preprod Using Signing Key
 */

import { Lucid, Blockfrost, Data, Constr } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL";
const ORACLE_SKEY_PATH = "/home/albert/cardano-preprod/oracle/payment.skey";

// Load compiled contract
const PLUTUS_JSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../on-chain-lottery/plutus.json"), "utf-8")
);

const LOTTERY_VALIDATOR = PLUTUS_JSON.validators[0];
const LOTTERY_SCRIPT = LOTTERY_VALIDATOR.compiledCode;
const LOTTERY_HASH = LOTTERY_VALIDATOR.hash;

async function deployLottery() {
  console.log("🎰 Deploying On-Chain Lottery to Preprod\n");

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

  if (totalLovelace < 7_000_000n) {
    throw new Error("Insufficient balance. Need at least 7 tADA (5 for contract + 2 for fees)");
  }

  // Build lottery script address
  const lotteryAddress = lucid.utils.validatorToAddress({
    type: "PlutusV3",
    script: LOTTERY_SCRIPT,
  });

  console.log("📍 Lottery contract address:", lotteryAddress);
  console.log("📜 Script hash:", LOTTERY_HASH);
  console.log("");

  // Build initial datum
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  const datum = new Constr(0, [
    BigInt(hourMs),           // drawing_frequency_ms (1 hour)
    BigInt(now),              // last_drawing_time
    0n,                       // accumulated_ada
    [],                       // participants (empty)
    50n,                      // alpha_weight (0.5 scaled by 100)
    adminPkh,                 // admin_pkh
  ]);

  const datumCbor = Data.to(datum);

  console.log("📝 Initial lottery state:");
  console.log("  - Drawing frequency: 1 hour");
  console.log("  - Last drawing:", new Date(now).toISOString());
  console.log("  - Prize pool: 0 ADA");
  console.log("  - Participants: 0");
  console.log("  - Alpha weight: 0.5");
  console.log("");

  // Build transaction
  const tx = await lucid
    .newTx()
    .payToContract(
      lotteryAddress,
      { inline: datumCbor },
      { lovelace: 5_000_000n } // 5 ADA
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("✅ Lottery deployed!");
  console.log("📋 TX Hash:", txHash);
  console.log("");
  console.log("⏳ Waiting for confirmation...");

  await lucid.awaitTx(txHash);

  console.log("✅ Confirmed!\n");

  // Save deployment info
  const deploymentInfo = {
    network: "preprod",
    deployedAt: new Date().toISOString(),
    lotteryAddress,
    scriptHash: LOTTERY_HASH,
    txHash,
    adminAddress: address,
    adminPkh,
    drawingFrequency: "1 hour",
    initialAda: 5,
  };

  const infoPath = path.join(__dirname, "../on-chain-lottery/deployment-preprod.json");
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:", infoPath);
  console.log("");
  console.log("🎉 Lottery is live on preprod!");
  console.log("");
  console.log("Verify on Cardano Explorer:");
  console.log(`https://preprod.cardanoscan.io/address/${lotteryAddress}`);
  console.log("");
}

deployLottery().catch(err => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
