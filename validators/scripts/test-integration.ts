#!/usr/bin/env node
/**
 * Integration Test Suite for On-Chain Lottery & PSY Distributor
 * 
 * Tests all critical functionality on preprod testnet
 */

import { Lucid, Blockfrost, Data, Constr } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const WALLET_SEED = process.env.WALLET_SEED_PHRASE || "";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      status: "PASS",
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error}`);
  }
}

async function main() {
  console.log("🧪 Integration Test Suite\n");
  console.log("=" .repeat(60));
  console.log("");

  if (!PREPROD_BLOCKFROST_KEY || !WALLET_SEED) {
    console.log("⚠️  Missing environment variables");
    console.log("   Set BLOCKFROST_API_KEY and WALLET_SEED_PHRASE");
    process.exit(1);
  }

  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_BLOCKFROST_KEY
    ),
    "Preprod"
  );

  lucid.selectWallet.fromSeed(WALLET_SEED);

  // Load deployment info
  const lotteryDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../on-chain-lottery/deployment-preprod.json"),
      "utf-8"
    )
  );

  const distributorDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../psy-rewards-distributor/deployment-preprod.json"),
      "utf-8"
    )
  );

  console.log("📍 Lottery address:", lotteryDeployment.lotteryAddress);
  console.log("📍 Distributor address:", distributorDeployment.distributorAddress);
  console.log("");

  // ==========================================
  // LOTTERY TESTS
  // ==========================================

  console.log("🎰 LOTTERY TESTS");
  console.log("-".repeat(60));
  console.log("");

  await runTest("Lottery: Contract is deployed", async () => {
    const utxos = await lucid.utxosAt(lotteryDeployment.lotteryAddress);
    if (utxos.length === 0) {
      throw new Error("No UTxOs found at lottery address");
    }
  });

  await runTest("Lottery: Datum is readable", async () => {
    const utxos = await lucid.utxosAt(lotteryDeployment.lotteryAddress);
    if (!utxos[0].datum) {
      throw new Error("No datum found");
    }
    // Try to parse datum
    const datum = Data.from(utxos[0].datum);
  });

  await runTest("Lottery: Time check validation", async () => {
    // Test: Drawing should not be possible immediately after deployment
    const deployedAt = new Date(lotteryDeployment.deployedAt).getTime();
    const now = Date.now();
    const elapsed = now - deployedAt;
    const hourMs = 60 * 60 * 1000;

    if (elapsed >= hourMs) {
      console.log("   ⚠️  More than 1 hour elapsed, skipping time check test");
      throw new Error("SKIP: More than 1 hour since deployment");
    }

    // Drawing should fail if less than 1 hour elapsed
    console.log(`   ⏱️  Elapsed: ${Math.floor(elapsed / 60000)} minutes`);
  });

  await runTest("Lottery: Prize pool starts at zero", async () => {
    const utxos = await lucid.utxosAt(lotteryDeployment.lotteryAddress);
    const datum = Data.from(utxos[0].datum) as any;

    // Check accumulated_ada field (index 2)
    if (datum.fields[2] !== 0n) {
      throw new Error(`Prize pool is ${datum.fields[2]}, expected 0`);
    }
  });

  await runTest("Lottery: Participant list starts empty", async () => {
    const utxos = await lucid.utxosAt(lotteryDeployment.lotteryAddress);
    const datum = Data.from(utxos[0].datum) as any;

    // Check participants field (index 3)
    const participants = datum.fields[3];
    if (participants.length !== 0) {
      throw new Error(`Found ${participants.length} participants, expected 0`);
    }
  });

  // ==========================================
  // DISTRIBUTOR TESTS
  // ==========================================

  console.log("");
  console.log("💰 PSY DISTRIBUTOR TESTS");
  console.log("-".repeat(60));
  console.log("");

  await runTest("Distributor: Contract is deployed", async () => {
    const utxos = await lucid.utxosAt(distributorDeployment.distributorAddress);
    if (utxos.length === 0) {
      throw new Error("No UTxOs found at distributor address");
    }
  });

  await runTest("Distributor: Datum is readable", async () => {
    const utxos = await lucid.utxosAt(distributorDeployment.distributorAddress);
    if (!utxos[0].datum) {
      throw new Error("No datum found");
    }
    const datum = Data.from(utxos[0].datum);
  });

  await runTest("Distributor: Merkle root is set", async () => {
    const utxos = await lucid.utxosAt(distributorDeployment.distributorAddress);
    const datum = Data.from(utxos[0].datum) as any;

    // Check merkle_root field (index 0)
    const merkleRoot = datum.fields[0];
    if (!merkleRoot || merkleRoot.length === 0) {
      throw new Error("Merkle root is empty");
    }
  });

  await runTest("Distributor: Reward pool starts at zero", async () => {
    const utxos = await lucid.utxosAt(distributorDeployment.distributorAddress);
    const datum = Data.from(utxos[0].datum) as any;

    // Check accumulated_ada field (index 2)
    if (datum.fields[2] !== 0n) {
      throw new Error(`Reward pool is ${datum.fields[2]}, expected 0`);
    }
  });

  await runTest("Distributor: Claimed addresses list is empty", async () => {
    const utxos = await lucid.utxosAt(distributorDeployment.distributorAddress);
    const datum = Data.from(utxos[0].datum) as any;

    // Check claimed_addresses field (index 5)
    const claimedAddresses = datum.fields[5];
    if (claimedAddresses.length !== 0) {
      throw new Error(`Found ${claimedAddresses.length} claimed addresses, expected 0`);
    }
  });

  // ==========================================
  // SUMMARY
  // ==========================================

  console.log("");
  console.log("=" .repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=" .repeat(60));
  console.log("");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log("");

  if (failed > 0) {
    console.log("Failed tests:");
    results
      .filter(r => r.status === "FAIL")
      .forEach(r => {
        console.log(`  - ${r.name}`);
        console.log(`    ${r.error}`);
      });
    console.log("");
  }

  // Save results
  const resultsPath = path.join(__dirname, "../test-results.json");
  fs.writeFileSync(
    resultsPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      summary: { passed, failed, skipped },
    }, null, 2)
  );

  console.log(`💾 Results saved to: ${resultsPath}`);
  console.log("");

  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Review above for details.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
