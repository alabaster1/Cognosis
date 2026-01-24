/**
 * PsyApp Cardano Smart Contract Integration
 * TypeScript bindings for Lucid Evolution to interact with psi-research contracts
 */

import {
  Data,
  Constr,
  fromText,
  toHex,
  UTxO,
  type LucidEvolution,
  getAddressDetails,
} from "@lucid-evolution/lucid";
import { blake2b } from "@noble/hashes/blake2b";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Game type indices matching Aiken enum order
 * MUST match the order in lib/psi_research/types.ak
 */
export const GAME_TYPE_INDEX = {
  CardPrediction: 0,
  TimelineRacer: 1,
  PsiPoker: 2,
  CoinFlip: 3,
  QuantumCoinArena: 4,
  DiceInfluence: 5,
  RemoteViewing: 6,
  EmotionEcho: 7,
  PatternOracle: 8,
  MindPulse: 9,
  RetroRoulette: 10,
  SynchronicityBingo: 11,
  GlobalConsciousness: 12,
} as const;

export type GameType = keyof typeof GAME_TYPE_INDEX;

/**
 * Session state indices matching Aiken enum
 */
export const SESSION_STATE_INDEX = {
  AwaitingParticipant: 0,
  InProgress: 1,
  AwaitingReveal: 2,
  Settled: 3,
  Expired: 4,
} as const;

export type SessionState = keyof typeof SESSION_STATE_INDEX;

/**
 * Baseline probabilities for each game type (percentage)
 */
export const GAME_BASELINES: Record<GameType, number> = {
  CardPrediction: 25,
  TimelineRacer: 25,
  PsiPoker: 25,
  CoinFlip: 50,
  QuantumCoinArena: 50,
  DiceInfluence: 17,
  RemoteViewing: 0, // Scored
  EmotionEcho: 13,
  PatternOracle: 20,
  MindPulse: 25,
  RetroRoulette: 50,
  SynchronicityBingo: 0, // Correlation
  GlobalConsciousness: 25,
};

/**
 * Session creation result
 */
export interface SessionCreationResult {
  txHash: string;
  sessionId: string;
  nonce: string; // Store securely - needed for reveal!
  targetHash: string;
}

/**
 * Session join result
 */
export interface SessionJoinResult {
  txHash: string;
  guessNonce: string; // Store securely - needed if commit-reveal for guess
}

/**
 * Session data parsed from UTxO datum
 */
export interface SessionData {
  targetHash: string;
  hostPkh: string;
  participantPkh: string | null;
  gameType: GameType;
  sessionState: SessionState;
  commitSlot: bigint;
  joinDeadlineSlot: bigint;
  revealDeadlineSlot: bigint;
  stakeLovelace: bigint;
  researchPoolPct: number;
  maxParticipants: number;
  currentParticipants: number;
  ipfsCid: string | null;
  aiScore: number | null;
}

// ============================================================================
// CONTRACT ADDRESSES (Update after deployment)
// ============================================================================

// These will be set after contract compilation and deployment
export let PSI_CONTRACT_ADDRESS = "";
export let RESEARCH_POOL_ADDRESS = "";

// Compiled validator scripts (CBOR hex) - populated by build script
export let PSI_VALIDATOR_SCRIPT = "";
export let RESEARCH_POOL_SCRIPT = "";

/**
 * Initialize contract addresses
 */
export function initializeContracts(
  psiContractAddress: string,
  researchPoolAddress: string,
  psiValidatorScript?: string,
  researchPoolScript?: string
) {
  PSI_CONTRACT_ADDRESS = psiContractAddress;
  RESEARCH_POOL_ADDRESS = researchPoolAddress;
  if (psiValidatorScript) PSI_VALIDATOR_SCRIPT = psiValidatorScript;
  if (researchPoolScript) RESEARCH_POOL_SCRIPT = researchPoolScript;
}

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

/**
 * Create commitment hash: Blake2b-256(target || nonce)
 * Matches the Aiken implementation in utils.ak
 */
