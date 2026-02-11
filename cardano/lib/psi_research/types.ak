use aiken/crypto.{Blake2b_256, Hash, VerificationKeyHash}

// ============================================================================
// GAME TYPES - Matches frontend exactly
// ============================================================================

/// Core Types for PsyApp Psi-Research Smart Contracts
/// All supported experiment types and session data structures
/// All supported experiment types - matches frontend game catalog
pub type GameType {
  // Precognition experiments (25% baseline chance)
  CardPrediction
  // Classic Zener card prediction
  TimelineRacer
  // Speed-based precognition
  PsiPoker

  // Multi-psi card game
  // Binary choice experiments (50% baseline)
  CoinFlip
  // Simple coin flip prediction
  QuantumCoinArena

  // Multiplayer psychokinesis
  // Dice experiments (16.67% baseline)
  DiceInfluence

  // Single die outcome influence
  // Remote Viewing experiments (variable/scored)
  RemoteViewing
  // Classic remote viewing
  EmotionEcho
  // Emotion perception in art
  PatternOracle

  // Hidden pattern detection
  // Global Consciousness experiments
  MindPulse

  // Scheduled global intention events
  // Retrocausality experiments
  RetroRoulette

  // Influence pre-determined outcomes
  // Synchronicity experiments
  SynchronicityBingo

  // Coincidence tracking
  // Multiplayer experiments
  GlobalConsciousness
  // 2-Player async telepathy (Ghost Signal)
  Telepathy
  // Pre-cognitive explorer (sector selection before AI generation)
  PrecogExplorer
  // Collective PK influence on AI image generation
  PKInfluence
}

// Large-scale collective intention

/// Get baseline probability for game type (in percentage points)
pub fn get_baseline(game_type: GameType) -> Int {
  when game_type is {
    CardPrediction -> 25
    TimelineRacer -> 25
    PsiPoker -> 25
    CoinFlip -> 50
    QuantumCoinArena -> 50
    DiceInfluence -> 17
    // ~16.67%
    RemoteViewing -> 0
    // Scored, no fixed baseline
    EmotionEcho -> 13
    // ~12.5% for 8 emotions
    PatternOracle -> 20
    MindPulse -> 25
    RetroRoulette -> 50
    SynchronicityBingo -> 0
    // Correlation tracking
    GlobalConsciousness -> 25
    Telepathy -> 25
    // 4-choice image selection (25% chance)
    PrecogExplorer -> 25
    // 4-sector selection
    PKInfluence -> 50
  }
}

/// Check if game type uses scored evaluation (AI/human judge)
pub fn is_scored_experiment(game_type: GameType) -> Bool {
  when game_type is {
    RemoteViewing -> True
    EmotionEcho -> True
    PatternOracle -> True
    Telepathy -> True
    _ -> False
  }
}

/// Check if game type supports multiplayer
pub fn is_multiplayer(game_type: GameType) -> Bool {
  when game_type is {
    QuantumCoinArena -> True
    PsiPoker -> True
    MindPulse -> True
    GlobalConsciousness -> True
    Telepathy -> True
    PKInfluence -> True
    _ -> False
  }
}

// ============================================================================
// SESSION STATES
// ============================================================================

/// Session lifecycle states
pub type SessionState {
  AwaitingParticipant
  // Host committed, waiting for player to join
  InProgress
  // Player joined, game active
  AwaitingReveal
  // Player submitted guess, host must reveal
  Settled
  // Complete, funds distributed
  Expired
}

// Timeout occurred, awaiting claim

/// Convert session state to readable index for debugging
pub fn state_to_index(state: SessionState) -> Int {
  when state is {
    AwaitingParticipant -> 0
    InProgress -> 1
    AwaitingReveal -> 2
    Settled -> 3
    Expired -> 4
  }
}

// ============================================================================
// PARTICIPANT DATA
// ============================================================================

/// Individual participant guess (for multiplayer sessions)
pub type ParticipantGuess {
  /// Participant's verification key hash (wallet address)
  pkh: VerificationKeyHash,
  /// Blake2b-256 hash of guess + nonce (for commitment)
  guess_hash: Hash<Blake2b_256, ByteArray>,
  /// Actual guess value (filled after reveal phase)
  guess_value: Option<ByteArray>,
  /// Slot when guess was submitted
  timestamp_slot: Int,
}

/// Create a new participant guess record
pub fn new_participant_guess(
  pkh: VerificationKeyHash,
  guess_hash: Hash<Blake2b_256, ByteArray>,
  slot: Int,
) -> ParticipantGuess {
  ParticipantGuess { pkh, guess_hash, guess_value: None, timestamp_slot: slot }
}

// ============================================================================
// MAIN EXPERIMENT DATUM
// ============================================================================

