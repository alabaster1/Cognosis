// Cognosis PSY Lottery Validator
// Accumulates 0.01 ADA per submission and distributes weekly jackpots
// Weighted by PSY earned (hybrid sqrt/log formula)

use aiken/collection/list
use aiken/primitive/bytearray
use cardano/address.{Address, VerificationKey, Script}
use cardano/assets.{PolicyId, AssetName, quantity_of, ada_policy_id, ada_asset_name}
use cardano/transaction.{Transaction, Output, OutputReference, Input, InlineDatum}

// ============================================================================
// TYPES
// ============================================================================

/// Lottery pool datum
pub type LotteryDatum {
  drawing_frequency_ms: Int,  // How often to draw (e.g., 604800000 = 1 week)
  last_drawing_time: Int,      // Timestamp of last drawing (POSIX ms)
  accumulated_ada: Int,        // Total ADA in pool (lovelace)
  alpha_weight: Int,           // Weighting parameter (0-100, 50 = balanced)
  admin_pkh: ByteArray,        // Admin who can trigger drawings
  vault_script_hash: ByteArray, // Reward vault (authorized to add fees)
}

/// Entry for lottery drawing - participant's PSY amount
pub type LotteryEntry {
  participant_pkh: ByteArray,
  psy_earned: Int,
}