export function createCommitment(target: string, nonce: string): string {
  const targetBytes = new TextEncoder().encode(target);
  const nonceBytes = new TextEncoder().encode(nonce);

  const combined = new Uint8Array(targetBytes.length + nonceBytes.length);
  combined.set(targetBytes, 0);
  combined.set(nonceBytes, targetBytes.length);

  const hash = blake2b(combined, { dkLen: 32 });
  return toHex(hash);
}

/**
 * Verify a commitment matches
 */
export function verifyCommitment(
  commitmentHash: string,
  target: string,
  nonce: string
): boolean {
  const computedHash = createCommitment(target, nonce);
  return computedHash === commitmentHash;
}

/**
 * Generate a cryptographically secure random nonce
 */
export function generateNonce(): string {
  return crypto.randomUUID();
}

// ============================================================================
// DATUM BUILDERS
// ============================================================================

/**
 * Build PsiDatum for new session creation
 */
export function buildPsiDatum(
  gameType: GameType,
  targetHash: string,
  hostPkh: string,
  stakeLovelace: bigint,
  commitSlot: bigint,
  joinDeadlineSlot: bigint,
  revealDeadlineSlot: bigint,
  maxParticipants: number = 1
): Data {
  return new Constr(0, [
    // target_hash: Hash<Blake2b_256, ByteArray>
    targetHash,
    // host_pkh: VerificationKeyHash
    hostPkh,
    // participant_pkh: Option<VerificationKeyHash> - None
    new Constr(1, []),
    // game_type: GameType
    new Constr(GAME_TYPE_INDEX[gameType], []),
    // session_state: SessionState - AwaitingParticipant
    new Constr(SESSION_STATE_INDEX.AwaitingParticipant, []),
    // commit_slot: Int
    commitSlot,
    // join_deadline_slot: Int
    joinDeadlineSlot,
    // reveal_deadline_slot: Int
    revealDeadlineSlot,
    // stake_lovelace: Int
    stakeLovelace,
    // research_pool_pct: Int - Default 5%
    5n,
    // max_participants: Int
    BigInt(maxParticipants),
    // current_participants: Int
    0n,
    // participant_guesses: List<ParticipantGuess>
    [],
    // ipfs_cid: Option<ByteArray> - None
    new Constr(1, []),
    // ai_score: Option<Int> - None
    new Constr(1, []),
  ]);
}

/**
 * Update datum when participant joins
 */
export function buildJoinedDatum(
  originalDatum: Data,
  participantPkh: string,
  guessHash: string,
  slot: bigint
): Data {
  const d = originalDatum as Constr<Data>;
  const fields = [...d.fields];

  // Update participant_pkh to Some(participantPkh)
  fields[2] = new Constr(0, [participantPkh]);

  // Update session_state to AwaitingReveal
  fields[4] = new Constr(SESSION_STATE_INDEX.AwaitingReveal, []);

  // Update current_participants
  const currentParticipants = fields[11] as bigint;
  fields[11] = currentParticipants + 1n;

  // Add participant guess to list
  const guesses = fields[12] as Data[];
  const newGuess = new Constr(0, [
    participantPkh,      // pkh
    guessHash,           // guess_hash
    new Constr(1, []),   // guess_value: None
    slot,                // timestamp_slot
  ]);
  fields[12] = [newGuess, ...guesses];

  return new Constr(0, fields);
}

// ============================================================================
// REDEEMER BUILDERS
// ============================================================================

/**
 * Build Join redeemer
 */
export function buildJoinRedeemer(guessHash: string): Data {
  return new Constr(0, [guessHash]); // Join { guess_hash }
}

/**
 * Build Reveal redeemer
 */
export function buildRevealRedeemer(targetValue: string, nonce: string): Data {
  return new Constr(1, [
    fromText(targetValue),
    fromText(nonce),
  ]); // Reveal { target_value, nonce }
}

