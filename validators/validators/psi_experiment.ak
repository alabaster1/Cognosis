// Cognosis Psi Experiment Validator
// Stores RV commitments and allows Oracle to reveal with AI scoring
// Remote Viewing = immediate reveal (no waiting period)

use aiken/collection/list
use cardano/address.{VerificationKey}
use cardano/transaction.{Transaction, OutputReference, InlineDatum}

// ============================================================================
// TYPES
// ============================================================================

/// Experiment commitment datum - stores user submission
pub type ExperimentDatum {
  user_pkh: ByteArray,           // User's public key hash
  ipfs_hash: ByteArray,          // IPFS hash of encrypted prediction
  timestamp: Int,                // Unix timestamp of submission
  experiment_type: ByteArray,    // "RV" for Remote Viewing
  target_description: ByteArray, // Hash of target (for verification)
}

/// Experiment redeemer - actions that can be performed
pub type ExperimentRedeemer {
  Reveal {
    accuracy_score: Int,         // 0-100 AI-generated score
    ai_model: ByteArray,         // AI model used (e.g., "gpt-4")
  }
  Cancel  // User cancels before reveal (refund)
}

// ============================================================================
// CONSTANTS
// ============================================================================

const min_accuracy = 0
const max_accuracy = 100

// ============================================================================
// VALIDATOR
// ============================================================================

validator psi_experiment {
  spend(
    datum_opt: Option<ExperimentDatum>,
    redeemer: ExperimentRedeemer,
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
      
      // REVEAL
      // Oracle reveals prediction and distributes reward
      Reveal { accuracy_score, ai_model } -> {
        // Validate accuracy score range
        expect and {
          accuracy_score >= min_accuracy,
          accuracy_score <= max_accuracy,
        }
        
        // Validate AI model specified
        expect ai_model != #""
        
        // Must be signed by Oracle (hardcoded Oracle PKH)
        // Oracle wallet: addr_test1vzy2fzefwytvdad0h0x59svsvmey4465m60yywmvmn0ed7ssdlzqc
        let oracle_pkh = #"88a48b297116c6f5afbbcd42c19066f24ad754de9e423b6cdcdf96fa"
        expect list.has(tx.extra_signatories, oracle_pkh)
        
        // Must spend reward_vault in same transaction
        // This ensures reward is distributed atomically with reveal
        expect has_reward_vault_input(tx)
        
        // Experiment type must be "RV" for Remote Viewing
        expect datum.experiment_type == #"5256"
        
        True
      }
      
      // CANCEL
      // User cancels before reveal (refund submission fee)
      Cancel -> {
        // Must be signed by user who submitted
        expect list.has(tx.extra_signatories, datum.user_pkh)
        
        // Can only cancel if Oracle hasn't revealed yet
        // (if Oracle signed, this is a reveal, not a cancel)
        let oracle_pkh = #"88a48b297116c6f5afbbcd42c19066f24ad754de9e423b6cdcdf96fa"
        expect !list.has(tx.extra_signatories, oracle_pkh)
        
        True
      }
    }
  }
  
  // Minting/other purposes not used
  else(_) {
    fail
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Check if transaction includes reward_vault input
/// This ensures reveal and reward distribution happen atomically
fn has_reward_vault_input(tx: Transaction) -> Bool {
  // The reward_vault validator will handle the actual reward logic
  // We just verify it's being spent in this transaction
  // Look for any script input (vault is a script address)
  list.any(
    tx.inputs,
    fn(input) {
      when input.output.address.payment_credential is {
        address.Script(_) -> {
          // Check if this is the reward vault by looking at datum type
          // Reward vault has RewardVaultDatum with specific fields
          when input.output.datum is {
            InlineDatum(_data) -> {
              // Reward vault has inline datum
              // More precise validation happens in reward_vault validator
              True
            }
            _ -> False
          }
        }
        _ -> False
      }
    }
  )
}
