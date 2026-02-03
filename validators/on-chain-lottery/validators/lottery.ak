use aiken/collection/list
use aiken/crypto.{Blake2b_224, Hash, VerificationKey, blake2b_256}
use aiken/primitive/bytearray
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{
  Address, Inline, PaymentCredential, Script, VerificationKeyCredential,
}
use aiken/transaction/value.{ada_asset_name, ada_policy_id, lovelace_of}

/// Lottery participant with weighted tickets
pub type Participant {
  pkh: Hash<Blake2b_224, VerificationKey>,
  psy_earned: Int,
  tickets: Int,
}

/// Lottery pool datum
pub type LotteryDatum {
  /// Drawing frequency in milliseconds
  drawing_frequency_ms: Int,
  /// Last drawing timestamp (POSIX ms)
  last_drawing_time: Int,
  /// Accumulated ADA in lovelace
  accumulated_ada: Int,
  /// List of participants this cycle
  participants: List<Participant>,
  /// Alpha weight for ticket calculation (scaled by 100)
  alpha_weight: Int,
  /// Admin public key hash
  admin_pkh: Hash<Blake2b_224, VerificationKey>,
}

/// Lottery redeemer actions
pub type LotteryRedeemer {
  /// Permissionless: Draw lottery if frequency elapsed
  Draw { vrf_proof: ByteArray, random_seed: Int }
  /// Add lottery fees from experiment submissions
  Accumulate { entry_fee: Int }
  /// Admin: Update parameters
  UpdateParams { new_frequency_ms: Int }
}

validator lottery {
  spend(
    datum: Option<LotteryDatum>,
    redeemer: LotteryRedeemer,
    _own_ref: Data,
    ctx: ScriptContext,
  ) {
    // Extract datum
    expect Some(lot_datum) = datum
    
    when redeemer is {
      // DRAW: Permissionless lottery drawing
      Draw { vrf_proof, random_seed } -> {
        expect Spend(own_input_ref) = ctx.purpose
        let tx = ctx.transaction
        
        // Find own input
        expect Some(own_input) =
          list.find(tx.inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address
        
        // Get current time (lower bound of validity range)
        expect Finite(current_time) = tx.validity_range.lower_bound.bound_type
        
        // Check 1: Enough time has elapsed
        let time_since_last_draw = current_time - lot_datum.last_drawing_time
        let can_draw = time_since_last_draw >= lot_datum.drawing_frequency_ms
        
        // Check 2: At least one participant
        let has_participants = list.length(lot_datum.participants) > 0
        
        // Check 3: Prize pool is positive
        let has_prize = lot_datum.accumulated_ada > 0
        
        // Select winner based on random seed
        let num_participants = list.length(lot_datum.participants)
        let winner_index = random_seed % num_participants
        expect Some(winner) = list.at(lot_datum.participants, winner_index)
        
        // Check 4: Prize sent to winner
        let winner_address =
          Address {
            payment_credential: VerificationKeyCredential(winner.pkh),
            stake_credential: None,
          }
        
        let prize_sent_to_winner =
          list.any(
            tx.outputs,
            fn(output) {
              output.address == winner_address && lovelace_of(output.value) >= lot_datum.accumulated_ada
            },
          )
        
        // Check 5: Lottery continues with reset datum
        expect Some(continuing_output) =
          list.find(tx.outputs, fn(output) { output.address == own_address })
        
        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: LotteryDatum = continuing_datum_data
        
        let datum_reset_correctly =
          continuing_datum.last_drawing_time == current_time && continuing_datum.accumulated_ada == 0 && list.length(
            continuing_datum.participants,
          ) == 0
        
        // VRF verification (placeholder - check non-empty)
        let vrf_valid = bytearray.length(vrf_proof) > 0
        
        // All checks must pass
        can_draw? && has_participants? && has_prize? && prize_sent_to_winner? && datum_reset_correctly? && vrf_valid?
      }
      
      // ACCUMULATE: Add lottery fees
      Accumulate { entry_fee } -> {
        expect Spend(own_input_ref) = ctx.purpose
        let tx = ctx.transaction
        
        // Find own input
        expect Some(own_input) =
          list.find(tx.inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address
        
        // Check: Fee is positive
        let valid_fee = entry_fee > 0
        
        // Check: Continuing output accumulates the fee
        expect Some(continuing_output) =
          list.find(tx.outputs, fn(output) { output.address == own_address })
        
        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: LotteryDatum = continuing_datum_data
        
        let fee_accumulated =
          continuing_datum.accumulated_ada == lot_datum.accumulated_ada + entry_fee
        
        // Check: ADA value increased by entry_fee
        let input_ada = lovelace_of(own_input.output.value)
        let output_ada = lovelace_of(continuing_output.value)
        let value_increased = output_ada == input_ada + entry_fee
        
        valid_fee? && fee_accumulated? && value_increased?
      }
      
      // UPDATE PARAMS: Admin emergency update
      UpdateParams { new_frequency_ms } -> {
        let tx = ctx.transaction
        
        // Only admin can update
        let signed_by_admin = list.has(tx.extra_signatories, lot_datum.admin_pkh)
        
        // Frequency must be reasonable (between 1 hour and 1 month)
        let hour_ms = 3600000
        let month_ms = 2592000000
        let valid_frequency =
          new_frequency_ms >= hour_ms && new_frequency_ms <= month_ms
        
        signed_by_admin? && valid_frequency?
      }
    }
  }

  else(_) {
    fail
  }
}