/**
 * Build SubmitScore redeemer
 */
export function buildSubmitScoreRedeemer(score: number, oracleSignature: string): Data {
  return new Constr(2, [
    BigInt(score),
    oracleSignature,
  ]); // SubmitScore { score, oracle_signature }
}

/**
 * Build ClaimHostTimeout redeemer
 */
export function buildClaimHostTimeoutRedeemer(): Data {
  return new Constr(5, []); // ClaimHostTimeout
}

/**
 * Build ClaimParticipantTimeout redeemer
 */
export function buildClaimParticipantTimeoutRedeemer(): Data {
  return new Constr(6, []); // ClaimParticipantTimeout
}

/**
 * Build MutualCancel redeemer
 */
export function buildMutualCancelRedeemer(): Data {
  return new Constr(7, []); // MutualCancel
}

// ============================================================================
// CONTRACT INTERACTION FUNCTIONS
// ============================================================================

/**
 * Create a new psi experiment session
 * Host commits their target and locks stake
 */
export async function createSession(
  lucid: LucidEvolution,
  gameType: GameType,
  target: string,
  stakeAda: number,
  joinWindowSlots: number = 3600,    // ~1 hour
  revealWindowSlots: number = 7200,  // ~2 hours from commit
  maxParticipants: number = 1
): Promise<SessionCreationResult> {
  if (!PSI_CONTRACT_ADDRESS) {
    throw new Error("Contract addresses not initialized. Call initializeContracts first.");
  }

  // Generate cryptographic commitment
  const nonce = generateNonce();
  const targetHash = createCommitment(target, nonce);
  const stakeLovelace = BigInt(Math.floor(stakeAda * 1_000_000));

  // Get current slot
  const currentSlot = BigInt(await lucid.currentSlot());
  const joinDeadline = currentSlot + BigInt(joinWindowSlots);
  const revealDeadline = currentSlot + BigInt(revealWindowSlots);

  // Get host's PKH
  const walletAddress = await lucid.wallet().address();
  const addressDetails = getAddressDetails(walletAddress);
  const hostPkh = addressDetails.paymentCredential?.hash;

  if (!hostPkh) {
    throw new Error("Could not get host payment credential");
  }

  // Build datum
  const datum = buildPsiDatum(
    gameType,
    targetHash,
    hostPkh,
    stakeLovelace,
    currentSlot,
    joinDeadline,
    revealDeadline,
    maxParticipants
  );

  // Build transaction
  const tx = await lucid
    .newTx()
    .pay.ToContract(
      PSI_CONTRACT_ADDRESS,
      { kind: "inline", value: Data.to(datum) },
      { lovelace: stakeLovelace }
    )
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return {
    txHash,
    sessionId: `${txHash}#0`,
    nonce, // IMPORTANT: Store securely - needed for reveal!
    targetHash,
  };
}

/**
 * Join an existing session as a participant
 */
export async function joinSession(
  lucid: LucidEvolution,
  sessionUtxo: UTxO,
  guess: string
): Promise<SessionJoinResult> {
  if (!PSI_VALIDATOR_SCRIPT) {
    throw new Error("Validator script not initialized");
  }

  // Generate commitment for guess
  const guessNonce = generateNonce();
  const guessHash = createCommitment(guess, guessNonce);

  // Get participant's PKH
  const walletAddress = await lucid.wallet().address();
  const addressDetails = getAddressDetails(walletAddress);
  const participantPkh = addressDetails.paymentCredential?.hash;

  if (!participantPkh) {
    throw new Error("Could not get participant payment credential");
  }

  // Parse current datum
  if (!sessionUtxo.datum) {
    throw new Error("Session UTxO missing datum");
  }
  const currentDatum = Data.from(sessionUtxo.datum);

  // Get stake amount from datum
  const datumFields = (currentDatum as Constr<Data>).fields;
  const stakeLovelace = datumFields[8] as bigint;

  // Build updated datum
  const currentSlot = BigInt(await lucid.currentSlot());
  const updatedDatum = buildJoinedDatum(
    currentDatum,
    participantPkh,
    guessHash,
    currentSlot
  );

  // Build redeemer
  const redeemer = buildJoinRedeemer(guessHash);

  // Build transaction
  const tx = await lucid
    .newTx()
    .collectFrom([sessionUtxo], Data.to(redeemer))
    .pay.ToContract(
      PSI_CONTRACT_ADDRESS,
      { kind: "inline", value: Data.to(updatedDatum) },
      { lovelace: stakeLovelace * 2n } // Double stake (host + participant)
    )
    .addSignerKey(participantPkh)
    .attach.SpendingValidator({
      type: "PlutusV3",
      script: PSI_VALIDATOR_SCRIPT,
    })
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return {
    txHash,
    guessNonce, // Store securely if needed for guess reveal
  };
}

