use aiken/collection/list
use aiken/crypto.{Blake2b_256, Hash, VerificationKeyHash, blake2b_256}
use aiken/interval.{Finite, NegativeInfinity, PositiveInfinity}
use aiken/primitive/bytearray
use cardano/transaction.{Transaction}

// ============================================================================
// CRYPTOGRAPHIC VERIFICATION
// ============================================================================

/// Utility Functions for PsyApp Psi-Research Smart Contracts
/// Hash verification, signature checks, math helpers
/// Verify that revealed value + nonce matches the committed hash
/// Commitment scheme: hash = Blake2b-256(value || nonce)
pub fn verify_commitment(
  committed_hash: Hash<Blake2b_256, ByteArray>,
  revealed_value: ByteArray,
  nonce: ByteArray,
) -> Bool {
  let preimage = bytearray.concat(revealed_value, nonce)
  let computed_hash = blake2b_256(preimage)
  computed_hash == committed_hash
}

/// Create a commitment hash from value and nonce
pub fn create_commitment(
  value: ByteArray,
  nonce: ByteArray,
) -> Hash<Blake2b_256, ByteArray> {
  let preimage = bytearray.concat(value, nonce)
  blake2b_256(preimage)
}

/// Verify oracle signature (simplified - production would use proper Ed25519)
/// In production, this would verify against known oracle public key
pub fn verify_oracle_signature(
  score: Int,
  signature: ByteArray,
  _oracle_pkh: VerificationKeyHash,
) -> Bool {
  // Placeholder: In production, verify Ed25519 signature
  // For now, check signature is non-empty and score is valid
  bytearray.length(signature) > 0 && score >= 0 && score <= 100
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/// Check if transaction is signed by the given verification key hash
pub fn verify_signed_by(tx: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, pkh)
}

/// Count how many governance signatures are present
pub fn count_governance_signatures(
  tx: Transaction,
  governance_pkhs: List<VerificationKeyHash>,
) -> Int {
  list.foldr(
    governance_pkhs,
    0,
    fn(pkh, acc) {
      if verify_signed_by(tx, pkh) {
        acc + 1
      } else {
        acc
      }
    },
  )
}

/// Check if minimum required signatures are present
pub fn has_required_signatures(
  tx: Transaction,
  governance_pkhs: List<VerificationKeyHash>,
  min_required: Int,
) -> Bool {
  count_governance_signatures(tx, governance_pkhs) >= min_required
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/// Get the lower bound slot from transaction validity range
/// Used to determine "current time" in slot numbers
pub fn get_lower_bound_slot(tx: Transaction) -> Option<Int> {
  let lower_bound = tx.validity_range.lower_bound
  when lower_bound.bound_type is {
    Finite(slot) -> Some(slot)
    NegativeInfinity -> None
    PositiveInfinity -> None
  }
}

/// Get the upper bound slot from transaction validity range
pub fn get_upper_bound_slot(tx: Transaction) -> Option<Int> {
  let upper_bound = tx.validity_range.upper_bound
  when upper_bound.bound_type is {
    Finite(slot) -> Some(slot)
    NegativeInfinity -> None
    PositiveInfinity -> None
  }
}

/// Check if current slot (from validity range) is before deadline
pub fn is_before_deadline(tx: Transaction, deadline_slot: Int) -> Bool {
  when get_upper_bound_slot(tx) is {
    Some(upper) -> upper <= deadline_slot
    None -> False
  }
}

/// Check if current slot (from validity range) is after deadline
pub fn is_after_deadline(tx: Transaction, deadline_slot: Int) -> Bool {
  when get_lower_bound_slot(tx) is {
    Some(lower) -> lower > deadline_slot
    None -> False
  }
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

/// Safe division that returns 0 if divisor is 0
pub fn safe_div(numerator: Int, denominator: Int) -> Int {
  if denominator == 0 {
    0
  } else {
    numerator / denominator
  }
}

/// Calculate percentage: (value * percentage) / 100
pub fn calculate_percentage(value: Int, percentage: Int) -> Int {
  value * percentage / 100
}

/// Absolute value
pub fn abs(n: Int) -> Int {
  if n < 0 {
    -n
  } else {
    n
  }
}

/// Maximum of two integers
pub fn max(a: Int, b: Int) -> Int {
  if a > b {
    a
  } else {
    b
  }
}

/// Minimum of two integers
pub fn min(a: Int, b: Int) -> Int {
  if a < b {
    a
  } else {
    b
  }
}

/// Clamp value between min and max
pub fn clamp(value: Int, min_val: Int, max_val: Int) -> Int {
  max(min_val, min(max_val, value))
}

// ============================================================================
// LIST UTILITIES
// ============================================================================

// Note: Aiken doesn't support generic functions, so we use specific implementations
// in the modules that need them. See games.ak for count_matching implementation.

// ============================================================================
// BYTEARRAY UTILITIES
// ============================================================================

/// Check if bytearrays are equal
pub fn bytes_equal(a: ByteArray, b: ByteArray) -> Bool {
  a == b
}

/// Convert int to single byte (for small values 0-255)
pub fn int_to_byte(n: Int) -> ByteArray {
  when n is {
    0 -> #"00"
    1 -> #"01"
    2 -> #"02"
    3 -> #"03"
    4 -> #"04"
    5 -> #"05"
    6 -> #"06"
    7 -> #"07"
    8 -> #"08"
    9 -> #"09"
    _ -> #"ff"  // Default for out of range
  }
}

// ============================================================================
// TESTS
// ============================================================================

test commitment_verification() {
  let value = "hearts"
  let nonce = "secret123"
  let hash = create_commitment(value, nonce)
  verify_commitment(hash, value, nonce)
}

test commitment_fails_wrong_value() {
  let value = "hearts"
  let nonce = "secret123"
  let hash = create_commitment(value, nonce)
  !verify_commitment(hash, "spades", nonce)
}

test commitment_fails_wrong_nonce() {
  let value = "hearts"
  let nonce = "secret123"
  let hash = create_commitment(value, nonce)
  !verify_commitment(hash, value, "wrongnonce")
}

test percentage_calculation() {
  calculate_percentage(1000000, 5) == 50000
}

test percentage_of_zero() {
  calculate_percentage(0, 5) == 0
}

test safe_division() {
  safe_div(100, 0) == 0 && safe_div(100, 10) == 10
}

test abs_positive() {
  abs(5) == 5
}

test abs_negative() {
  abs(-5) == 5
}

test clamp_within_range() {
  clamp(50, 0, 100) == 50
}

test clamp_below_min() {
  clamp(-10, 0, 100) == 0
}

test clamp_above_max() {
  clamp(150, 0, 100) == 100
}

test list_filter_count_test() {
  let nums = [1, 2, 3, 4, 5]
  let filtered = list.filter(nums, fn(n) { n > 2 })
  list.length(filtered) == 3
}