/// Main experiment datum - locked in session UTxO
/// Contains all state needed for cryptographic verification
pub type PsiDatum {
  // ------ Cryptographic Commitment ------
  /// Blake2b-256(target || nonce) - host's committed target
  target_hash: Hash<Blake2b_256, ByteArray>,
  // ------ Participants ------
  /// Host's verification key hash (creator of session)
  host_pkh: VerificationKeyHash,
  /// Participant's PKH (None until someone joins)
  participant_pkh: Option<VerificationKeyHash>,
  // ------ Game Configuration ------
  /// Type of experiment being conducted
  game_type: GameType,
  /// Current session lifecycle state
  session_state: SessionState,
  // ------ Timing (slot numbers) ------
  /// Slot when session was created/committed
  commit_slot: Int,
  /// Deadline for participant to join (refund to host after)
  join_deadline_slot: Int,
  /// Deadline for host to reveal (forfeit to participant after)
  reveal_deadline_slot: Int,
  // ------ Stakes ------
  /// Amount staked in lovelace (each party)
  stake_lovelace: Int,
  /// Percentage going to research pool (usually 5)
  research_pool_pct: Int,
  // ------ Multiplayer Support ------
  /// Maximum participants allowed (1 for 1v1)
  max_participants: Int,
  /// Current number of participants joined
  current_participants: Int,
  /// List of all participant guesses
  participant_guesses: List<ParticipantGuess>,
  // ------ Off-Chain Data Reference ------
  /// IPFS CID for large data (remote viewing images, etc.)
  ipfs_cid: Option<ByteArray>,
  // ------ Scored Experiments ------
  /// AI/judge similarity score (0-100) for scored experiments
  ai_score: Option<Int>,
}

/// Create initial datum for new session
pub fn new_session_datum(
  target_hash: Hash<Blake2b_256, ByteArray>,
  host_pkh: VerificationKeyHash,
  game_type: GameType,
  commit_slot: Int,
  join_deadline_slot: Int,
  reveal_deadline_slot: Int,
  stake_lovelace: Int,
  max_participants: Int,
) -> PsiDatum {
  PsiDatum {
    target_hash,
    host_pkh,
    participant_pkh: None,
    game_type,
    session_state: AwaitingParticipant,
    commit_slot,
    join_deadline_slot,
    reveal_deadline_slot,
    stake_lovelace,
    research_pool_pct: 5,
    // Default 5% to research pool
    max_participants,
    current_participants: 0,
    participant_guesses: [],
    ipfs_cid: None,
    ai_score: None,
  }
}

/// Update datum when participant joins
pub fn add_participant(
  datum: PsiDatum,
  participant_pkh: VerificationKeyHash,
  guess: ParticipantGuess,
) -> PsiDatum {
  PsiDatum {
    ..datum,
    participant_pkh: Some(participant_pkh),
    session_state: AwaitingReveal,
    current_participants: datum.current_participants + 1,
    participant_guesses: [guess, ..datum.participant_guesses],
  }
}

/// Calculate total pool value (both stakes combined)
pub fn get_total_pool(datum: PsiDatum) -> Int {
  datum.stake_lovelace * ( datum.current_participants + 1 )
}

/// Calculate research pool contribution
pub fn get_research_contribution(datum: PsiDatum) -> Int {
  let total = get_total_pool(datum)
  total * datum.research_pool_pct / 100
}

/// Calculate winner payout (total - research contribution)
pub fn get_winner_payout(datum: PsiDatum) -> Int {
  let total = get_total_pool(datum)
  let research = get_research_contribution(datum)
  total - research
}

// ============================================================================
// RESEARCH POOL TYPES
// ============================================================================

/// Datum for research pool contract
pub type PoolDatum {
  /// Total lovelace collected from all experiments
  total_collected: Int,
  /// List of governance committee PKHs
  governance_pkhs: List<VerificationKeyHash>,
  /// Minimum signatures required for withdrawal
  min_signatures: Int,
}

/// Create initial pool datum
pub fn new_pool_datum(
  governance_pkhs: List<VerificationKeyHash>,
  min_signatures: Int,
) -> PoolDatum {
  PoolDatum { total_collected: 0, governance_pkhs, min_signatures }
}

// ============================================================================
// TESTS
// ============================================================================

test baseline_precognition() {
  get_baseline(CardPrediction) == 25
}

test baseline_binary() {
  get_baseline(CoinFlip) == 50
}

test baseline_dice() {
  get_baseline(DiceInfluence) == 17
}

test scored_experiments() {
  is_scored_experiment(RemoteViewing) && is_scored_experiment(EmotionEcho) && !is_scored_experiment(
    CoinFlip,
  )
}

test multiplayer_check() {
  is_multiplayer(QuantumCoinArena) && is_multiplayer(PsiPoker) && !is_multiplayer(
    CardPrediction,
  )
}

test state_indices() {
  state_to_index(AwaitingParticipant) == 0 && state_to_index(Settled) == 3
}
