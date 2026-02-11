use aiken/crypto.{blake2b_256}
use aiken/primitive/bytearray
use psi_research/utils.{create_commitment, verify_commitment}

// ============================================================================
// COMMITMENT CREATION TESTS
// ============================================================================

/// Unit Tests for Commit-Reveal Cryptographic Scheme
/// Tests commitment creation, verification, and edge cases
test create_commitment_basic() {
  let value = "hearts"
  let nonce = "secret123"
  let hash = create_commitment(value, nonce)

  // Hash should be 32 bytes (Blake2b-256)
  bytearray.length(hash) == 32
}

test create_commitment_deterministic() {
  let value = "spades"
  let nonce = "nonce456"

  let hash1 = create_commitment(value, nonce)
  let hash2 = create_commitment(value, nonce)

  hash1 == hash2
}

test create_commitment_different_values() {
  let nonce = "same_nonce"

  let hash1 = create_commitment("hearts", nonce)
  let hash2 = create_commitment("spades", nonce)

  hash1 != hash2
}

test create_commitment_different_nonces() {
  let value = "hearts"

  let hash1 = create_commitment(value, "nonce1")
  let hash2 = create_commitment(value, "nonce2")

  hash1 != hash2
}

// ============================================================================
// COMMITMENT VERIFICATION TESTS
// ============================================================================

test verify_commitment_correct_values() {
  let value = "diamonds"
  let nonce = "secret_nonce_789"
  let hash = create_commitment(value, nonce)

  verify_commitment(hash, value, nonce)
}

test verify_commitment_wrong_value() {
  let value = "diamonds"
  let nonce = "secret_nonce_789"
  let hash = create_commitment(value, nonce)

  !verify_commitment(hash, "clubs", nonce)
}

test verify_commitment_wrong_nonce() {
  let value = "diamonds"
  let nonce = "secret_nonce_789"
  let hash = create_commitment(value, nonce)

  !verify_commitment(hash, value, "wrong_nonce")
}

test verify_commitment_both_wrong() {
  let value = "diamonds"
  let nonce = "secret_nonce_789"
  let hash = create_commitment(value, nonce)

  !verify_commitment(hash, "clubs", "wrong_nonce")
}

// ============================================================================
// EDGE CASES
// ============================================================================

test commit_empty_value() {
  let value = ""
  let nonce = "nonce"
  let hash = create_commitment(value, nonce)

  verify_commitment(hash, value, nonce)
}

test commit_empty_nonce() {
  let value = "hearts"
  let nonce = ""
  let hash = create_commitment(value, nonce)

  verify_commitment(hash, value, nonce)
}

test commit_both_empty() {
  let value = ""
  let nonce = ""
  let hash = create_commitment(value, nonce)

  verify_commitment(hash, value, nonce)
}

test commit_long_value() {
  let value =
    "this_is_a_very_long_value_that_might_be_used_for_remote_viewing_descriptions_or_other_lengthy_data"
  let nonce = "nonce"
  let hash = create_commitment(value, nonce)

  verify_commitment(hash, value, nonce)
}

test commit_binary_data() {
  let value = #"deadbeef0123456789"
  let nonce = #"cafebabe"
  let hash = create_commitment(value, nonce)

  verify_commitment(hash, value, nonce)
}

// ============================================================================
// GAME-SPECIFIC COMMITMENT TESTS
// ============================================================================

test commit_card_prediction() {
  // Test committing to a card value (1-5 for Zener)
  let target_card = "3"
  // Square
  let nonce = "session_xyz_host_secret"
  let hash = create_commitment(target_card, nonce)

  verify_commitment(hash, target_card, nonce) && !verify_commitment(
    hash,
    "1",
    nonce,
  ) && !verify_commitment(hash, "2", nonce) && !verify_commitment(
    hash,
    "4",
    nonce,
  ) && !verify_commitment(hash, "5", nonce)
}

test commit_coin_flip() {
  // Test committing to binary outcome
  let target = "heads"
  let nonce = "flip_session_001"
  let hash = create_commitment(target, nonce)

  verify_commitment(hash, target, nonce) && !verify_commitment(
    hash,
    "tails",
    nonce,
  )
}

test commit_dice_roll() {
  // Test committing to dice value (1-6)
  let target = "4"
  let nonce = "dice_session_secret"
  let hash = create_commitment(target, nonce)

  verify_commitment(hash, target, nonce)
}

test commit_emotion_echo() {
  // Test committing to emotion (8 Plutchik emotions)
  let target = "joy"
  let nonce = "emotion_session_secret"
  let hash = create_commitment(target, nonce)

  verify_commitment(hash, target, nonce) && !verify_commitment(
    hash,
    "sadness",
    nonce,
  ) && !verify_commitment(hash, "anger", nonce) && !verify_commitment(
    hash,
    "fear",
    nonce,
  )
}

// ============================================================================
// SECURITY TESTS
// ============================================================================

test commitment_unique_per_session() {
  // Same value with different nonces should produce different commitments
  let value = "hearts"
  let session1_nonce = "session_001_unique_id"
  let session2_nonce = "session_002_unique_id"

  let hash1 = create_commitment(value, session1_nonce)
  let hash2 = create_commitment(value, session2_nonce)

  hash1 != hash2
}

test commitment_non_invertible() {
  // Verifies we can't guess the value from the hash
  // (This is a conceptual test - Blake2b is cryptographically secure)
  let hash = create_commitment("hearts", "secret")

  // Trying every possible value should only match the correct one
  !verify_commitment(hash, "spades", "secret") && !verify_commitment(
    hash,
    "diamonds",
    "secret",
  ) && !verify_commitment(hash, "clubs", "secret") && verify_commitment(
    hash,
    "hearts",
    "secret",
  )
}

// ============================================================================
// HASH PREIMAGE TESTS
// ============================================================================

test manual_hash_construction() {
  // Verify manual hash matches our commitment function
  let value = "test_value"
  let nonce = "test_nonce"

  let preimage = bytearray.concat(value, nonce)
  let manual_hash = blake2b_256(preimage)

  let commitment_hash = create_commitment(value, nonce)

  manual_hash == commitment_hash
}

test preimage_order_matters() {
  // value || nonce should be different from nonce || value
  let value = "abc"
  let nonce = "xyz"

  let hash1 = create_commitment(value, nonce)

  // Create hash with reversed order (this simulates an attacker trying to swap)
  let reversed_preimage = bytearray.concat(nonce, value)
  let reversed_hash = blake2b_256(reversed_preimage)

  // The hashes should be different
  hash1 != reversed_hash
}
