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
  /// Initial reward amount (in token units) - participation floor
  base_reward: Int,
  /// Extra PSY pool for high-accuracy scores (cubic curve)
  bonus_pool: Int,
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
  ClaimReward { participant: VerificationKeyHash, score: Int }
  /// Admin deposits additional Psy tokens
  TopUp
  /// Admin adjusts decay/bonus parameters
  UpdateParams { new_base_reward: Int, new_bonus_pool: Int, new_decay_factor: Int }
}

// ============================================================================
// REWARD CALCULATION
// ============================================================================

/// Calculate base reward using hyperbolic decay:
/// reward = base_reward * decay_factor / (decay_factor + total_claims)
///
/// Properties:
/// - total_claims = 0  -> reward = base_reward (full reward for first claim)
/// - total_claims = decay_factor -> reward = base_reward / 2 (half at midpoint)
/// - As claims grow -> reward asymptotically approaches 0
pub fn calculate_reward(base_reward: Int, decay_factor: Int, total_claims: Int) -> Int {
  base_reward * decay_factor / (decay_factor + total_claims)
}

/// Calculate scored reward with cubic bonus and hyperbolic decay:
///   score_bonus = bonus_pool * score^3 / 1_000_000
///   scored_reward = base_reward + score_bonus
///   total = scored_reward * decay_factor / (decay_factor + total_claims)
///
/// score: 0-100, so score^3 ranges from 0 to 1_000_000
/// A score of 0 gets only base_reward; a perfect 100 gets base_reward + bonus_pool
pub fn calculate_scored_reward(
  base_reward: Int,
  bonus_pool: Int,
  decay_factor: Int,
  total_claims: Int,
  score: Int,
) -> Int {
  let score_bonus = bonus_pool * score * score * score / 1_000_000
  let scored_reward = base_reward + score_bonus
  scored_reward * decay_factor / (decay_factor + total_claims)
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

// Scored reward tests

test scored_reward_zero_score() {
  // Score 0 gets only base_reward (no bonus)
  calculate_scored_reward(100, 900, 10000, 0, 0) == 100
}

test scored_reward_perfect_score() {
  // Score 100: bonus = 900 * 100^3 / 10^6 = 900
  // scored_reward = 100 + 900 = 1000
  calculate_scored_reward(100, 900, 10000, 0, 100) == 1000
}

test scored_reward_half_score() {
  // Score 50: bonus = 900 * 125000 / 1000000 = 112 (integer division)
  // scored_reward = 100 + 112 = 212
  calculate_scored_reward(100, 900, 10000, 0, 50) == 212
}

test scored_reward_with_decay() {
  // Score 100 at midpoint (decay_factor claims): reward is halved
  // scored_reward = 1000, total = 1000 * 10000 / (10000 + 10000) = 500
  calculate_scored_reward(100, 900, 10000, 10000, 100) == 500
}

test scored_reward_low_score_with_decay() {
  // Score 0 at midpoint: reward = 100 * 10000 / 20000 = 50
  calculate_scored_reward(100, 900, 10000, 10000, 0) == 50
}

test scored_reward_cubic_scaling() {
  // Higher scores get exponentially more: 70 > 50 > 20
  let low = calculate_scored_reward(100, 900, 10000, 0, 20)
  let mid = calculate_scored_reward(100, 900, 10000, 0, 50)
  let high = calculate_scored_reward(100, 900, 10000, 0, 70)
  low < mid && mid < high
}