/**
 * Host reveals the target and triggers settlement
 */
export async function revealTarget(
  lucid: LucidEvolution,
  sessionUtxo: UTxO,
  target: string,
  nonce: string
): Promise<string> {
  if (!PSI_VALIDATOR_SCRIPT || !RESEARCH_POOL_ADDRESS) {
    throw new Error("Contracts not initialized");
  }

  // Verify commitment before submitting
  if (!sessionUtxo.datum) {
    throw new Error("Session UTxO missing datum");
  }
  const currentDatum = Data.from(sessionUtxo.datum);
  const datumFields = (currentDatum as Constr<Data>).fields;
  const storedHash = datumFields[0] as string;

  if (!verifyCommitment(storedHash, target, nonce)) {
    throw new Error("Commitment verification failed - target/nonce don't match stored hash");
  }

  // Parse datum for payout calculation
  const stakeLovelace = datumFields[8] as bigint;
  const researchPct = datumFields[9] as bigint;
  const currentParticipants = datumFields[11] as bigint;

  const totalPool = stakeLovelace * (currentParticipants + 1n);
  const researchAmount = totalPool * researchPct / 100n;
  const winnerAmount = totalPool - researchAmount;

  // Get host PKH for signing
  const hostPkh = datumFields[1] as string;

  // Build redeemer
  const redeemer = buildRevealRedeemer(target, nonce);

  // For now, we pay winner amount to host (actual winner determination
  // happens on-chain, this is simplified for demo)
  // In production, you'd parse participant guesses and determine winner
  const walletAddress = await lucid.wallet().address();

  // Build transaction
  const tx = await lucid
    .newTx()
    .collectFrom([sessionUtxo], Data.to(redeemer))
    .pay.ToAddress(walletAddress, { lovelace: winnerAmount })
    .pay.ToContract(
      RESEARCH_POOL_ADDRESS,
      { kind: "inline", value: Data.to(new Constr(0, [])) }, // Minimal datum
      { lovelace: researchAmount }
    )
    .addSignerKey(hostPkh)
    .attach.SpendingValidator({
      type: "PlutusV3",
      script: PSI_VALIDATOR_SCRIPT,
    })
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return txHash;
}

/**
 * Claim timeout when host fails to reveal
 */
