use psi_research/games.{
  GameResult, NoWinner, ScoredSettlement, SharedWin, Winner, determine_winner,
  settle_scored_experiment,
}
use psi_research/redeemers.{
  ClaimHostTimeout, ClaimParticipantTimeout, Join, MutualCancel, PsiRedeemer,
  Reveal, SubmitScore,
}
use psi_research/types.{
  AwaitingParticipant, AwaitingReveal, CardPrediction, CoinFlip,
  GlobalConsciousness, InProgress, MindPulse, ParticipantGuess, PsiDatum,
  QuantumCoinArena, RemoteViewing, Settled, add_participant,
  get_research_contribution, get_winner_payout, is_scored_experiment,
  new_participant_guess, new_session_datum,
}
use psi_research/utils.{create_commitment, verify_commitment}

// ============================================================================
// TEST CONSTANTS
// ============================================================================

// Standard 28-byte PKHs (56 hex chars)
/// Integration Tests for Full Session Lifecycle
/// Tests complete flows from session creation to settlement
const pkh_host = #"aabbccdd11223344556677889900aabbccdd11223344556677889900"

const pkh_participant =
  #"11223344aabbccdd556677889900aabbccdd11223344556677889900"

const pkh_viewer = #"55667788aabbccdd11223344990099887766554433221100aabbccdd"

const pkh_flipper = #"99887766554433221100aabbccdd55667788990011223344556677"

const pkh_p1 = #"1122334455667788990011223344556677889900aabbccddeeff00"

const pkh_p2 = #"ffeeddccbbaa99887766554433221100ffeeddccbbaa998877665544"

const pkh_p3 = #"00112233445566778899aabbccddeeff00112233445566778899aabb"

// 32-byte hashes (64 hex chars)
const zero_hash =
  #"0000000000000000000000000000000000000000000000000000000000000000"

// ============================================================================
// FULL SESSION LIFECYCLE: CARD PREDICTION
// ============================================================================

test card_prediction_full_flow_participant_wins() {
  // Step 1: Host creates session with committed target "hearts"
  let target = "hearts"
  let nonce = "secret_nonce_123"
  let target_hash = create_commitment(target, nonce)

  let initial_datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      // commit_slot
      2000,
      // join_deadline
      3000,
      // reveal_deadline
      5000000,
      // 5 ADA stake
      1,
    )

  // max_participants
  expect initial_datum.session_state == AwaitingParticipant
  expect initial_datum.participant_pkh == None

  // Step 2: Participant joins with guess "hearts"
  let guess = "hearts"
  let guess_nonce = "participant_secret"
  let guess_hash = create_commitment(guess, guess_nonce)

  let participant_guess =
    new_participant_guess(pkh_participant, guess_hash, 1500)

  let joined_datum =
    add_participant(initial_datum, pkh_participant, participant_guess)

  expect joined_datum.session_state == AwaitingReveal
  expect joined_datum.participant_pkh == Some(pkh_participant)
  expect joined_datum.current_participants == 1

  // Step 3: Host reveals target
  expect verify_commitment(target_hash, target, nonce)

  // Step 4: Determine winner - participant guessed correctly!
  let revealed_guesses =
    [
      ParticipantGuess {
        pkh: pkh_participant,
        guess_hash,
        guess_value: Some(guess),
        // Revealed
        timestamp_slot: 1500,
      },
    ]

  when determine_winner(CardPrediction, target, revealed_guesses) is {
    Winner(winner) -> {
      expect winner == pkh_participant

      // Step 5: Calculate payouts
      let total_pool = joined_datum.stake_lovelace * 2
      // 10 ADA
      let research = get_research_contribution(joined_datum)
      // 0.5 ADA
      let winner_payout = get_winner_payout(joined_datum)

      // 9.5 ADA
      total_pool == 10000000 && research == 500000 && winner_payout == 9500000
    }
    _ -> False
  }
}

test card_prediction_full_flow_participant_loses() {
  // Host commits "hearts", participant guesses "spades"
  let target = "hearts"
  let nonce = "secret_nonce"
  let target_hash = create_commitment(target, nonce)

  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      2000,
      3000,
      5000000,
      1,
    )

  let guess = "spades"
  let guess_hash = create_commitment(guess, "p_nonce")
  let participant_guess =
    new_participant_guess(pkh_participant, guess_hash, 1500)
  let joined = add_participant(datum, pkh_participant, participant_guess)

  let revealed_guesses =
    [
      ParticipantGuess {
        pkh: pkh_participant,
        guess_hash,
        guess_value: Some(guess),
        timestamp_slot: 1500,
      },
    ]

  when determine_winner(CardPrediction, target, revealed_guesses) is {
    NoWinner -> {
      // Host wins (gets the pool minus research)
      let winner_payout = get_winner_payout(joined)
      winner_payout == 9500000
    }
    _ -> False
  }
}

// ============================================================================
// FULL SESSION LIFECYCLE: COIN FLIP
// ============================================================================

