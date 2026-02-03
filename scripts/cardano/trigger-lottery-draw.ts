#!/usr/bin/env node
/**
 * Trigger PSY Lottery Drawing on Preprod
 * 
 * Checks if drawing_frequency_ms has elapsed, then:
 * 1. Queries all lottery participants
 * 2. Calculates weighted tickets based on PSY earned
 * 3. Selects winner via weighted random selection
 * 4. Distributes accumulated ADA to winner
 * 5. Resets lottery pool for next cycle
 */

import { Lucid, Blockfrost, Data, Constr } from "@lucid-evolution/lucid";
import PSY_REWARD_CONFIG from "./psy-reward-config.js";
import * as crypto from "crypto";

const PREPROD_BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const WALLET_SEED = process.env.WALLET_SEED_PHRASE || "";

const LOTTERY_HASH = PSY_REWARD_CONFIG.validators.psyLottery;
const VAULT_HASH = PSY_REWARD_CONFIG.validators.rewardVaultV2;

// Datum schemas
const LotteryDatum = Data.Object({
  drawing_frequency_ms: Data.Integer(),
  last_drawing_time: Data.Integer(),
  accumulated_ada: Data.Integer(),
  alpha_weight: Data.Integer(),
  admin_pkh: Data.Bytes(),
  vault_script_hash: Data.Bytes(),
});

type LotteryDatum = Data.Static<typeof LotteryDatum>;

// Redeemer for drawing lottery
const LotteryRedeemer = Data.Enum([
  Data.Literal("Draw"),        // Trigger lottery drawing
  Data.Literal("Accumulate"),  // Add fees to pool
]);

interface Participant {
  address: string;
  pkh: string;
  psyEarned: number;
  tickets: number;
}

/**
 * Calculate lottery tickets based on PSY earned
 * Uses hybrid sqrt/log formula from config
 */
function calculateTickets(psyEarned: number): number {
  const { alphaWeight } = PSY_REWARD_CONFIG.lottery;
  
  if (psyEarned <= 0) return 0;
  
  const sqrtWeight = Math.sqrt(psyEarned);
  const logWeight = Math.log(psyEarned + 1) * 5;
  
  return alphaWeight * sqrtWeight + (1 - alphaWeight) * logWeight;
}

/**
 * Select winner via weighted random selection
 */
function selectWinner(participants: Participant[]): Participant {
  const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0);
  
  // Generate random number using crypto (more secure than Math.random)
  const randomBytes = crypto.randomBytes(8);
  const randomValue = randomBytes.readBigUInt64BE(0);
  const maxBigInt = 2n ** 64n - 1n;
  const normalizedRandom = Number(randomValue) / Number(maxBigInt);
  
  const winningTicket = normalizedRandom * totalTickets;
  
  let cumulativeTickets = 0;
  for (const participant of participants) {
    cumulativeTickets += participant.tickets;
    if (winningTicket <= cumulativeTickets) {
      return participant;
    }
  }
  
  // Fallback (should never happen)
  return participants[participants.length - 1];
}

/**
 * Query lottery participants from reward vault
 * TODO: This should query actual experiment UTxOs to get real participants
 * For now using mock data for testing
 */
async function getParticipants(lucid: Lucid): Promise<Participant[]> {
  console.log("📊 Querying lottery participants...\n");
  
  // TODO: Query actual experiment UTxOs from blockchain
  // For now, return mock participants for testing
  
  const mockParticipants: Participant[] = [
    {
      address: "addr_test1qr...", // Replace with real addresses
      pkh: "abc123",
      psyEarned: 200,
      tickets: calculateTickets(200),
    },
    {
      address: "addr_test1qz...",
      pkh: "def456",
      psyEarned: 350,
      tickets: calculateTickets(350),
    },
    {
      address: "addr_test1qp...",
      pkh: "ghi789",
      psyEarned: 150,
      tickets: calculateTickets(150),
    },
  ];
  
  console.log("Found", mockParticipants.length, "participants:");
  mockParticipants.forEach(p => {
    console.log(`  - ${p.address.slice(0, 20)}... (${p.psyEarned} PSY, ${p.tickets.toFixed(2)} tickets)`);
  });
  console.log("");
  
  return mockParticipants;
}

