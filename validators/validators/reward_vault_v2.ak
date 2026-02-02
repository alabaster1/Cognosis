// Cognosis Reward Vault Validator v2
// Distributes PSY tokens based on accuracy score with exponential rewards
// Accumulates lottery pool for weekly jackpot drawings

use aiken/collection/list
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets.{PolicyId, AssetName, quantity_of, ada_policy_id, ada_asset_name}
use cardano/transaction.{Transaction, Output, OutputReference, Input, InlineDatum}

// ============================================================================
// TYPES
// ============================================================================

/// Reward vault datum - stores vault parameters and lottery pool
pub type RewardVaultDatum {
  psy_policy_id: PolicyId,
  psy_asset_name: AssetName,
  base_reward: Int,          // Base reward for participation (100 PSY)
  max_reward: Int,           // Maximum reward for perfect score (400 PSY)
  reward_steepness: Int,     // Exponential curve steepness (scaled by 100, so 250 = 2.5)
  lottery_fee_lovelace: Int, // Fee per submission for lottery (10000 = 0.01 ADA)
  lottery_script_hash: ByteArray,  // Hash of lottery validator
  experiment_script_hash: ByteArray,  // Hash of psi_experiment validator
  admin_pkh: ByteArray,      // Admin public key hash
  total_claims: Int,         // Number of rewards claimed (for analytics)
}

/// Reward vault redeemer - actions that can be performed
pub type RewardVaultRedeemer {
  ClaimReward { 
    participant_pkh: ByteArray,
    accuracy_score: Int,  // 0-100 accuracy score from AI
  }
  TopUp
  UpdateParams { 
    base_reward: Int,
    max_reward: Int,
    reward_steepness: Int,
  }
  WithdrawLottery  // Admin withdraws lottery pool to lottery contract
}

// ============================================================================
// CONSTANTS
// ============================================================================

const accuracy_scale = 100  // Accuracy scores are 0-100
const steepness_scale = 100 // Steepness scaled by 100 (e.g., 250 = 2.5)

// ============================================================================
// VALIDATOR
// ============================================================================

validator reward_vault {
  spend(
    datum_opt: Option<RewardVaultDatum>,
    redeemer: RewardVaultRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    // Extract datum
    expect Some(datum) = datum_opt
    
    // Get own input
    expect Some(own_input) = list.find(
      tx.inputs,
      fn(input) { input.output_reference == own_ref }
    )
    
    // Match on redeemer action
    when redeemer is {
      
      // CLAIM REWARD
      // Participant claims PSY reward after completing experiment
      ClaimReward { participant_pkh, accuracy_score } -> {
        // Validate accuracy score range
        expect and {
          accuracy_score >= 0,
          accuracy_score <= 100,
        }
        
        // Must be spent alongside psi_experiment UTxO
        expect has_experiment_input(tx, datum.experiment_script_hash)
        
        // Calculate reward amount using exponential curve
        let reward = calculate_exponential_reward(
          datum.base_reward,
          datum.max_reward,
          datum.reward_steepness,
          accuracy_score
        )
        
        // Build PSY unit identifier
        let psy_unit = (datum.psy_policy_id, datum.psy_asset_name)
        
        // Verify outputs:
        // 1. Participant receives PSY reward
        expect has_reward_output(tx, participant_pkh, psy_unit, reward)
        
        // 2. Lottery pool receives 0.01 ADA
        expect has_lottery_payment(tx, datum.lottery_script_hash, datum.lottery_fee_lovelace)
        
        // 3. Continuing vault output with updated datum
        expect has_continuing_vault(
          tx,
          own_input.output.address,
          datum,
          reward,
          psy_unit,
          datum.lottery_fee_lovelace
        )
        
        True
      }
      
      // TOP UP
      // Admin adds more PSY tokens to vault
      TopUp -> {
        // Must be signed by admin
        expect list.has(tx.extra_signatories, datum.admin_pkh)
        
        // Datum must remain unchanged
        expect has_unchanged_datum(tx, own_input.output.address, datum)
        
        // Value must increase (adding PSY tokens)
        expect vault_value_increased(tx, own_input)
        
        True
      }
      
      // UPDATE PARAMS
      // Admin adjusts reward parameters
      UpdateParams { base_reward, max_reward, reward_steepness } -> {
        // Must be signed by admin
        expect list.has(tx.extra_signatories, datum.admin_pkh)
        
        // New parameters must be valid
        expect and {
          base_reward > 0,
          max_reward > base_reward,  // Max must exceed base
          reward_steepness > 0,
        }
        
        // Build updated datum
        let updated_datum = RewardVaultDatum {
          ..datum,
          base_reward: base_reward,
          max_reward: max_reward,
          reward_steepness: reward_steepness,
        }
        
        // Continuing output must have updated datum
        expect has_exact_datum(tx, own_input.output.address, updated_datum)
        
        True
      }
      
      // WITHDRAW LOTTERY
      // Admin moves accumulated lottery fees to lottery contract
      WithdrawLottery -> {
        // Must be signed by admin
        expect list.has(tx.extra_signatories, datum.admin_pkh)
        
        // Must send ADA to lottery contract
        expect has_lottery_withdrawal(tx, datum.lottery_script_hash)
        
        // Datum unchanged
        expect has_unchanged_datum(tx, own_input.output.address, datum)
        
        True
      }
    }
  }
  
  // Minting/other purposes not used for this validator
  else(_) {
    fail
  }
}

// ============================================================================
// REWARD CALCULATION
// ============================================================================

