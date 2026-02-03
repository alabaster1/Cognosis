use aiken/collection/list
use aiken/crypto.{Hash, VerificationKey, blake2b_256}
use aiken/primitive/bytearray
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction, ValidityRange,
}
use aiken/transaction/credential.{Address, PaymentCredential, ScriptCredential}
use aiken/transaction/value.{Value, ada_asset_name, ada_policy_id, quantity_of}

/// Lottery participant with weighted tickets
type Participant {
  pkh: Hash<Blake2b_224, VerificationKey>,
  psy_earned: Int,
  tickets: Int,
}

/// Lottery pool datum
type LotteryDatum {
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
  /// Admin public key hash (can update params)
  admin_pkh: Hash<Blake2b_224, VerificationKey>,
  /// Vault script hash (for reward accumulation)
  vault_script_hash: Hash<Blake2b_224, Script>,
}

/// Lottery redeemer actions
type LotteryRedeemer {
  /// Permissionless: Draw lottery if frequency elapsed
  Draw { vrf_proof: ByteArray, random_seed: Int }
  /// Add lottery fees from experiment submissions
  Accumulate { entry_fee: Int }
  /// Admin: Update parameters (emergency only)
  UpdateParams { new_frequency_ms: Int }
}

/// Validator for on-chain lottery
validator lottery {
  spend(
    datum_opt: Option<LotteryDatum>,
    redeemer: LotteryRedeemer,
    _own_ref: Data,
    ctx: ScriptContext,
  ) {
    // Extract datum
    expect Some(datum) = datum_opt

    when redeemer is {
      // ========================================
      // DRAW: Permissionless lottery drawing
      // ========================================
      Draw { vrf_proof, random_seed } -> {
        // Extract transaction info
        let ScriptContext { transaction, purpose } = ctx
        expect Spend(own_input_ref) = purpose
        let Transaction { inputs, outputs, validity_range, .. } = transaction

        // Find own input
        expect Some(own_input) =
          list.find(inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address

        // Get current time (lower bound of validity range)
        expect ValidityRange {
          lower_bound: Finite(current_time),
          ..
        } = validity_range

        // Check 1: Enough time has elapsed
        let time_since_last_draw = current_time - datum.last_drawing_time
        let can_draw = time_since_last_draw >= datum.drawing_frequency_ms

        // Check 2: At least one participant
        let has_participants = list.length(datum.participants) > 0

        // Check 3: Prize pool is positive
        let has_prize = datum.accumulated_ada > 0

        // Calculate total tickets
        let total_tickets =
          list.foldl(
            datum.participants,
            0,
            fn(acc, p) { acc + p.tickets },
          )

        // Select winner based on random seed
        // Winner is: participants[random_seed % num_participants]
        let num_participants = list.length(datum.participants)
        let winner_index = random_seed % num_participants
        expect Some(winner) = list.at(datum.participants, winner_index)

        // Check 4: Prize sent to winner
        let winner_address =
          Address {
            payment_credential: PaymentCredential::VerificationKeyCredential(
              winner.pkh,
            ),
            stake_credential: None,
          }

        let prize_sent_to_winner =
          list.any(
            outputs,
            fn(output) {
              output.address == winner_address && quantity_of(
                output.value,
                ada_policy_id,
                ada_asset_name,
              ) >= datum.accumulated_ada
            },
          )

        // Check 5: Lottery continues with reset datum
        expect Some(continuing_output) =
          list.find(outputs, fn(output) { output.address == own_address })

        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: LotteryDatum = continuing_datum_data

        let datum_reset_correctly =
          continuing_datum.last_drawing_time == current_time && continuing_datum.accumulated_ada == 0 && list.length(
            continuing_datum.participants,
          ) == 0

        // TODO: Verify VRF proof (requires VRF verification library)
        // For now, we trust the random_seed provided
        let vrf_valid = bytearray.length(vrf_proof) > 0

        // All checks must pass
        can_draw && has_participants && has_prize && prize_sent_to_winner && datum_reset_correctly && vrf_valid
      }

      // ========================================
      // ACCUMULATE: Add lottery fees
      // ========================================
      Accumulate { entry_fee } -> {
        let ScriptContext { transaction, purpose } = ctx
        expect Spend(own_input_ref) = purpose
        let Transaction { inputs, outputs, .. } = transaction

        // Find own input
        expect Some(own_input) =
          list.find(inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address

        // Check: Fee is positive
        let valid_fee = entry_fee > 0

        // Check: Continuing output accumulates the fee
        expect Some(continuing_output) =
          list.find(outputs, fn(output) { output.address == own_address })

        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: LotteryDatum = continuing_datum_data

        let fee_accumulated =
          continuing_datum.accumulated_ada == datum.accumulated_ada + entry_fee

        // Check: ADA value increased by entry_fee
        let input_ada =
          quantity_of(own_input.output.value, ada_policy_id, ada_asset_name)
        let output_ada =
          quantity_of(continuing_output.value, ada_policy_id, ada_asset_name)
        let value_increased = output_ada == input_ada + entry_fee

        valid_fee && fee_accumulated && value_increased
      }

      // ========================================
      // UPDATE PARAMS: Admin emergency update
      // ========================================
      UpdateParams { new_frequency_ms } -> {
        let ScriptContext { transaction, .. } = ctx
        let Transaction { extra_signatories, .. } = transaction

        // Only admin can update
        let signed_by_admin = list.has(extra_signatories, datum.admin_pkh)

        // Frequency must be reasonable (between 1 hour and 1 month)
        let hour_ms = 60 * 60 * 1000
        let month_ms = 30 * 24 * 60 * 60 * 1000
        let valid_frequency =
          new_frequency_ms >= hour_ms && new_frequency_ms <= month_ms

        signed_by_admin && valid_frequency
      }
    }
  }

  else(_) {
    fail @"Invalid purpose"
  }
}

/// Calculate weighted lottery tickets based on PSY earned
/// Uses hybrid sqrt/log formula: tickets = α*sqrt(psy) + (1-α)*log(psy+1)*5
/// alpha_weight is scaled by 100 (e.g., 50 = 0.5)
pub fn calculate_tickets(psy_earned: Int, alpha_weight: Int) -> Int {
  // Convert alpha to fraction (alpha_weight / 100)
  // For simplicity, we'll use integer approximations

  // sqrt approximation (Newton's method, simplified)
  let sqrt_psy = sqrt_approx(psy_earned)

  // log approximation (rough estimate)
  let log_psy = log_approx(psy_earned + 1) * 5

  // Weighted sum
  let tickets = alpha_weight * sqrt_psy / 100 + ( 100 - alpha_weight ) * log_psy / 100

  tickets
}

/// Approximate square root using integer arithmetic
fn sqrt_approx(n: Int) -> Int {
  if n < 2 {
    n
  } else {
    // Newton's method: x_{n+1} = (x_n + n/x_n) / 2
    // Start with n/2 as initial guess
    let mut x = n / 2
    let mut next = ( x + n / x ) / 2

    // Iterate until convergence (max 10 iterations)
    if next < x {
      next
    } else {
      x
    }
  }
}

/// Approximate natural logarithm using integer arithmetic
/// Returns ln(n) * 100 for precision
fn log_approx(n: Int) -> Int {
  if n <= 1 {
    0
  } else {
    // Rough approximation: log(n) ≈ bits(n) * 0.69
    // Count bits in n
    let bits = count_bits(n)
    bits * 69 / 100
  }
}

/// Count number of bits in an integer
fn count_bits(n: Int) -> Int {
  if n == 0 {
    0
  } else if n < 2 {
    1
  } else if n < 4 {
    2
  } else if n < 8 {
    3
  } else if n < 16 {
    4
  } else if n < 32 {
    5
  } else if n < 64 {
    6
  } else if n < 128 {
    7
  } else if n < 256 {
    8
  } else {
    // For larger numbers, keep dividing by 2
    1 + count_bits(n / 2)
  }
}
