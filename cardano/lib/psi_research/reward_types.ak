use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{PolicyId}

// ============================================================================
// REWARD VAULT TYPES
// ============================================================================

/// Datum for the Psy token reward vault
/// Tracks decay parameters and claim count for hyperbolic reward distribution
pub type RewardVaultDatum {
  /// Policy ID of the Psy token
  psy_policy_id: PolicyId,
  /// Asset name of the Psy token
  psy_asset_name: ByteArray,
  /// Initial reward amount (in token units)
  base_reward: Int,
  /// Controls decay speed (higher = slower decay)
  decay_factor: Int,
  /// Total number of claims made so far
  total_claims: Int,
  /// Script hash of the psi_experiment validator (for settlement proof)
  experiment_script_hash: ByteArray,
  /// Admin PKH for top-up and parameter changes
  admin_pkh: VerificationKeyHash,
}

/// Redeemers for the reward vault
pub type RewardRedeemer {
  /// Participant claims Psy tokens during game settlement
  ClaimReward { participant: VerificationKeyHash }
  /// Admin deposits additional Psy tokens
  TopUp
  /// Admin adjusts decay parameters
  UpdateParams { new_base_reward: Int, new_decay_factor: Int }
}

// ============================================================================
// REWARD CALCULATION
// ============================================================================

/// Calculate reward using hyperbolic decay:
/// reward = base_reward * decay_factor / (decay_factor + total_claims)
///
/// Properties:
/// - total_claims = 0  -> reward = base_reward (full reward for first claim)
/// - total_claims = decay_factor -> reward = base_reward / 2 (half at midpoint)
/// - As claims grow -> reward asymptotically approaches 0
pub fn calculate_reward(base_reward: Int, decay_factor: Int, total_claims: Int) -> Int {
  base_reward * decay_factor / (decay_factor + total_claims)
}

// ============================================================================
// TESTS
// ============================================================================

test reward_first_claim() {
  // First claim gets full base_reward
  calculate_reward(1000, 100, 0) == 1000
}

test reward_at_midpoint() {
  // At decay_factor claims, reward is half
  calculate_reward(1000, 100, 100) == 500
}

test reward_decays() {
  // More claims = less reward
  let early = calculate_reward(1000, 100, 10)
  let late = calculate_reward(1000, 100, 1000)
  early > late
}

test reward_never_negative() {
  // Even with many claims, reward stays non-negative
  calculate_reward(1000, 100, 1000000) >= 0
}

test reward_large_decay_factor() {
  // Large decay_factor means slower decay
  let slow_decay = calculate_reward(1000, 10000, 100)
  let fast_decay = calculate_reward(1000, 10, 100)
  slow_decay > fast_decay
}
