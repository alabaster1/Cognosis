use psi_research/games.{
  GameResult, NoWinner, ScoredSettlement, SharedWin, Winner,
  calculate_z_score_x100, consciousness_result, determine_winner,
  exact_match_winner, get_score_threshold, settle_scored_experiment,
}
use psi_research/types.{
  CardPrediction, CoinFlip, DiceInfluence, EmotionEcho, GlobalConsciousness,
  MindPulse, ParticipantGuess, PatternOracle, PsiPoker, QuantumCoinArena,
  RemoteViewing, RetroRoulette, SynchronicityBingo, TimelineRacer,
}

// ============================================================================
// TEST HELPERS
// ============================================================================

// Test PKH values (28-byte hex = 56 characters)
/// Unit Tests for Game Scoring Logic
/// Tests winner determination for all game types
const pkh_player1 = #"aabbccdd11223344556677889900aabbccdd11223344556677889900"

const pkh_player2 = #"11223344aabbccdd556677889900aabbccdd11223344556677889900"

const pkh_player3 = #"55667788aabbccdd11223344990099887766554433221100aabbccdd"

const pkh_viewer = #"99887766554433221100aabbccdd55667788990011223344556677"

const pkh_empath = #"1122334455667788990011223344556677889900aabbccddeeff00"

const pkh_oracle = #"ffeeddccbbaa99887766554433221100ffeeddccbbaa998877665544"

const pkh_roller = #"00112233445566778899aabbccddeeff00112233445566778899aabb"

const pkh_racer = #"aabb00112233445566778899ccddeeff00112233445566778899aabb"

const pkh_flipper = #"ccddeeff00112233445566778899aabb00112233445566778899aabb"

const pkh_influencer =
  #"ddeeffaabb00112233445566778899aabb00112233445566778899cc"

const zero_hash =
  #"0000000000000000000000000000000000000000000000000000000000000000"

/// Create a test participant guess
fn make_guess(
  pkh: ByteArray,
  guess_value: Option<ByteArray>,
) -> ParticipantGuess {
  ParticipantGuess {
    pkh,
    guess_hash: zero_hash,
    guess_value,
    timestamp_slot: 100,
  }
}

// ============================================================================
// EXACT MATCH GAMES (Card Prediction, Coin Flip, etc.)
// ============================================================================

test card_prediction_correct_guess() {
  let target = "hearts"
  let guesses = [make_guess(pkh_player1, Some("hearts"))]

  when determine_winner(CardPrediction, target, guesses) is {
    Winner(pkh) -> pkh == pkh_player1
    _ -> False
  }
}