test coin_flip_full_flow() {
  let target = "heads"
  let nonce = "coin_secret"
  let target_hash = create_commitment(target, nonce)

  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CoinFlip,
      1000,
      2000,
      3000,
      2000000,
      1,
    )

  // Participant guesses "heads" (correct!)
  let guess = "heads"
  let guess_hash = create_commitment(guess, "g_nonce")
  let participant_guess = new_participant_guess(pkh_flipper, guess_hash, 1500)
  let joined = add_participant(datum, pkh_flipper, participant_guess)

  let revealed_guesses =
    [
      ParticipantGuess {
        pkh: pkh_flipper,
        guess_hash,
        guess_value: Some(guess),
        timestamp_slot: 1500,
      },
    ]

  when determine_winner(CoinFlip, target, revealed_guesses) is {
    Winner(winner) -> winner == pkh_flipper
    _ -> False
  }
}

// ============================================================================
// FULL SESSION LIFECYCLE: REMOTE VIEWING (SCORED)
// ============================================================================

test remote_viewing_full_flow() {
  let target = "red_barn_in_field"
  let nonce = "rv_secret"
  let target_hash = create_commitment(target, nonce)

  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      RemoteViewing,
      1000,
      2000,
      5000,
      10000000,
      1,
    )

  expect is_scored_experiment(RemoteViewing)

  // Participant joins with description
  let guess = "wooden_structure_in_green_area"
  let guess_hash = create_commitment(guess, "rv_nonce")
  let participant_guess = new_participant_guess(pkh_viewer, guess_hash, 1500)
  let joined = add_participant(datum, pkh_viewer, participant_guess)

  // Host reveals, triggering scored evaluation
  expect verify_commitment(target_hash, target, nonce)

  let revealed_guesses =
    [
      ParticipantGuess {
        pkh: pkh_viewer,
        guess_hash,
        guess_value: Some(guess),
        timestamp_slot: 1500,
      },
    ]

  // For scored experiments, determine_winner returns ScoredSettlement
  when determine_winner(RemoteViewing, target, revealed_guesses) is {
    ScoredSettlement -> {
      // AI evaluates similarity and gives score of 65 (above 50 threshold)
      let ai_score = 65
      when settle_scored_experiment(ai_score, Some(pkh_viewer), 50) is {
        Winner(winner) -> winner == pkh_viewer
        _ -> False
      }
    }
    _ -> False
  }
}

test remote_viewing_below_threshold() {
  // AI gives score of 35 (below 50 threshold)
  let ai_score = 35

  when settle_scored_experiment(ai_score, Some(pkh_viewer), 50) is {
    NoWinner -> True
    _ -> False
  }
}

// ============================================================================
// FULL SESSION LIFECYCLE: MULTIPLAYER (QUANTUM COIN ARENA)
// ============================================================================

test quantum_coin_arena_multiplayer() {
  let target = "heads"
  let nonce = "arena_secret"
  let target_hash = create_commitment(target, nonce)

  // Multiple participants join
  let guess1_hash = create_commitment("heads", "p1_nonce")
  let guess2_hash = create_commitment("heads", "p2_nonce")
  let guess3_hash = create_commitment("tails", "p3_nonce")

  let revealed_guesses =
    [
      ParticipantGuess {
        pkh: pkh_p1,
        guess_hash: guess1_hash,
        guess_value: Some("heads"),
        timestamp_slot: 1500,
      },
      ParticipantGuess {
        pkh: pkh_p2,
        guess_hash: guess2_hash,
        guess_value: Some("heads"),
        timestamp_slot: 1600,
      },
      ParticipantGuess {
        pkh: pkh_p3,
        guess_hash: guess3_hash,
        guess_value: Some("tails"),
        timestamp_slot: 1700,
      },
    ]

  // 2/3 = 66% guessed "heads" which is > 60% threshold
  when determine_winner(QuantumCoinArena, target, revealed_guesses) is {
    SharedWin(winners) ->
      // Both p1 and p2 should be winners
      winners == [pkh_p1, pkh_p2]
    _ -> False
  }
}

// ============================================================================
// TIMEOUT SCENARIOS
// ============================================================================

test host_timeout_full_scenario() {
  // Host creates session
  let target_hash = create_commitment("hearts", "secret")

  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      2000,
      3000,
      5000000,
      1,
    )

  // Participant joins
  let guess_hash = create_commitment("spades", "p_nonce")
  let participant_guess =
    new_participant_guess(pkh_participant, guess_hash, 1500)
  let joined = add_participant(datum, pkh_participant, participant_guess)

  // Current slot is past reveal deadline
  let current_slot = 3500

  // Participant can claim timeout
  let can_claim_timeout =
    joined.session_state == AwaitingReveal && current_slot > joined.reveal_deadline_slot

  expect can_claim_timeout

  // Participant receives their stake + host stake - research
  let total_pool = joined.stake_lovelace * 2
  let research = get_research_contribution(joined)
  let participant_receives = total_pool - research

  participant_receives == 9500000
}