/// Calculate reward using exponential curve
/// Formula: reward = base + (max - base) * (accuracy/100)^steepness
/// 
/// Examples with base=100, max=400, steepness=2.5:
///   20% accuracy: 100 + 300 * 0.04 = 112 PSY
///   50% accuracy: 100 + 300 * 0.18 = 154 PSY
///   75% accuracy: 100 + 300 * 0.42 = 226 PSY
///   90% accuracy: 100 + 300 * 0.70 = 310 PSY
///   95% accuracy: 100 + 300 * 0.81 = 343 PSY
fn calculate_exponential_reward(
  base: Int,
  max: Int,
  steepness: Int,
  accuracy: Int,
) -> Int {
  // Calculate bonus pool
  let bonus_pool = max - base
  
  // Normalize accuracy to 0-1 scale (scaled by 100)
  // accuracy is 0-100, so normalized is 0-100
  
  // Apply exponential curve: (accuracy/100)^steepness
  // Since we can't do fractional exponents directly in Aiken,
  // we approximate using integer math
  let bonus_multiplier = power_approximation(accuracy, steepness)
  
  // Calculate final reward
  base + (bonus_pool * bonus_multiplier) / 10000
}

/// Approximate (x/100)^(s/100) using Taylor series
/// Returns result scaled by 10000 for precision
fn power_approximation(accuracy: Int, steepness: Int) -> Int {
  // For simplicity, use lookup table for common values
  // This is more gas-efficient than Taylor series
  
  // Steepness 250 (2.5) lookup table
  when (accuracy, steepness) is {
    // 20% accuracy
    (20, 250) -> 179    // ≈ 0.0179 * 10000
    (25, 250) -> 316    // ≈ 0.0316 * 10000
    (30, 250) -> 492    // ≈ 0.0492 * 10000
    // 40% accuracy  
    (40, 250) -> 1014   // ≈ 0.1014 * 10000
    // 50% accuracy
    (50, 250) -> 1768   // ≈ 0.1768 * 10000
    (60, 250) -> 2800   // ≈ 0.2800 * 10000
    (70, 250) -> 4084   // ≈ 0.4084 * 10000
    // 75% accuracy
    (75, 250) -> 4840   // ≈ 0.4840 * 10000
    (80, 250) -> 5734   // ≈ 0.5734 * 10000
    // 90% accuracy
    (90, 250) -> 7631   // ≈ 0.7631 * 10000
    // 95% accuracy
    (95, 250) -> 8688   // ≈ 0.8688 * 10000
    (100, 250) -> 10000 // ≈ 1.0000 * 10000
    
    // Fallback: linear interpolation
    _ -> {
      // Simple linear scaling as fallback
      (accuracy * accuracy) / 10  // Quadratic approximation
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Check if transaction includes experiment input
fn has_experiment_input(tx: Transaction, experiment_hash: ByteArray) -> Bool {
  list.any(
    tx.inputs,
    fn(input) {
      when input.output.address.payment_credential is {
        Script(hash) -> hash == experiment_hash
        _ -> False
      }
    }
  )
}

/// Verify participant receives correct PSY reward
fn has_reward_output(
  tx: Transaction,
  participant_pkh: ByteArray,
  psy_unit: (PolicyId, AssetName),
  reward_amount: Int,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      // Check address matches participant
      let correct_address = when output.address.payment_credential is {
        VerificationKey(pkh) -> pkh == participant_pkh
        _ -> False
      }
      
      // Check PSY token amount
      let correct_amount = quantity_of(
        output.value,
        psy_unit.1st,
        psy_unit.2nd
      ) >= reward_amount  // Allow overpayment (change handling)
      
      and {
        correct_address,
        correct_amount,
      }
    }
  )
}

/// Verify lottery pool receives fee
fn has_lottery_payment(
  tx: Transaction,
  lottery_hash: ByteArray,
  fee_amount: Int,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      // Check address is lottery contract
      let correct_address = when output.address.payment_credential is {
        Script(hash) -> hash == lottery_hash
        _ -> False
      }
      
      // Check ADA amount
      let correct_amount = quantity_of(
        output.value,
        ada_policy_id,
        ada_asset_name
      ) >= fee_amount
      
      and {
        correct_address,
        correct_amount,
      }
    }
  )
}

/// Verify continuing vault output with updated datum
fn has_continuing_vault(
  tx: Transaction,
  vault_address: Address,
  old_datum: RewardVaultDatum,
  _claimed_reward: Int,
  _psy_unit: (PolicyId, AssetName),
  _lottery_fee: Int,
) -> Bool {
  // Updated datum with incremented claims counter
  let new_datum = RewardVaultDatum {
    ..old_datum,
    total_claims: old_datum.total_claims + 1,
  }
  
  list.any(
    tx.outputs,
    fn(output) {
      and {
        output.address == vault_address,
        output.datum == InlineDatum(new_datum),
      }
    }
  )
}

/// Verify datum unchanged
fn has_unchanged_datum(
  tx: Transaction,
  vault_address: Address,
  datum: RewardVaultDatum,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      and {
        output.address == vault_address,
        output.datum == InlineDatum(datum),
      }
    }
  )
}

/// Verify exact datum match
fn has_exact_datum(
  tx: Transaction,
  vault_address: Address,
  datum: RewardVaultDatum,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      and {
        output.address == vault_address,
        output.datum == InlineDatum(datum),
      }
    }
  )
}

/// Verify vault value increased (for TopUp)
fn vault_value_increased(tx: Transaction, own_input: Input) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      output.address == own_input.output.address
      // TODO: Implement proper value comparison
    }
  )
}

/// Verify lottery withdrawal
fn has_lottery_withdrawal(tx: Transaction, lottery_hash: ByteArray) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      when output.address.payment_credential is {
        Script(hash) -> hash == lottery_hash
        _ -> False
      }
    }
  )
}
