use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use psi_research/types.{
  CardPrediction, CoinFlip, DiceInfluence, EmotionEcho, GameType,
  GlobalConsciousness, MindPulse, PKInfluence, ParticipantGuess, PatternOracle,
  PrecogExplorer, PsiPoker, QuantumCoinArena, RemoteViewing, RetroRoulette,
  SynchronicityBingo, Telepathy, TimelineRacer,
}
use psi_research/utils.{safe_div}

// ============================================================================
// WINNER DETERMINATION
// ============================================================================

/// Game-Specific Scoring Logic for PsyApp Psi-Research
/// Determines winners based on game type and participant guesses
/// Result of game evaluation
pub type GameResult {
  /// Single winner takes all
  Winner(VerificationKeyHash)
  /// No winner (house wins / refund scenario)
  NoWinner
  /// Multiple winners share the pool (multiplayer consensus)
  SharedWin(List<VerificationKeyHash>)
  /// Scored experiment - uses ai_score instead
  ScoredSettlement
  /// Draw - both parties get refund
  Draw
}

/// Determine winner based on game type and revealed target
pub fn determine_winner(
  game_type: GameType,
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> GameResult {
  when game_type is {
    // Binary/Card games: exact match wins
    CardPrediction -> exact_match_winner(target, guesses)
    CoinFlip -> exact_match_winner(target, guesses)
    TimelineRacer -> exact_match_winner(target, guesses)

    // Multiplayer PK: consensus based
    QuantumCoinArena -> consensus_winner(target, guesses, 60)

    // Dice: exact number match
    DiceInfluence -> exact_match_winner(target, guesses)

    // Scored experiments: settled via SubmitScore
    RemoteViewing -> ScoredSettlement
    EmotionEcho -> ScoredSettlement
    PatternOracle -> ScoredSettlement

    // Multiplayer card game
    PsiPoker -> psi_poker_winner(target, guesses)

    // Global consciousness: all participants win if threshold met
    MindPulse -> consciousness_result(target, guesses)
    GlobalConsciousness -> consciousness_result(target, guesses)

    // Retrocausality: correlation based
    RetroRoulette -> retro_correlation_winner(target, guesses)

    // Synchronicity: no winner/loser model
    SynchronicityBingo -> NoWinner

    // Telepathy (Ghost Signal): scored via CLIP + Psi-Coefficient
    Telepathy -> ScoredSettlement

    // Pre-Cognitive Explorer: exact sector match
    PrecogExplorer -> exact_match_winner(target, guesses)

    // PK Influence: consensus-based (collective intention)
    PKInfluence -> consciousness_result(target, guesses)
  }
}

// ============================================================================
// EXACT MATCH GAMES
// ============================================================================

/// Find participant whose revealed guess exactly matches target
pub fn exact_match_winner(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> GameResult {
  when find_exact_match(target, guesses) is {
    Some(pkh) -> Winner(pkh)
    None -> NoWinner
  }
}

/// Helper to find first matching guess
fn find_exact_match(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> Option<VerificationKeyHash> {
  when guesses is {
    [] -> None
    [guess, ..rest] ->
      when guess.guess_value is {
        Some(value) ->
          if value == target {
            Some(guess.pkh)
          } else {
            find_exact_match(target, rest)
          }
        None -> find_exact_match(target, rest)
      }
  }
}

/// Check if a guess matches the target
pub fn guess_matches_target(guess: ParticipantGuess, target: ByteArray) -> Bool {
  when guess.guess_value is {
    Some(value) -> value == target
    None -> False
  }
}

// ============================================================================
// CONSENSUS-BASED GAMES (Multiplayer)
// ============================================================================

/// Evaluate consensus among participants
/// threshold_pct: minimum percentage of participants needed for consensus
pub fn consensus_winner(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
  threshold_pct: Int,
) -> GameResult {
  let total = list.length(guesses)
  let matches = count_matches(target, guesses)
  let match_pct = safe_div(matches * 100, total)

  if match_pct >= threshold_pct {
    // Consensus reached - all matching participants share the win
    SharedWin(get_matching_pkhs(target, guesses))
  } else {
    NoWinner
  }
}

/// Count how many guesses match the target
fn count_matches(target: ByteArray, guesses: List<ParticipantGuess>) -> Int {
  list.foldr(
    guesses,
    0,
    fn(g, acc) {
      if guess_matches_target(g, target) {
        acc + 1
      } else {
        acc
      }
    },
  )
}

/// Get PKHs of all participants whose guesses matched
fn get_matching_pkhs(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> List<VerificationKeyHash> {
  list.filter_map(
    guesses,
    fn(g) {
      if guess_matches_target(g, target) {
        Some(g.pkh)
      } else {
        None
      }
    },
  )
}

// ============================================================================
// GLOBAL CONSCIOUSNESS GAMES
// ============================================================================

/// Evaluate global consciousness experiment
/// Everyone wins if collective coherence exceeds threshold
pub fn consciousness_result(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> GameResult {
  let total = list.length(guesses)
  let matches = count_matches(target, guesses)

  // For 4-choice experiments, baseline is 25%
  // Significant if >40% match (2 sigma above baseline)
  let match_pct = safe_div(matches * 100, total)

  if match_pct >= 40 {
    // All participants share in the success
    SharedWin(list.map(guesses, fn(g) { g.pkh }))
  } else {
    // No effect detected - refund all
    NoWinner
  }
}

// ============================================================================
// PSI POKER
// ============================================================================

/// Psi Poker winner determination
/// Combines prediction accuracy for opponent cards and community cards
pub fn psi_poker_winner(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> GameResult {
  // Simplified: for 2-player, best predictor wins
  // In full implementation, would parse target for card values
  // and score each player's predictions
  when guesses is {
    [] -> NoWinner
    [single] -> Winner(single.pkh)
    [first, second, ..] -> {
      // Compare prediction accuracy
      let first_score = calculate_poker_score(target, first)
      let second_score = calculate_poker_score(target, second)
      if first_score > second_score {
        Winner(first.pkh)
      } else if second_score > first_score {
        Winner(second.pkh)
      } else {
        Draw
      }
    }
  }
}

/// Calculate poker prediction score (simplified)
fn calculate_poker_score(target: ByteArray, guess: ParticipantGuess) -> Int {
  when guess.guess_value is {
    Some(value) ->
      if value == target {
        100
      } else {
        0
      }
    None -> 0
  }
}

// ============================================================================
// RETROCAUSALITY
// ============================================================================

/// Retro roulette correlation evaluation
/// Checks if participant's "influence" correlates with pre-determined outcome
pub fn retro_correlation_winner(
  target: ByteArray,
  guesses: List<ParticipantGuess>,
) -> GameResult {
  // For retrocausality, we check if the participant's intention
  // correlates with the pre-generated (already fixed) target
  // This is philosophically different but mechanically the same as exact match
  exact_match_winner(target, guesses)
}

// ============================================================================
// SCORED SETTLEMENT (for AI-evaluated experiments)
// ============================================================================

/// Determine winner for scored experiments based on AI score
/// score: 0-100 similarity score from AI evaluation
/// threshold: minimum score to be considered a "hit"
pub fn settle_scored_experiment(
  score: Int,
  participant_pkh: Option<VerificationKeyHash>,
  threshold: Int,
) -> GameResult {
  when participant_pkh is {
    Some(pkh) ->
      if score >= threshold {
        Winner(pkh)
      } else {
        NoWinner
      }
    None -> NoWinner
  }
}

/// Default threshold for different scored experiment types
pub fn get_score_threshold(game_type: GameType) -> Int {
  when game_type is {
    RemoteViewing -> 50
    // 50% similarity
    EmotionEcho -> 60
    // 60% confidence
    PatternOracle -> 40
    // 40% pattern match
    Telepathy -> 40
    // 40% Psi-Coefficient threshold
    _ -> 50
  }
  // Default
}

// ============================================================================
// EFFECT SIZE CALCULATION (for research metrics)
// ============================================================================

/// Calculate z-score for observed hit rate vs expected
/// hits: number of correct predictions
/// trials: total number of trials
/// baseline_pct: expected hit rate as percentage (e.g., 25 for 25%)
/// Returns z-score * 100 (to avoid decimals)
pub fn calculate_z_score_x100(hits: Int, trials: Int, baseline_pct: Int) -> Int {
  if trials == 0 {
    0
  } else {
    // z = (observed - expected) / sqrt(expected * (1 - p))
    // Simplified for integer math:
    // observed_pct = hits * 100 / trials
    // expected_pct = baseline_pct
    // Standard deviation for binomial ~= sqrt(n * p * (1-p))
    // We approximate and scale by 100

    let observed_x100 = hits * 10000 / trials
    let expected_x100 = baseline_pct * 100
    let diff_x100 = observed_x100 - expected_x100

    // Approximate standard error scaled by 100
    // SE = sqrt(p * (1-p) / n) * 100
    // For p=0.25, n=100: SE ~= 4.3%, so SE*100 = 430
    let se_x100 = calculate_se_x100(trials, baseline_pct)

    if se_x100 == 0 {
      0
    } else {
      diff_x100 * 100 / se_x100
    }
  }
}

/// Calculate standard error * 100 for binomial proportion
fn calculate_se_x100(trials: Int, baseline_pct: Int) -> Int {
  // SE = sqrt(p * (1-p) / n)
  // For integer math, we use lookup table for common baselines
  // Values are SE * 100 * sqrt(n)
  let p_factor =
    when baseline_pct is {
      25 -> 433
      // sqrt(0.25 * 0.75) * 1000
      50 -> 500
      // sqrt(0.50 * 0.50) * 1000
      17 -> 376
      // sqrt(0.17 * 0.83) * 1000 (dice)
      13 -> 336
      // sqrt(0.125 * 0.875) * 1000 (8-way)
      _ -> 500
    }

  // Default to 50%
  // SE * 100 = p_factor / sqrt(n)
  // Approximate sqrt using integer math
  p_factor * 10 / int_sqrt(trials)
}

/// Integer square root approximation
fn int_sqrt(n: Int) -> Int {
  if n <= 0 {
    1
  } else if n < 4 {
    1
  } else if n < 9 {
    2
  } else if n < 16 {
    3
  } else if n < 25 {
    4
  } else if n < 36 {
    5
  } else if n < 49 {
    6
  } else if n < 64 {
    7
  } else if n < 81 {
    8
  } else if n < 100 {
    9
  } else if n < 121 {
    10
  } else {
    // Recursive for larger numbers
    10 + int_sqrt(n / 100)
  }
}

// ============================================================================
// TESTS
// ============================================================================

test exact_match_found() {
  let target = "hearts"
  let guesses =
    [
      ParticipantGuess {
        pkh: #"aabb",
        guess_hash: #"0000",
        guess_value: Some("hearts"),
        timestamp_slot: 100,
      },
    ]
  when determine_winner(CardPrediction, target, guesses) is {
    Winner(pkh) -> pkh == #"aabb"
    _ -> False
  }
}

test exact_match_not_found() {
  let target = "hearts"
  let guesses =
    [
      ParticipantGuess {
        pkh: #"aabb",
        guess_hash: #"0000",
        guess_value: Some("spades"),
        timestamp_slot: 100,
      },
    ]
  when determine_winner(CardPrediction, target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test scored_experiment_returns_scored_settlement() {
  let target = "image_data"
  let guesses =
    [
      ParticipantGuess {
        pkh: #"aabb",
        guess_hash: #"0000",
        guess_value: Some("description"),
        timestamp_slot: 100,
      },
    ]
  when determine_winner(RemoteViewing, target, guesses) is {
    ScoredSettlement -> True
    _ -> False
  }
}

test score_threshold_remote_viewing() {
  get_score_threshold(RemoteViewing) == 50
}

test score_threshold_emotion_echo() {
  get_score_threshold(EmotionEcho) == 60
}

test int_sqrt_values() {
  int_sqrt(4) == 2 && int_sqrt(9) == 3 && int_sqrt(100) == 10
}