export async function claimHostTimeout(
  lucid: LucidEvolution,
  sessionUtxo: UTxO
): Promise<string> {
  if (!PSI_VALIDATOR_SCRIPT || !RESEARCH_POOL_ADDRESS) {
    throw new Error("Contracts not initialized");
  }

  if (!sessionUtxo.datum) {
    throw new Error("Session UTxO missing datum");
  }
  const currentDatum = Data.from(sessionUtxo.datum);
  const datumFields = (currentDatum as Constr<Data>).fields;

  // Get participant PKH
  const participantPkhOption = datumFields[2] as Constr<Data>;
  if (participantPkhOption.index === 1) {
    throw new Error("No participant to claim timeout");
  }
  const participantPkh = participantPkhOption.fields[0] as string;

  // Calculate payout
  const stakeLovelace = datumFields[8] as bigint;
  const researchPct = datumFields[9] as bigint;
  const currentParticipants = datumFields[11] as bigint;

  const totalPool = stakeLovelace * (currentParticipants + 1n);
  const researchAmount = totalPool * researchPct / 100n;
  const participantAmount = totalPool - researchAmount;

  const redeemer = buildClaimHostTimeoutRedeemer();

  const walletAddress = await lucid.wallet().address();

  const tx = await lucid
    .newTx()
    .collectFrom([sessionUtxo], Data.to(redeemer))
    .pay.ToAddress(walletAddress, { lovelace: participantAmount })
    .pay.ToContract(
      RESEARCH_POOL_ADDRESS,
      { kind: "inline", value: Data.to(new Constr(0, [])) },
      { lovelace: researchAmount }
    )
    .addSignerKey(participantPkh)
    .attach.SpendingValidator({
      type: "PlutusV3",
      script: PSI_VALIDATOR_SCRIPT,
    })
    .validFrom(Date.now()) // Must be after reveal deadline
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return txHash;
}

/**
 * Host reclaims stake when no one joins
 */
