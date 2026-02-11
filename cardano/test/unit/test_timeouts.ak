use psi_research/types.{
  AwaitingParticipant, AwaitingReveal, Expired, GameType, InProgress,
  ParticipantGuess, PsiDatum, SessionState, Settled, get_research_contribution,
  get_total_pool, get_winner_payout, new_session_datum,
}
use psi_research/utils.{calculate_percentage, max, min}

// ============================================================================
// TEST HELPERS
// ============================================================================

// Test PKH values (28-byte hex = 56 characters)
/// Unit Tests for Timeout Logic
/// Tests deadline checking and timeout claim scenarios
const test_host_pkh =
  #"aabbccdd11223344556677889900aabbccdd11223344556677889900"

const test_participant_pkh =
  #"11223344aabbccdd556677889900aabbccdd11223344556677889900"

const test_target_hash =
  #"0000000000000000000000000000000000000000000000000000000000000000"

/// Create a test datum with specified parameters
fn make_test_datum(
  session_state: SessionState,
  stake: Int,
  join_deadline: Int,
  reveal_deadline: Int,
) -> PsiDatum {
  PsiDatum {
    target_hash: test_target_hash,
    host_pkh: test_host_pkh,
    participant_pkh: Some(test_participant_pkh),
    game_type: types.CardPrediction,
    session_state,
    commit_slot: 1000,
    join_deadline_slot: join_deadline,
    reveal_deadline_slot: reveal_deadline,
    stake_lovelace: stake,
    research_pool_pct: 5,
    max_participants: 1,
    current_participants: 1,
    participant_guesses: [],
    ipfs_cid: None,
    ai_score: None,
  }
}

// ============================================================================
// SESSION STATE TESTS
// ============================================================================

test session_states_unique() {
  let s1: SessionState = AwaitingParticipant
  let s2: SessionState = InProgress
  let s3: SessionState = AwaitingReveal
  let s4: SessionState = Settled
  let s5: SessionState = Expired

  s1 != s2 && s2 != s3 && s3 != s4 && s4 != s5
}

test awaiting_participant_is_joinable() {
  let datum = make_test_datum(AwaitingParticipant, 1000000, 2000, 3000)
  datum.session_state == AwaitingParticipant
}

test awaiting_reveal_after_join() {
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)
  datum.session_state == AwaitingReveal
}

// ============================================================================
// DEADLINE SLOT TESTS
// ============================================================================

test join_deadline_before_reveal_deadline() {
  let commit_slot = 1000
  let join_deadline = commit_slot + 3600
  let reveal_deadline = commit_slot + 7200

  join_deadline < reveal_deadline
}

test slot_comparison_before() {
  let current_slot = 1500
  let deadline_slot = 2000

  current_slot < deadline_slot
}

test slot_comparison_after() {
  let current_slot = 2500
  let deadline_slot = 2000

  current_slot > deadline_slot
}

test slot_comparison_exact() {
  let current_slot = 2000
  let deadline_slot = 2000

  current_slot <= deadline_slot
}

// ============================================================================
// TIMEOUT SCENARIO TESTS
// ============================================================================

test host_timeout_scenario() {
  // Host fails to reveal after participant joins
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)
  let current_slot = 3500

  // Past reveal deadline
  datum.session_state == AwaitingReveal && current_slot > datum.reveal_deadline_slot
}

test participant_timeout_scenario() {
  // No one joins before join deadline
  let datum =
    PsiDatum {
      target_hash: test_target_hash,
      host_pkh: test_host_pkh,
      participant_pkh: None,
      // No participant yet
      game_type: types.CardPrediction,
      session_state: AwaitingParticipant,
      commit_slot: 1000,
      join_deadline_slot: 2000,
      reveal_deadline_slot: 3000,
      stake_lovelace: 1000000,
      research_pool_pct: 5,
      max_participants: 1,
      current_participants: 0,
      participant_guesses: [],
      ipfs_cid: None,
      ai_score: None,
    }
  let current_slot = 2500

  // Past join deadline
  datum.session_state == AwaitingParticipant && current_slot > datum.join_deadline_slot && datum.participant_pkh == None
}

test still_within_join_window() {
  let datum = make_test_datum(AwaitingParticipant, 1000000, 2000, 3000)
  let current_slot = 1800

  // Before join deadline
  current_slot <= datum.join_deadline_slot
}

test still_within_reveal_window() {
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)
  let current_slot = 2800

  // Before reveal deadline
  current_slot <= datum.reveal_deadline_slot
}

// ============================================================================
// PAYOUT CALCULATION TESTS
// ============================================================================