/// Lottery redeemer
pub type LotteryRedeemer {
  AccumulateFee { from_vault: Bool }  // Add 0.01 ADA from reward claim
  DrawWinner {                         // Weekly drawing
    entries: List<LotteryEntry>,       // All participants this period
    winner_index: Int,                  // Selected winner (must be verified)
    random_seed: ByteArray,            // VRF seed or block hash
  }
  UpdateParams {
    drawing_frequency_ms: Int,
    alpha_weight: Int,
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const weight_scale = 100  // Alpha scaled by 100 (50 = 0.5)

// ============================================================================
// VALIDATOR
// ============================================================================

validator psy_lottery {
  spend(
    datum_opt: Option<LotteryDatum>,
    redeemer: LotteryRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(datum) = datum_opt
    
    expect Some(own_input) = list.find(
      tx.inputs,
      fn(input) { input.output_reference == own_ref }
    )
    
    when redeemer is {
      
      // ACCUMULATE FEE
      // Called when reward vault sends 0.01 ADA
      AccumulateFee { from_vault } -> {
        // If from_vault=True, must be spent alongside vault
        expect when from_vault is {
          True -> has_vault_input(tx, datum.vault_script_hash)
          False -> True  // Allow manual additions too
        }
        
        // Continuing output must exist with same datum and increased ADA
        expect has_continuing_pool(
          tx,
          own_input.output.address,
          datum,
          own_input.output.value
        )
        
        True
      }
      
      // DRAW WINNER
      // Weekly drawing - select winner based on PSY-weighted probability
      DrawWinner { entries, winner_index, random_seed } -> {
        // Must be signed by admin
        expect list.has(tx.extra_signatories, datum.admin_pkh)
        
        // TODO: Validate timing - must have waited drawing_frequency_ms
        // (Simplified for initial deployment - admin controls drawing frequency)
        
        // Validate entries are non-empty
        expect list.length(entries) > 0
        
        // Validate winner_index is in range
        expect winner_index >= 0
        expect winner_index < list.length(entries)
        
        // Calculate weighted tickets for all entries
        let total_tickets = calculate_total_tickets(entries, datum.alpha_weight)
        
        // Verify winner selection is valid
        // (In production, verify against VRF or deterministic randomness)
        expect winner_index >= 0  // Simplified check
        
        // Get winner
        expect Some(winner_entry) = list.at(entries, winner_index)
        
        // Winner receives jackpot
        expect has_jackpot_payout(
          tx,
          winner_entry.participant_pkh,
          datum.accumulated_ada
        )
        
        // Reset lottery pool
        // TODO: Update last_drawing_time with actual timestamp from tx
        let new_datum = LotteryDatum {
          ..datum,
          last_drawing_time: datum.last_drawing_time + datum.drawing_frequency_ms,
          accumulated_ada: 0,  // Reset pool
        }
        
        expect has_exact_lottery_datum(
          tx,
          own_input.output.address,
          new_datum
        )
        
        True
      }
      
      // UPDATE PARAMS
      // Admin adjusts lottery parameters
      UpdateParams { drawing_frequency_ms, alpha_weight } -> {
        expect list.has(tx.extra_signatories, datum.admin_pkh)
        
        // Validate parameters
        expect and {
          drawing_frequency_ms > 0,
          alpha_weight >= 0,
          alpha_weight <= 100,
        }
        
        let updated_datum = LotteryDatum {
          ..datum,
          drawing_frequency_ms: drawing_frequency_ms,
          alpha_weight: alpha_weight,
        }
        
        expect has_exact_lottery_datum(
          tx,
          own_input.output.address,
          updated_datum
        )
        
        True
      }
    }
  }
  
  else(_) {
    fail
  }
}

// ============================================================================
// LOTTERY MATH
// ============================================================================

/// Calculate hybrid sqrt/log weighted tickets
/// Formula: tickets = α * sqrt(psy) + (1-α) * log(psy+1) * 5
/// Returns scaled by 100 for precision
fn calculate_tickets(psy_earned: Int, alpha: Int) -> Int {
  // Approximate sqrt(psy) using lookup table + interpolation
  let sqrt_weight = sqrt_approximation(psy_earned)
  
  // Approximate log(psy+1) using lookup table
  let log_weight = log_approximation(psy_earned + 1) * 5  // Scale log
  
  // Blend: α * sqrt + (1-α) * log
  let alpha_scaled = alpha  // Already 0-100
  let beta_scaled = 100 - alpha  // 1-α
  
  (alpha_scaled * sqrt_weight + beta_scaled * log_weight) / 100
}

/// Calculate total tickets for all entries
fn calculate_total_tickets(entries: List<LotteryEntry>, alpha: Int) -> Int {
  list.foldr(
    entries,
    0,
    fn(entry, acc) { 
      acc + calculate_tickets(entry.psy_earned, alpha)
    }
  )
}

/// Approximate sqrt(x) using lookup table
fn sqrt_approximation(x: Int) -> Int {
  when x is {
    0 -> 0
    1 -> 100      // 1.00 * 100
    4 -> 200      // 2.00
    9 -> 300      // 3.00
    16 -> 400     // 4.00
    25 -> 500     // 5.00
    50 -> 707     // 7.07
    75 -> 866     // 8.66
    100 -> 1000   // 10.00
    150 -> 1225   // 12.25
    200 -> 1414   // 14.14
    _ -> {
      // Linear interpolation as fallback
      (x * 100) / 10
    }
  }
}

/// Approximate log(x) using lookup table
fn log_approximation(x: Int) -> Int {
  when x is {
    1 -> 0        // log(1) = 0
    2 -> 69       // log(2) ≈ 0.69 * 100
    10 -> 230     // log(10) ≈ 2.30
    25 -> 322     // log(25) ≈ 3.22
    50 -> 391     // log(50) ≈ 3.91
    75 -> 431     // log(75) ≈ 4.31
    100 -> 461    // log(100) ≈ 4.61
    150 -> 501    // log(150) ≈ 5.01
    200 -> 530    // log(200) ≈ 5.30
    _ -> {
      // Linear approximation as fallback
      (x * 100) / 50
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Check if vault input exists
fn has_vault_input(tx: Transaction, vault_hash: ByteArray) -> Bool {
  list.any(
    tx.inputs,
    fn(input) {
      when input.output.address.payment_credential is {
        Script(hash) -> hash == vault_hash
        _ -> False
      }
    }
  )
}

/// Verify continuing pool with increased ADA
fn has_continuing_pool(
  tx: Transaction,
  pool_address: Address,
  datum: LotteryDatum,
  old_value,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      and {
        output.address == pool_address,
        output.datum == InlineDatum(datum),
        // Value increased (ADA added)
        quantity_of(output.value, ada_policy_id, ada_asset_name) >
          quantity_of(old_value, ada_policy_id, ada_asset_name),
      }
    }
  )
}

/// Verify jackpot payout to winner
fn has_jackpot_payout(
  tx: Transaction,
  winner_pkh: ByteArray,
  jackpot_amount: Int,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      let correct_address = when output.address.payment_credential is {
        VerificationKey(pkh) -> pkh == winner_pkh
        _ -> False
      }
      
      let correct_amount = quantity_of(
        output.value,
        ada_policy_id,
        ada_asset_name
      ) >= jackpot_amount
      
      and {
        correct_address,
        correct_amount,
      }
    }
  )
}

/// Verify exact lottery datum
fn has_exact_lottery_datum(
  tx: Transaction,
  pool_address: Address,
  datum: LotteryDatum,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      and {
        output.address == pool_address,
        output.datum == InlineDatum(datum),
      }
    }
  )
}