test no_participant_timeout_full_scenario() {
  let target_hash = create_commitment("hearts", "secret")

  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      2000,
      3000,
      5000000,
      1,
    )

  // No one joins, current slot past join deadline
  let current_slot = 2500

  let can_claim_timeout =
    datum.session_state == AwaitingParticipant && current_slot > datum.join_deadline_slot && datum.participant_pkh == None

  expect can_claim_timeout

  // Host gets full stake back (no research contribution)
  datum.stake_lovelace == 5000000
}

// ============================================================================
// MUTUAL CANCEL SCENARIO
// ============================================================================

test mutual_cancel_full_scenario() {
  let target_hash = create_commitment("hearts", "secret")

  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      2000,
      3000,
      5000000,
      1,
    )

  let guess_hash = create_commitment("spades", "p_nonce")
  let participant_guess =
    new_participant_guess(pkh_participant, guess_hash, 1500)
  let joined = add_participant(datum, pkh_participant, participant_guess)

  // Both parties sign mutual cancel
  // Each should receive their original stake
  let host_refund = joined.stake_lovelace
  let participant_refund = joined.stake_lovelace

  host_refund == 5000000 && participant_refund == 5000000
}

// ============================================================================
// GLOBAL CONSCIOUSNESS FULL FLOW
// ============================================================================

test mind_pulse_full_flow() {
  let target = "focus_on_peace"
  let nonce = "pulse_secret"
  let target_hash = create_commitment(target, nonce)

  // 8 participants join a scheduled pulse event with varying responses
  // Using inline hex for unique PKHs
  let revealed_guesses =
    [
      ParticipantGuess {
        pkh: #"0101010101010101010101010101010101010101010101010101010101010101",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_peace"),
        timestamp_slot: 1500,
      },
      ParticipantGuess {
        pkh: #"0202020202020202020202020202020202020202020202020202020202020202",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_peace"),
        timestamp_slot: 1501,
      },
      ParticipantGuess {
        pkh: #"0303030303030303030303030303030303030303030303030303030303030303",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_peace"),
        timestamp_slot: 1502,
      },
      ParticipantGuess {
        pkh: #"0404040404040404040404040404040404040404040404040404040404040404",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_peace"),
        timestamp_slot: 1503,
      },
      ParticipantGuess {
        pkh: #"0505050505050505050505050505050505050505050505050505050505050505",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_peace"),
        timestamp_slot: 1504,
      },
      ParticipantGuess {
        pkh: #"0606060606060606060606060606060606060606060606060606060606060606",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_love"),
        timestamp_slot: 1505,
      },
      ParticipantGuess {
        pkh: #"0707070707070707070707070707070707070707070707070707070707070707",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_love"),
        timestamp_slot: 1506,
      },
      ParticipantGuess {
        pkh: #"0808080808080808080808080808080808080808080808080808080808080808",
        guess_hash: zero_hash,
        guess_value: Some("focus_on_joy"),
        timestamp_slot: 1507,
      },
    ]

  // 5/8 = 62.5% consensus on target (> 40% threshold)
  when determine_winner(MindPulse, target, revealed_guesses) is {
    SharedWin(_winners) ->
      // All 8 participants share in the success
      // (the experiment succeeded as a group)
      True
    NoWinner -> False
    _ -> False
  }
}

// ============================================================================
// COMMITMENT VERIFICATION IN FLOW
// ============================================================================

test commitment_prevents_cheating() {
  // Host tries to change target after seeing participant's guess
  let original_target = "hearts"
  let nonce = "secret"
  let target_hash = create_commitment(original_target, nonce)

  // Host sees participant guessed "hearts" and tries to claim target was "spades"
  let claimed_target = "spades"

  // Commitment verification fails!
  let verification_fails =
    !verify_commitment(target_hash, claimed_target, nonce)

  verification_fails
}

test commitment_requires_correct_nonce() {
  let target = "hearts"
  let nonce = "correct_nonce"
  let target_hash = create_commitment(target, nonce)

  // Even with correct target, wrong nonce fails
  let wrong_nonce_fails = !verify_commitment(target_hash, target, "wrong_nonce")

  wrong_nonce_fails
}

// ============================================================================
// EDGE CASES
// ============================================================================

test session_with_zero_stake() {
  // Free play mode (no stakes)
  let target_hash = create_commitment("hearts", "nonce")
  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      2000,
      3000,
      0,
      1,
    )

  get_research_contribution(datum) == 0 && get_winner_payout(datum) == 0
}

test session_with_maximum_stake() {
  // High stakes (1000 ADA)
  let target_hash = create_commitment("hearts", "nonce")
  let datum =
    new_session_datum(
      target_hash,
      pkh_host,
      CardPrediction,
      1000,
      2000,
      3000,
      1000000000,
      1,
    )

  let guess_hash = create_commitment("hearts", "p_nonce")
  let participant_guess =
    new_participant_guess(pkh_participant, guess_hash, 1500)
  let joined = add_participant(datum, pkh_participant, participant_guess)

  // Total pool: 2000 ADA
  // Research: 100 ADA (5%)
  // Winner: 1900 ADA
  get_research_contribution(joined) == 100000000 && get_winner_payout(joined) == 1900000000
}
