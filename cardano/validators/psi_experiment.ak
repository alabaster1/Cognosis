use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address.{Address, VerificationKey}
use cardano/assets.{PolicyId, flatten}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use psi_research/games.{
  GameResult, NoWinner, ScoredSettlement, SharedWin, Winner, determine_winner,
  get_score_threshold, settle_scored_experiment,
}
use psi_research/redeemers.{
  ClaimHostTimeout, ClaimParticipantTimeout, Join, MutualCancel, PsiRedeemer,
  Reveal, RevealGuess, Settle, SubmitScore,
}
use psi_research/types.{
  AwaitingParticipant, AwaitingReveal, Expired, InProgress, ParticipantGuess,
  PsiDatum, SessionState, Settled, add_participant, get_research_contribution,
  get_winner_payout, is_scored_experiment, new_participant_guess,
}
use psi_research/utils.{
  is_after_deadline, is_before_deadline, verify_commitment, verify_signed_by,
}

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/// PsyApp Unified Psi-Research Experiment Validator
/// Handles all experiment types with datum-based game discrimination
/// Unified psi-experiment validator
/// Handles all game types via datum discrimination
validator psi_experiment(research_pool_address: Address) {
  spend(
    datum: Option<PsiDatum>,
    redeemer: PsiRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(d) = datum

    when redeemer is {
      // ================================================================
      // JOIN: Participant joins and locks matching stake
      // ================================================================
      Join { guess_hash } -> {
        // Must be awaiting participant
        expect d.session_state == AwaitingParticipant

        // Must be within join deadline
        expect is_before_deadline(tx, d.join_deadline_slot)

        // Must have exactly one signer (the joining participant)
        expect [participant_pkh] = tx.extra_signatories

        // Verify participant is locking matching stake
        expect verify_stake_locked(tx, own_ref, d.stake_lovelace)

        // Verify output datum is correctly updated
        let new_guess =
          new_participant_guess(participant_pkh, guess_hash, get_tx_slot(tx))
        expect verify_join_output(tx, own_ref, d, participant_pkh, new_guess)

        True
      }

      // ================================================================
      // REVEAL: Host reveals target, triggers settlement
      // ================================================================
      Reveal { target_value, nonce } -> {
        // Must be awaiting reveal (participant has joined)
        expect d.session_state == AwaitingReveal

        // Must be signed by host
        expect verify_signed_by(tx, d.host_pkh)

        // Must be within reveal deadline
        expect is_before_deadline(tx, d.reveal_deadline_slot)

        // Verify commitment matches
        expect verify_commitment(d.target_hash, target_value, nonce)

        // For non-scored experiments, verify settlement
        if is_scored_experiment(d.game_type) {
          // Scored experiments transition to waiting for score
          verify_scored_transition(tx, own_ref, d)
        } else {
          // Determine winner and verify fund distribution
          let result =
            determine_winner(d.game_type, target_value, d.participant_guesses)
          verify_settlement_outputs(tx, d, result, research_pool_address)
        }
      }

      // ================================================================
      // SUBMIT_SCORE: Oracle submits AI evaluation for scored experiments
      // ================================================================
      SubmitScore { score, oracle_signature: _ } -> {
        // Only valid for scored experiments
        expect is_scored_experiment(d.game_type)

        // Must be in progress (after reveal for scored)
        expect d.session_state == InProgress

        // Score must be valid range
        expect score >= 0 && score <= 100

        // Determine winner based on score
        let threshold = get_score_threshold(d.game_type)
        let result =
          settle_scored_experiment(score, d.participant_pkh, threshold)

        // Verify settlement
        verify_settlement_outputs(tx, d, result, research_pool_address)
      }

      // ================================================================
      // REVEAL_GUESS: Participant reveals their committed guess
      // ================================================================
      RevealGuess { guess_value, guess_nonce } -> {
        // Must have participant
        expect Some(participant_pkh) = d.participant_pkh
        expect verify_signed_by(tx, participant_pkh)

        // Find participant's guess and verify commitment
        expect
          verify_participant_guess_reveal(
            d.participant_guesses,
            participant_pkh,
            guess_value,
            guess_nonce,
          )

        // Update datum with revealed guess value
        verify_guess_reveal_output(tx, own_ref, d, participant_pkh, guess_value)
      }

      // ================================================================
      // SETTLE: Finalize already-determined settlement
      // ================================================================
      Settle -> {
        // Must be in settled state
        expect d.session_state == Settled
        True
      }

      // ================================================================
      // CLAIM_HOST_TIMEOUT: Participant claims when host fails to reveal
      // ================================================================
      ClaimHostTimeout -> {
        // Must be awaiting reveal
        expect d.session_state == AwaitingReveal

        // Must be past reveal deadline
        expect is_after_deadline(tx, d.reveal_deadline_slot)

        // Must have a participant
        expect Some(participant_pkh) = d.participant_pkh

        // Participant gets their stake back + host stake (minus research %)
        verify_timeout_payout(tx, d, participant_pkh, research_pool_address)
      }

      // ================================================================
      // CLAIM_PARTICIPANT_TIMEOUT: Host reclaims when no one joins
      // ================================================================
      ClaimParticipantTimeout -> {
        // Must be awaiting participant
        expect d.session_state == AwaitingParticipant

        // Must be past join deadline
        expect is_after_deadline(tx, d.join_deadline_slot)

        // Host must sign
        expect verify_signed_by(tx, d.host_pkh)

        // Host gets their stake back (no research contribution needed)
        verify_full_refund(tx, d, d.host_pkh)
      }

      // ================================================================
      // MUTUAL_CANCEL: Both parties agree to cancel
      // ================================================================
      MutualCancel -> {
        // Must have participant
        expect Some(participant_pkh) = d.participant_pkh

        // Both must sign
        expect verify_signed_by(tx, d.host_pkh)
        expect verify_signed_by(tx, participant_pkh)

        // Each gets their stake back
        verify_mutual_refund(tx, d, d.host_pkh, participant_pkh)
      }
    }
  }

  else(_) {
    False
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Get current slot from transaction (approximation using lower bound)
fn get_tx_slot(tx: Transaction) -> Int {
  when tx.validity_range.lower_bound.bound_type is {
    Finite(slot) -> slot
    _ -> 0
  }
}

/// Verify participant has locked matching stake in output
fn verify_stake_locked(
  tx: Transaction,
  own_ref: OutputReference,
  required_stake: Int,
) -> Bool {
  // Find the continuing output (same script address)
  let continuing_outputs =
    list.filter(
      tx.outputs,
      fn(output) { is_script_output(output, own_ref, tx) },
    )

  when continuing_outputs is {
    [output] -> {
      // Should have double the stake (host + participant)
      let total_lovelace = get_lovelace(output)
      total_lovelace >= required_stake * 2
    }
    _ -> False
  }
}

/// Check if output is to the same script (continuing output)
fn is_script_output(
  output: Output,
  own_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  // Find own input to get script address
  when
    list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
  is {
    Some(own_input) -> output.address == own_input.output.address
    None -> False
  }
}

/// Get lovelace value from output
fn get_lovelace(output: Output) -> Int {
  let flat = flatten(output.value)
  when list.find(flat, fn(asset) { asset.1st == #"" && asset.2nd == #"" }) is {
    Some(ada) -> ada.3rd
    None -> 0
  }
}

/// Verify join output datum is correctly updated
fn verify_join_output(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: PsiDatum,
  participant_pkh: ByteArray,
  new_guess: ParticipantGuess,
) -> Bool {
  let continuing_outputs =
    list.filter(
      tx.outputs,
      fn(output) { is_script_output(output, own_ref, tx) },
    )

  when continuing_outputs is {
    [output] ->
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: PsiDatum = data
          // Verify datum updates
          new_datum.target_hash == old_datum.target_hash && new_datum.host_pkh == old_datum.host_pkh && new_datum.participant_pkh == Some(
            participant_pkh,
          ) && new_datum.session_state == AwaitingReveal && new_datum.current_participants == old_datum.current_participants + 1 && list.length(
            new_datum.participant_guesses,
          ) == list.length(old_datum.participant_guesses) + 1
        }
        _ -> False
      }
    _ -> False
  }
}

/// Verify settlement outputs distribute funds correctly
fn verify_settlement_outputs(
  tx: Transaction,
  datum: PsiDatum,
  result: GameResult,
  research_pool_address: Address,
) -> Bool {
  let research_amount = get_research_contribution(datum)
  let winner_amount = get_winner_payout(datum)

  when result is {
    Winner(winner_pkh) ->
      // Winner gets winner_amount, research pool gets research_amount
      verify_winner_payment(tx, winner_pkh, winner_amount) && verify_research_payment(
        tx,
        research_pool_address,
        research_amount,
      )

    NoWinner ->
      // Host wins (no correct guess)
      verify_winner_payment(tx, datum.host_pkh, winner_amount) && verify_research_payment(
        tx,
        research_pool_address,
        research_amount,
      )

    SharedWin(winners) -> {
      // Split among winners
      let share = winner_amount / list.length(winners)
      verify_shared_payments(tx, winners, share) && verify_research_payment(
        tx,
        research_pool_address,
        research_amount,
      )
    }

    ScoredSettlement ->
      // Should not reach here - scored experiments use SubmitScore
      False

    games.Draw ->
      // Both get their stakes back
      when datum.participant_pkh is {
        Some(participant_pkh) ->
          verify_mutual_refund(tx, datum, datum.host_pkh, participant_pkh)
        None -> False
      }
  }
}

/// Verify scored experiment transitions correctly
fn verify_scored_transition(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: PsiDatum,
) -> Bool {
  let continuing_outputs =
    list.filter(
      tx.outputs,
      fn(output) { is_script_output(output, own_ref, tx) },
    )

  when continuing_outputs is {
    [output] ->
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: PsiDatum = data
          // Transition to InProgress for score submission
          new_datum.session_state == InProgress
        }
        _ -> False
      }
    _ -> False
  }
}