async function triggerLotteryDraw() {
  console.log("🎰 PSY Lottery Drawing Trigger\n");
  
  if (!PREPROD_BLOCKFROST_KEY) {
    throw new Error("BLOCKFROST_API_KEY not set");
  }
  
  if (!WALLET_SEED) {
    throw new Error("WALLET_SEED_PHRASE not set");
  }
  
  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      PREPROD_BLOCKFROST_KEY
    ),
    "Preprod"
  );
  
  lucid.selectWallet.fromSeed(WALLET_SEED);
  
  const address = await lucid.wallet.address();
  console.log("👛 Admin wallet:", address);
  console.log("");
  
  // Build lottery address
  const lotteryAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: LOTTERY_HASH,
  });
  
  console.log("📍 Lottery address:", lotteryAddress);
  console.log("");
  
  // Query lottery UTxO
  console.log("🔍 Querying lottery pool...");
  const lotteryUtxos = await lucid.utxosAt(lotteryAddress);
  
  if (lotteryUtxos.length === 0) {
    throw new Error("Lottery pool not found! Initialize with init-lottery-preprod.ts first");
  }
  
  const lotteryUtxo = lotteryUtxos[0];
  console.log("✅ Found lottery pool UTxO");
  console.log("");
  
  // Parse datum
  if (!lotteryUtxo.datum) {
    throw new Error("Lottery UTxO missing datum");
  }
  
  const datum = Data.from(lotteryUtxo.datum, LotteryDatum);
  
  const drawingFrequencyMs = Number(datum.drawing_frequency_ms);
  const lastDrawingTime = Number(datum.last_drawing_time);
  const accumulatedAda = Number(datum.accumulated_ada);
  
  console.log("📊 Lottery State:");
  console.log("  - Drawing frequency:", drawingFrequencyMs / (60 * 60 * 1000), "hours");
  console.log("  - Last drawing:", new Date(lastDrawingTime).toISOString());
  console.log("  - Prize pool:", (accumulatedAda / 1_000_000).toFixed(2), "ADA");
  console.log("");
  
  // Check if enough time has elapsed
  const now = Date.now();
  const timeSinceLastDraw = now - lastDrawingTime;
  const canDraw = timeSinceLastDraw >= drawingFrequencyMs;
  
  console.log("⏰ Time Check:");
  console.log("  - Current time:", new Date(now).toISOString());
  console.log("  - Time since last draw:", (timeSinceLastDraw / (60 * 60 * 1000)).toFixed(2), "hours");
  console.log("  - Can draw?", canDraw ? "✅ YES" : "❌ NO (not enough time)");
  console.log("");
  
  if (!canDraw) {
    const timeRemaining = drawingFrequencyMs - timeSinceLastDraw;
    console.log("⏳ Time remaining:", (timeRemaining / (60 * 60 * 1000)).toFixed(2), "hours");
    console.log("Next drawing at:", new Date(lastDrawingTime + drawingFrequencyMs).toISOString());
    return;
  }
  
  // Get participants
  const participants = await getParticipants(lucid);
  
  if (participants.length === 0) {
    console.log("⚠️  No participants this cycle. Skipping drawing.");
    console.log("Prize pool will roll over to next cycle.");
    return;
  }
  
  // Select winner
  console.log("🎲 Selecting winner...");
  const winner = selectWinner(participants);
  
  console.log("");
  console.log("🏆 WINNER SELECTED!");
  console.log("  - Address:", winner.address);
  console.log("  - PSY earned:", winner.psyEarned);
  console.log("  - Tickets:", winner.tickets.toFixed(2));
  console.log("  - Prize:", (accumulatedAda / 1_000_000).toFixed(2), "ADA");
  console.log("");
  
  // Build new datum (reset pool)
  const newDatum: LotteryDatum = {
    ...datum,
    last_drawing_time: BigInt(now),
    accumulated_ada: 0n, // Reset pool
  };
  
  const newDatumCbor = Data.to(newDatum, LotteryDatum);
  
  // Build redeemer
  const redeemer = Data.to(new Constr(0, [])); // Draw variant
  
  // Build transaction
  console.log("📝 Building lottery draw transaction...");
  
  const minAda = 2_000_000n; // Min UTxO for continuing lottery
  const prizeAmount = BigInt(accumulatedAda);
  
  const tx = await lucid
    .newTx()
    // Spend lottery UTxO with Draw redeemer
    .collectFrom([lotteryUtxo], redeemer)
    .attach.SpendingValidator({
      type: "PlutusV2",
      script: LOTTERY_HASH,
    })
    // Send prize to winner
    .pay.ToAddress(winner.address, { lovelace: prizeAmount })
    // Continue lottery pool with reset datum
    .pay.ToContract(
      lotteryAddress,
      { inline: newDatumCbor },
      { lovelace: minAda }
    )
    .complete();
  
  console.log("✅ Transaction built");
  console.log("");
  
  // Sign and submit
  console.log("✍️  Signing transaction...");
  const signed = await tx.sign().complete();
  
  console.log("📤 Submitting transaction...");
  const txHash = await signed.submit();
  
  console.log("✅ Transaction submitted!");
  console.log("📋 TX Hash:", txHash);
  console.log("");
  console.log("⏳ Waiting for confirmation...");
  
  await lucid.awaitTx(txHash);
  
  console.log("");
  console.log("🎉 LOTTERY DRAWING COMPLETE!");
  console.log("");
  console.log("Summary:");
  console.log("  - Winner:", winner.address);
  console.log("  - Prize distributed:", (Number(prizeAmount) / 1_000_000).toFixed(2), "ADA");
  console.log("  - Next drawing:", new Date(now + drawingFrequencyMs).toISOString());
  console.log("  - TX Hash:", txHash);
  console.log("");
  
  // Save drawing record
  const drawingRecord = {
    timestamp: now,
    timestampIso: new Date(now).toISOString(),
    winner: winner.address,
    winnerPkh: winner.pkh,
    prizeAda: Number(prizeAmount) / 1_000_000,
    participants: participants.length,
    txHash,
    nextDrawing: new Date(now + drawingFrequencyMs).toISOString(),
  };
  
  console.log("💾 Drawing record:");
  console.log(JSON.stringify(drawingRecord, null, 2));
}

triggerLotteryDraw().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
