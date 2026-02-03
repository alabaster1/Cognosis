/**
 * On-Chain Lottery Utility Functions
 * Helper functions for interacting with lottery contract
 */

import { Lucid, Data, Constr } from "@lucid-evolution/lucid";
import * as crypto from "crypto";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Participant {
  pkh: string;  // Hex-encoded payment key hash
  psyEarned: number;
  tickets: number;
}

export interface LotteryDatum {
  drawingFrequencyMs: bigint;
  lastDrawingTime: bigint;
  accumulatedAda: bigint;
  participants: Participant[];
  alphaWeight: bigint;
  adminPkh: string;
  vaultScriptHash: string;
}

// ============================================
// DATUM CONSTRUCTION
// ============================================

/**
 * Build lottery datum for Aiken contract
 */
export function buildLotteryDatum(params: {
  drawingFrequencyMs: number;
  lastDrawingTime: number;
  accumulatedAda: number;
  participants: Participant[];
  alphaWeight: number;
  adminPkh: string;
  vaultScriptHash: string;
}): string {
  // Convert to Plutus data structure
  const participantsData = params.participants.map(p => 
    new Constr(0, [
      p.pkh,
      BigInt(p.psyEarned),
      BigInt(p.tickets),
    ])
  );

  const datum = new Constr(0, [
    BigInt(params.drawingFrequencyMs),
    BigInt(params.lastDrawingTime),
    BigInt(params.accumulatedAda),
    participantsData,
    BigInt(params.alphaWeight),
    params.adminPkh,
    params.vaultScriptHash,
  ]);

  return Data.to(datum);
}

// ============================================
// REDEEMER CONSTRUCTION
// ============================================

/**
 * Build Draw redeemer
 */
export function buildDrawRedeemer(vrfProof: string, randomSeed: number): string {
  const redeemer = new Constr(0, [
    vrfProof,
    BigInt(randomSeed),
  ]);
  return Data.to(redeemer);
}

/**
 * Build Accumulate redeemer
 */
export function buildAccumulateRedeemer(entryFee: number): string {
  const redeemer = new Constr(1, [
    BigInt(entryFee),
  ]);
  return Data.to(redeemer);
}

/**
 * Build UpdateParams redeemer
 */
export function buildUpdateParamsRedeemer(newFrequencyMs: number): string {
  const redeemer = new Constr(2, [
    BigInt(newFrequencyMs),
  ]);
  return Data.to(redeemer);
}

// ============================================
// TICKET CALCULATION
// ============================================

/**
 * Calculate lottery tickets based on PSY earned
 * Matches Aiken implementation: tickets = α*sqrt(psy) + (1-α)*log(psy+1)*5
 */
export function calculateTickets(psyEarned: number, alphaWeight: number): number {
  if (psyEarned <= 0) return 0;

  // Alpha weight is 0-1 (e.g., 0.5)
  const sqrtComponent = Math.sqrt(psyEarned);
  const logComponent = Math.log(psyEarned + 1) * 5;

  const tickets = alphaWeight * sqrtComponent + (1 - alphaWeight) * logComponent;

  return Math.floor(tickets);
}

// ============================================
// WINNER SELECTION
// ============================================

/**
 * Select winner from participants using weighted random
 */
export function selectWinner(
  participants: Participant[],
  randomSeed: number
): Participant {
  if (participants.length === 0) {
    throw new Error("No participants");
  }

  // Simple modulo selection (matches Aiken implementation)
  const winnerIndex = randomSeed % participants.length;
  return participants[winnerIndex];
}

/**
 * Select winner using full weighted random (alternative approach)
 */
export function selectWinnerWeighted(
  participants: Participant[],
  randomSeed: number
): Participant {
  const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0);

  if (totalTickets === 0) {
    throw new Error("No tickets in pool");
  }

  // Normalize random seed to 0-1
  const normalizedRandom = (randomSeed % 1000000) / 1000000;
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

// ============================================
// VRF / RANDOMNESS
// ============================================

/**
 * Generate random seed for lottery
 * In production, this would use Cardano VRF
 * For now, using cryptographically secure random
 */
export function generateRandomSeed(): number {
  const randomBytes = crypto.randomBytes(8);
  const randomValue = randomBytes.readBigUInt64BE(0);
  return Number(randomValue % 1000000n);
}

/**
 * Generate VRF proof (placeholder)
 * TODO: Implement actual Cardano VRF
 */
export function generateVRFProof(): string {
  // Placeholder: 32-byte random value
  return crypto.randomBytes(32).toString("hex");
}

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Check if drawing can be triggered
 */
export function canDrawLottery(
  lastDrawingTime: number,
  drawingFrequencyMs: number
): boolean {
  const now = Date.now();
  const timeSinceLastDraw = now - lastDrawingTime;
  return timeSinceLastDraw >= drawingFrequencyMs;
}

/**
 * Get next drawing time
 */
export function getNextDrawingTime(
  lastDrawingTime: number,
  drawingFrequencyMs: number
): Date {
  return new Date(lastDrawingTime + drawingFrequencyMs);
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate lottery datum
 */
export function validateLotteryDatum(datum: LotteryDatum): void {
  if (datum.drawingFrequencyMs <= 0n) {
    throw new Error("Invalid drawing frequency");
  }

  if (datum.accumulatedAda < 0n) {
    throw new Error("Invalid accumulated ADA");
  }

  if (datum.alphaWeight < 0n || datum.alphaWeight > 100n) {
    throw new Error("Invalid alpha weight (must be 0-100)");
  }

  // Validate participants
  for (const participant of datum.participants) {
    if (participant.psyEarned <= 0) {
      throw new Error("Invalid PSY earned");
    }
    if (participant.tickets < 0) {
      throw new Error("Invalid ticket count");
    }
  }
}

export default {
  buildLotteryDatum,
  buildDrawRedeemer,
  buildAccumulateRedeemer,
  buildUpdateParamsRedeemer,
  calculateTickets,
  selectWinner,
  selectWinnerWeighted,
  generateRandomSeed,
  generateVRFProof,
  canDrawLottery,
  getNextDrawingTime,
  validateLotteryDatum,
};