/// Verify participant's revealed guess matches their commitment
fn verify_participant_guess_reveal(
  guesses: List<ParticipantGuess>,
  participant_pkh: ByteArray,
  guess_value: ByteArray,
  guess_nonce: ByteArray,
) -> Bool {
  when list.find(guesses, fn(g) { g.pkh == participant_pkh }) is {
    Some(guess) -> verify_commitment(guess.guess_hash, guess_value, guess_nonce)
    None -> False
  }
}

/// Verify guess reveal output updates datum correctly
fn verify_guess_reveal_output(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: PsiDatum,
  participant_pkh: ByteArray,
  guess_value: ByteArray,
) -> Bool {
  let continuing_outputs =
    list.filter(
      tx.outputs,
      fn(output) { is_script_output(output, own_ref, tx) },
    )

  when continuing_outputs is {
    [output] ->
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: PsiDatum = data
          // Verify guess value is now filled in
          list.any(
            new_datum.participant_guesses,
            fn(g) {
              g.pkh == participant_pkh && g.guess_value == Some(guess_value)
            },
          )
        }
        _ -> False
      }
    _ -> False
  }
}

/// Verify winner receives correct payment
fn verify_winner_payment(
  tx: Transaction,
  winner_pkh: ByteArray,
  amount: Int,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      is_payment_to_pkh(output, winner_pkh) && get_lovelace(output) >= amount
    },
  )
}

