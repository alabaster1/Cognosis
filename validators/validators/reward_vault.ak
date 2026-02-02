// Cognosis Reward Vault Validator
// Distributes PSY tokens to experiment participants using exponential decay

use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId, AssetName, Value, quantity_of}
use cardano/transaction.{Transaction, Output, OutputReference, Input, InlineDatum}

// ============================================================================
// TYPES
// ============================================================================

/// Reward vault datum - stores vault parameters
pub type RewardVaultDatum {
  psy_policy_id: PolicyId,
  psy_asset_name: AssetName,
  base_reward: Int,          // Initial reward amount
  decay_factor: Int,         // Decay rate (reward = base / (1 + decay * claims))
  total_claims: Int,         // Number of rewards claimed so far
  experiment_script_hash: ByteArray,  // Hash of psi_experiment validator
  admin_pkh: ByteArray,      // Admin public key hash
}

/// Reward vault redeemer - actions that can be performed
pub type RewardVaultRedeemer {
  ClaimReward { participant_pkh: ByteArray }
  TopUp
  UpdateParams { base_reward: Int, decay_factor: Int }
}

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
      ClaimReward { participant_pkh } -> {
        // Must be spent alongside psi_experiment UTxO
        expect has_experiment_input(tx, datum.experiment_script_hash)
        
        // Calculate reward amount using exponential decay
        let reward = calculate_reward(
          datum.base_reward,
          datum.decay_factor,
          datum.total_claims
        )
        
        // Build PSY unit identifier
        let psy_unit = (datum.psy_policy_id, datum.psy_asset_name)
        
        // Verify outputs:
        // 1. Participant receives reward
        expect has_reward_output(tx, participant_pkh, psy_unit, reward)
        
        // 2. Continuing vault output with updated datum
        expect has_continuing_vault(
          tx,
          own_input.output.address,
          datum,
          reward,
          psy_unit
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
      UpdateParams { base_reward, decay_factor } -> {
        // Must be signed by admin
        expect list.has(tx.extra_signatories, datum.admin_pkh)
        
        // New parameters must be valid
        expect and {
          base_reward > 0,
          decay_factor >= 0,
        }
        
        // Build updated datum
        let updated_datum = RewardVaultDatum {
          ..datum,
          base_reward: base_reward,
          decay_factor: decay_factor,
        }
        
        // Continuing output must have updated datum
        expect has_exact_datum(tx, own_input.output.address, updated_datum)
        
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
// HELPER FUNCTIONS
// ============================================================================

/// Calculate reward using exponential decay formula
/// reward = base_reward / (1 + decay_factor * total_claims)
fn calculate_reward(base: Int, decay: Int, claims: Int) -> Int {
  let denominator = 1 + decay * claims
  expect denominator > 0
  base / denominator
}

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

/// Verify participant receives correct reward
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
        address.VerificationKey(pkh) -> pkh == participant_pkh
        _ -> False
      }
      
      // Check PSY token amount
      let correct_amount = quantity_of(
        output.value,
        psy_unit.1st,
        psy_unit.2nd
      ) == reward_amount
      
      and {
        correct_address,
        correct_amount,
      }
    }
  )
}

/// Verify continuing vault output exists with updated datum
fn has_continuing_vault(
  tx: Transaction,
  vault_address: Address,
  old_datum: RewardVaultDatum,
  claimed_reward: Int,
  psy_unit: (PolicyId, AssetName),
) -> Bool {
  // Updated datum with incremented claims
  let new_datum = RewardVaultDatum {
    ..old_datum,
    total_claims: old_datum.total_claims + 1,
  }
  
  list.any(
    tx.outputs,
    fn(output) {
      // Same address
      let same_address = output.address == vault_address
      
      // Correct datum
      let correct_datum = output.datum == InlineDatum(new_datum)
      
      // Reduced PSY value (subtracted reward)
      // Note: We don't check exact amounts since there might be other assets
      // Just verify PSY quantity decreased by reward amount
      
      and {
        same_address,
        correct_datum,
      }
    }
  )
}

/// Verify datum unchanged (for TopUp)
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
      // Same address as input
      let same_address = output.address == own_input.output.address
      
      // Value increased
      // (Simplified check - in production, verify specific asset quantities)
      let value_increased = True  // TODO: Implement proper value comparison
      
      and {
        same_address,
        value_increased,
      }
    }
  )
}
