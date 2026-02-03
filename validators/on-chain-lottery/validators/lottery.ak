use aiken/collection/list
use aiken/crypto.{Blake2b_224, Hash, VerificationKey}
use aiken/primitive/bytearray
use aiken/interval
use cardano/address.{Address, Credential, VerificationKey as VKCred}
use cardano/assets.{lovelace_of}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, ScriptPurpose, Spend, Transaction,
}

/// Lottery participant with weighted tickets
pub type Participant {
  pkh: Hash<Blake2b_224, VerificationKey>,
  psy_earned: Int,
  tickets: Int,
}

/// Lottery pool datum
pub type LotteryDatum {
  drawing_frequency_ms: Int,
  last_drawing_time: Int,
  accumulated_ada: Int,
  participants: List<Participant>,
  alpha_weight: Int,
  admin_pkh: Hash<Blake2b_224, VerificationKey>,
}

/// Lottery redeemer actions
pub type LotteryRedeemer {
  Draw { vrf_proof: ByteArray, random_seed: Int }
  Accumulate { entry_fee: Int }
  UpdateParams { new_frequency_ms: Int }
}

validator lottery {
  spend(
    datum: Option<LotteryDatum>,
    redeemer: LotteryRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(lot_datum) = datum
    
    when redeemer is {
      Draw { vrf_proof, random_seed } -> {
        // Get current time from validity range
        expect interval.Finite(current_time) =
          self.validity_range.lower_bound.bound_type
        
        // Check 1: Enough time elapsed
        let time_since_last = current_time - lot_datum.last_drawing_time
        expect time_since_last >= lot_datum.drawing_frequency_ms
        
        // Check 2: Has participants
        let num_participants = list.length(lot_datum.participants)
        expect num_participants > 0
        
        // Check 3: Has prize
        expect lot_datum.accumulated_ada > 0
        
        // Select winner
        let winner_index = random_seed % num_participants
        expect Some(winner) = list.at(lot_datum.participants, winner_index)
        
        // Build winner address
        let winner_address =
          Address {
            payment_credential: VKCred(winner.pkh),
            stake_credential: None,
          }
        
        // Check 4: Prize sent to winner
        expect list.any(
          self.outputs,
          fn(output) {
            output.address == winner_address && lovelace_of(output.value) >= lot_datum.accumulated_ada
          },
        )
        
        // Check 5: VRF proof non-empty (placeholder)
        expect bytearray.length(vrf_proof) > 0
        
        True
      }
      
      Accumulate { entry_fee } -> {
        expect entry_fee > 0
        True
      }
      
      UpdateParams { new_frequency_ms } -> {
        expect list.has(self.extra_signatories, lot_datum.admin_pkh)
        expect new_frequency_ms >= 3600000
        expect new_frequency_ms <= 2592000000
        True
      }
    }
  }

  else(_) {
    fail
  }
}