export async function claimParticipantTimeout(
  lucid: LucidEvolution,
  sessionUtxo: UTxO
): Promise<string> {
  if (!PSI_VALIDATOR_SCRIPT) {
    throw new Error("Validator script not initialized");
  }

  if (!sessionUtxo.datum) {
    throw new Error("Session UTxO missing datum");
  }
  const currentDatum = Data.from(sessionUtxo.datum);
  const datumFields = (currentDatum as Constr<Data>).fields;

  const hostPkh = datumFields[1] as string;
  const stakeLovelace = datumFields[8] as bigint;

  const redeemer = buildClaimParticipantTimeoutRedeemer();

  const walletAddress = await lucid.wallet().address();

  const tx = await lucid
    .newTx()
    .collectFrom([sessionUtxo], Data.to(redeemer))
    .pay.ToAddress(walletAddress, { lovelace: stakeLovelace })
    .addSignerKey(hostPkh)
    .attach.SpendingValidator({
      type: "PlutusV3",
      script: PSI_VALIDATOR_SCRIPT,
    })
    .validFrom(Date.now()) // Must be after join deadline
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return txHash;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Parse session data from UTxO
 */
export function parseSessionData(utxo: UTxO): SessionData | null {
  if (!utxo.datum) return null;

  try {
    const datum = Data.from(utxo.datum);
    const d = datum as Constr<Data>;
    const fields = d.fields;

    // Find game type from index
    const gameTypeConstr = fields[3] as Constr<Data>;
    const gameTypeIndex = gameTypeConstr.index;
    const gameType = Object.keys(GAME_TYPE_INDEX).find(
      key => GAME_TYPE_INDEX[key as GameType] === gameTypeIndex
    ) as GameType;

    // Find session state from index
    const stateConstr = fields[4] as Constr<Data>;
    const stateIndex = stateConstr.index;
    const sessionState = Object.keys(SESSION_STATE_INDEX).find(
      key => SESSION_STATE_INDEX[key as SessionState] === stateIndex
    ) as SessionState;

    // Parse participant PKH (Option)
    const participantOption = fields[2] as Constr<Data>;
    const participantPkh = participantOption.index === 0
      ? participantOption.fields[0] as string
      : null;

    // Parse IPFS CID (Option)
    const ipfsCidOption = fields[13] as Constr<Data>;
    const ipfsCid = ipfsCidOption.index === 0
      ? ipfsCidOption.fields[0] as string
      : null;

    // Parse AI score (Option)
    const aiScoreOption = fields[14] as Constr<Data>;
    const aiScore = aiScoreOption.index === 0
      ? Number(aiScoreOption.fields[0] as bigint)
      : null;

    return {
      targetHash: fields[0] as string,
      hostPkh: fields[1] as string,
      participantPkh,
      gameType,
      sessionState,
      commitSlot: fields[5] as bigint,
      joinDeadlineSlot: fields[6] as bigint,
      revealDeadlineSlot: fields[7] as bigint,
      stakeLovelace: fields[8] as bigint,
      researchPoolPct: Number(fields[9] as bigint),
      maxParticipants: Number(fields[10] as bigint),
      currentParticipants: Number(fields[11] as bigint),
      ipfsCid,
      aiScore,
    };
  } catch (e) {
    console.error("Failed to parse session data:", e);
    return null;
  }
}

/**
 * Get all active sessions for a game type
 */
export async function getActiveSessions(
  lucid: LucidEvolution,
  gameType?: GameType
): Promise<Array<{ utxo: UTxO; data: SessionData }>> {
  if (!PSI_CONTRACT_ADDRESS) {
    throw new Error("Contract address not initialized");
  }

  const utxos = await lucid.utxosAt(PSI_CONTRACT_ADDRESS);

  const sessions: Array<{ utxo: UTxO; data: SessionData }> = [];

  for (const utxo of utxos) {
    const data = parseSessionData(utxo);
    if (data) {
      // Filter by game type if specified
      if (!gameType || data.gameType === gameType) {
        // Only return non-settled sessions
        if (data.sessionState !== "Settled" && data.sessionState !== "Expired") {
          sessions.push({ utxo, data });
        }
      }
    }
  }

  return sessions;
}

/**
 * Get sessions awaiting participants
 */
export async function getJoinableSessions(
  lucid: LucidEvolution,
  gameType?: GameType
): Promise<Array<{ utxo: UTxO; data: SessionData }>> {
  const sessions = await getActiveSessions(lucid, gameType);
  return sessions.filter(s => s.data.sessionState === "AwaitingParticipant");
}

// ============================================================================
// WALLET-DERIVED ALIAS GENERATION
// ============================================================================

const ADJECTIVES = ['Cosmic', 'Quantum', 'Mystic', 'Astral', 'Neural', 'Ethereal', 'Psychic', 'Lunar'];
const NOUNS = ['Fox', 'Owl', 'Wolf', 'Raven', 'Phoenix', 'Dolphin', 'Eagle', 'Dragon'];

/**
 * Generate a deterministic alias from a wallet address
 */
export function generateAlias(walletAddress: string): string {
  const hash = walletAddress.slice(-8);
  const adjIdx = parseInt(hash.slice(0, 4), 16) % ADJECTIVES.length;
  const nounIdx = parseInt(hash.slice(4, 8), 16) % NOUNS.length;
  return `${ADJECTIVES[adjIdx]}${NOUNS[nounIdx]}_${hash.slice(0, 4)}`;
}

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

/**
 * Calculate z-score for observed vs expected hits
 */
export function calculateZScore(
  hits: number,
  trials: number,
  baselinePct: number
): number {
  if (trials === 0) return 0;

  const p = baselinePct / 100;
  const observed = hits / trials;
  const expected = p;
  const se = Math.sqrt((p * (1 - p)) / trials);

  if (se === 0) return 0;

  return (observed - expected) / se;
}

/**
 * Calculate p-value from z-score (two-tailed)
 */
export function zScoreToPValue(z: number): number {
  // Approximation using error function
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * p; // Two-tailed
}

/**
 * Get significance level description
 */
export function getSignificanceLevel(pValue: number): string {
  if (pValue < 0.001) return "highly_significant";
  if (pValue < 0.01) return "very_significant";
  if (pValue < 0.05) return "significant";
  if (pValue < 0.1) return "marginal";
  return "none";
}

/**
 * Calculate effect size (Cohen's h for proportions)
 */
export function calculateEffectSize(
  observedPct: number,
  baselinePct: number
): number {
  const phi1 = 2 * Math.asin(Math.sqrt(observedPct / 100));
  const phi2 = 2 * Math.asin(Math.sqrt(baselinePct / 100));
  return phi1 - phi2;
}