test card_prediction_wrong_guess() {
  let target = "hearts"
  let guesses = [make_guess(pkh_player1, Some("spades"))]

  when determine_winner(CardPrediction, target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test coin_flip_heads_correct() {
  let target = "heads"
  let guesses = [make_guess(pkh_flipper, Some("heads"))]

  when determine_winner(CoinFlip, target, guesses) is {
    Winner(pkh) -> pkh == pkh_flipper
    _ -> False
  }
}

test coin_flip_heads_wrong() {
  let target = "heads"
  let guesses = [make_guess(pkh_flipper, Some("tails"))]

  when determine_winner(CoinFlip, target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test dice_influence_exact_match() {
  let target = "4"
  let guesses = [make_guess(pkh_roller, Some("4"))]

  when determine_winner(DiceInfluence, target, guesses) is {
    Winner(pkh) -> pkh == pkh_roller
    _ -> False
  }
}

test dice_influence_no_match() {
  let target = "4"
  let guesses = [make_guess(pkh_roller, Some("3"))]

  when determine_winner(DiceInfluence, target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test timeline_racer_correct() {
  let target = "image_c"
  let guesses = [make_guess(pkh_racer, Some("image_c"))]

  when determine_winner(TimelineRacer, target, guesses) is {
    Winner(pkh) -> pkh == pkh_racer
    _ -> False
  }
}

// ============================================================================
// MULTIPLE PARTICIPANT GAMES
// ============================================================================

test multiple_participants_first_correct() {
  let target = "hearts"
  let guesses =
    [
      make_guess(pkh_player1, Some("hearts")),
      make_guess(pkh_player2, Some("spades")),
      make_guess(pkh_player3, Some("diamonds")),
    ]

  when exact_match_winner(target, guesses) is {
    Winner(pkh) -> pkh == pkh_player1
    _ -> False
  }
}

test multiple_participants_middle_correct() {
  let target = "hearts"
  let guesses =
    [
      make_guess(pkh_player1, Some("spades")),
      make_guess(pkh_player2, Some("hearts")),
      make_guess(pkh_player3, Some("diamonds")),
    ]

  when exact_match_winner(target, guesses) is {
    Winner(pkh) -> pkh == pkh_player2
    _ -> False
  }
}

test multiple_participants_none_correct() {
  let target = "hearts"
  let guesses =
    [
      make_guess(pkh_player1, Some("spades")),
      make_guess(pkh_player2, Some("diamonds")),
      make_guess(pkh_player3, Some("clubs")),
    ]

  when exact_match_winner(target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

// ============================================================================
// SCORED EXPERIMENTS
// ============================================================================

test remote_viewing_returns_scored_settlement() {
  let target = "image_data"
  let guesses = [make_guess(pkh_viewer, Some("description"))]

  when determine_winner(RemoteViewing, target, guesses) is {
    ScoredSettlement -> True
    _ -> False
  }
}

test emotion_echo_returns_scored_settlement() {
  let target = "joy_embedded_art"
  let guesses = [make_guess(pkh_empath, Some("joy"))]

  when determine_winner(EmotionEcho, target, guesses) is {
    ScoredSettlement -> True
    _ -> False
  }
}

test pattern_oracle_returns_scored_settlement() {
  let target = "hidden_pattern"
  let guesses = [make_guess(pkh_oracle, Some("pattern_guess"))]

  when determine_winner(PatternOracle, target, guesses) is {
    ScoredSettlement -> True
    _ -> False
  }
}

test settle_scored_above_threshold() {
  let score = 60
  let participant = Some(pkh_viewer)
  let threshold = 50

  when settle_scored_experiment(score, participant, threshold) is {
    Winner(pkh) -> pkh == pkh_viewer
    _ -> False
  }
}

test settle_scored_below_threshold() {
  let score = 40
  let participant = Some(pkh_viewer)
  let threshold = 50

  when settle_scored_experiment(score, participant, threshold) is {
    NoWinner -> True
    _ -> False
  }
}

test settle_scored_exact_threshold() {
  let score = 50
  let participant = Some(pkh_viewer)
  let threshold = 50

  when settle_scored_experiment(score, participant, threshold) is {
    Winner(pkh) -> pkh == pkh_viewer
    _ -> False
  }
}

test score_thresholds() {
  get_score_threshold(RemoteViewing) == 50 && get_score_threshold(EmotionEcho) == 60 && get_score_threshold(
    PatternOracle,
  ) == 40
}

// ============================================================================
// CONSCIOUSNESS EXPERIMENTS
// ============================================================================

test mind_pulse_consensus_reached() {
  let target = "red"
  // 5 out of 8 matched (62.5% > 40% threshold)
  let guesses =
    [
      make_guess(
        #"0101010101010101010101010101010101010101010101010101010101010101",
        Some("red"),
      ),
      make_guess(
        #"0202020202020202020202020202020202020202020202020202020202020202",
        Some("red"),
      ),
      make_guess(
        #"0303030303030303030303030303030303030303030303030303030303030303",
        Some("red"),
      ),
      make_guess(
        #"0404040404040404040404040404040404040404040404040404040404040404",
        Some("red"),
      ),
      make_guess(
        #"0505050505050505050505050505050505050505050505050505050505050505",
        Some("red"),
      ),
      make_guess(
        #"0606060606060606060606060606060606060606060606060606060606060606",
        Some("blue"),
      ),
      make_guess(
        #"0707070707070707070707070707070707070707070707070707070707070707",
        Some("green"),
      ),
      make_guess(
        #"0808080808080808080808080808080808080808080808080808080808080808",
        Some("yellow"),
      ),
    ]

  when consciousness_result(target, guesses) is {
    SharedWin(_winners) -> True
    _ -> False
  }
}

test mind_pulse_no_consensus() {
  let target = "red"
  // Only 2 out of 8 matched (25% < 40% threshold)
  let guesses =
    [
      make_guess(
        #"0101010101010101010101010101010101010101010101010101010101010101",
        Some("red"),
      ),
      make_guess(
        #"0202020202020202020202020202020202020202020202020202020202020202",
        Some("red"),
      ),
      make_guess(
        #"0303030303030303030303030303030303030303030303030303030303030303",
        Some("blue"),
      ),
      make_guess(
        #"0404040404040404040404040404040404040404040404040404040404040404",
        Some("blue"),
      ),
      make_guess(
        #"0505050505050505050505050505050505050505050505050505050505050505",
        Some("green"),
      ),
      make_guess(
        #"0606060606060606060606060606060606060606060606060606060606060606",
        Some("green"),
      ),
      make_guess(
        #"0707070707070707070707070707070707070707070707070707070707070707",
        Some("yellow"),
      ),
      make_guess(
        #"0808080808080808080808080808080808080808080808080808080808080808",
        Some("yellow"),
      ),
    ]

  when consciousness_result(target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test global_consciousness_routes_to_consciousness_result() {
  let target = "collective_focus"
  let guesses =
    [
      make_guess(pkh_player1, Some("collective_focus")),
      make_guess(pkh_player2, Some("collective_focus")),
    ]

  when determine_winner(GlobalConsciousness, target, guesses) is {
    SharedWin(_) -> True
    NoWinner -> True
    // Either outcome is valid
    _ -> False
  }
}

// ============================================================================
// SPECIAL GAME TYPES
// ============================================================================

test synchronicity_bingo_no_winner() {
  let target = "sync_event"
  let guesses = [make_guess(pkh_player1, Some("sync_event"))]

  when determine_winner(SynchronicityBingo, target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test retro_roulette_match() {
  let target = "predetermined_outcome"
  let guesses = [make_guess(pkh_influencer, Some("predetermined_outcome"))]

  when determine_winner(RetroRoulette, target, guesses) is {
    Winner(pkh) -> pkh == pkh_influencer
    _ -> False
  }
}

// ============================================================================
// Z-SCORE CALCULATION TESTS
// ============================================================================

test z_score_at_baseline() {
  // 25 hits out of 100 at 25% baseline should give z ~= 0
  let z = calculate_z_score_x100(25, 100, 25)
  // Z-score should be near 0 (within reasonable range)
  z > -50 && z < 50
}

test z_score_above_baseline() {
  // 35 hits out of 100 at 25% baseline should give positive z
  let z = calculate_z_score_x100(35, 100, 25)
  z > 100
}

// Significantly positive

test z_score_below_baseline() {
  // 15 hits out of 100 at 25% baseline should give negative z
  let z = calculate_z_score_x100(15, 100, 25)
  z < -100
}

// Significantly negative

test z_score_zero_trials() {
  // Zero trials should return 0
  let z = calculate_z_score_x100(0, 0, 25)
  z == 0
}

test z_score_perfect_accuracy() {
  // 100 hits out of 100 at 50% baseline
  let z = calculate_z_score_x100(100, 100, 50)
  z > 500
}

// Very significantly positive

// ============================================================================
// EMPTY AND EDGE CASES
// ============================================================================

test empty_guesses_list() {
  let target = "hearts"
  let guesses: List<ParticipantGuess> = []

  when exact_match_winner(target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test guess_with_none_value() {
  let target = "hearts"
  let guesses = [make_guess(pkh_player1, None)]

  when exact_match_winner(target, guesses) is {
    NoWinner -> True
    _ -> False
  }
}

test mixed_none_and_some_guesses() {
  let target = "hearts"
  let guesses =
    [
      make_guess(pkh_player1, None),
      make_guess(pkh_player2, Some("hearts")),
      make_guess(pkh_player3, None),
    ]

  when exact_match_winner(target, guesses) is {
    Winner(pkh) -> pkh == pkh_player2
    _ -> False
  }
}