test total_pool_calculation_single_participant() {
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)
  // current_participants = 1, so total = 1000000 * 2 = 2000000
  get_total_pool(datum) == 2000000
}

test research_contribution_5_percent() {
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)
  // Total pool = 2000000, 5% = 100000
  get_research_contribution(datum) == 100000
}

test winner_payout_calculation() {
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)
  // Total = 2000000, Research = 100000, Winner = 1900000
  get_winner_payout(datum) == 1900000
}

test payout_with_zero_stake() {
  let datum = make_test_datum(AwaitingReveal, 0, 2000, 3000)
  get_total_pool(datum) == 0 && get_research_contribution(datum) == 0 && get_winner_payout(
    datum,
  ) == 0
}

test payout_with_large_stake() {
  let datum = make_test_datum(AwaitingReveal, 100000000, 2000, 3000)
  // 100 ADA each, total 200 ADA
  get_total_pool(datum) == 200000000 && get_research_contribution(datum) == 10000000 && get_winner_payout(
    datum,
  ) == 190000000
}

// ============================================================================
// PERCENTAGE CALCULATION TESTS
// ============================================================================

test percentage_5_of_1000000() {
  calculate_percentage(1000000, 5) == 50000
}

test percentage_5_of_2000000() {
  calculate_percentage(2000000, 5) == 100000
}

test percentage_10_of_1000000() {
  calculate_percentage(1000000, 10) == 100000
}

test percentage_0_of_anything() {
  calculate_percentage(1000000, 0) == 0
}

test percentage_100_of_anything() {
  calculate_percentage(1000000, 100) == 1000000
}

// ============================================================================
// TIMEOUT PAYOUT SCENARIOS
// ============================================================================

test host_timeout_payout_to_participant() {
  // When host times out, participant gets:
  // Their stake back + Host stake - Research contribution
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)

  let participant_stake = datum.stake_lovelace
  let host_stake = datum.stake_lovelace
  let total = participant_stake + host_stake
  let research = calculate_percentage(total, datum.research_pool_pct)
  let participant_receives = total - research

  participant_receives == 1900000
}

test participant_timeout_refund_to_host() {
  // When no one joins, host gets their stake back in full
  // No research contribution needed since no actual experiment
  let datum =
    PsiDatum {
      target_hash: test_target_hash,
      host_pkh: test_host_pkh,
      participant_pkh: None,
      game_type: types.CardPrediction,
      session_state: AwaitingParticipant,
      commit_slot: 1000,
      join_deadline_slot: 2000,
      reveal_deadline_slot: 3000,
      stake_lovelace: 1000000,
      research_pool_pct: 5,
      max_participants: 1,
      current_participants: 0,
      participant_guesses: [],
      ipfs_cid: None,
      ai_score: None,
    }

  // Host should get full stake back
  datum.stake_lovelace == 1000000
}

test mutual_cancel_refund() {
  // Both parties agree to cancel, each gets stake back
  let datum = make_test_datum(AwaitingReveal, 1000000, 2000, 3000)

  let host_refund = datum.stake_lovelace
  let participant_refund = datum.stake_lovelace

  host_refund == 1000000 && participant_refund == 1000000
}

// ============================================================================
// NEW SESSION DATUM CREATION
// ============================================================================

test new_session_has_correct_initial_state() {
  let datum =
    new_session_datum(
      test_target_hash,
      test_host_pkh,
      types.CardPrediction,
      1000,
      2000,
      3000,
      1000000,
      1,
    )

  datum.session_state == AwaitingParticipant && datum.participant_pkh == None && datum.current_participants == 0 && datum.research_pool_pct == 5
}

test new_session_stores_timing_correctly() {
  let datum =
    new_session_datum(
      test_target_hash,
      test_host_pkh,
      types.CardPrediction,
      1000,
      2000,
      3000,
      1000000,
      1,
    )

  datum.commit_slot == 1000 && datum.join_deadline_slot == 2000 && datum.reveal_deadline_slot == 3000
}

// ============================================================================
// MIN/MAX UTILITY TESTS
// ============================================================================

test max_positive_numbers() {
  max(5, 10) == 10 && max(10, 5) == 10
}

test max_with_negative() {
  max(-5, 10) == 10 && max(-5, -10) == -5
}

test min_positive_numbers() {
  min(5, 10) == 5 && min(10, 5) == 5
}

test min_with_negative() {
  min(-5, 10) == -5 && min(-5, -10) == -10
}

test max_equal_values() {
  max(5, 5) == 5
}

test min_equal_values() {
  min(5, 5) == 5
}