/// Verify research pool receives contribution
fn verify_research_payment(
  tx: Transaction,
  pool_address: Address,
  amount: Int,
) -> Bool {
  if amount == 0 {
    True
  } else {
    list.any(
      tx.outputs,
      fn(output) {
        output.address == pool_address && get_lovelace(output) >= amount
      },
    )
  }
}

/// Verify multiple winners receive shares
fn verify_shared_payments(
  tx: Transaction,
  winners: List<ByteArray>,
  share: Int,
) -> Bool {
  list.all(
    winners,
    fn(winner_pkh) {
      list.any(
        tx.outputs,
        fn(output) {
          is_payment_to_pkh(output, winner_pkh) && get_lovelace(output) >= share
        },
      )
    },
  )
}

/// Verify timeout payout to participant
fn verify_timeout_payout(
  tx: Transaction,
  datum: PsiDatum,
  participant_pkh: ByteArray,
  research_pool_address: Address,
) -> Bool {
  let research_amount = get_research_contribution(datum)
  let participant_amount = get_winner_payout(datum)

  verify_winner_payment(tx, participant_pkh, participant_amount) && verify_research_payment(
    tx,
    research_pool_address,
    research_amount,
  )
}

/// Verify full refund to single party (no research contribution)
fn verify_full_refund(
  tx: Transaction,
  datum: PsiDatum,
  recipient_pkh: ByteArray,
) -> Bool {
  verify_winner_payment(tx, recipient_pkh, datum.stake_lovelace)
}

/// Verify mutual refund to both parties
fn verify_mutual_refund(
  tx: Transaction,
  datum: PsiDatum,
  host_pkh: ByteArray,
  participant_pkh: ByteArray,
) -> Bool {
  verify_winner_payment(tx, host_pkh, datum.stake_lovelace) && verify_winner_payment(
    tx,
    participant_pkh,
    datum.stake_lovelace,
  )
}

/// Check if output is payment to a PKH address
fn is_payment_to_pkh(output: Output, pkh: ByteArray) -> Bool {
  when output.address.payment_credential is {
    VerificationKey(vkh) -> vkh == pkh
    _ -> False
  }
}
