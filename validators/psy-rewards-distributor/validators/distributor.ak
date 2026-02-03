use aiken/collection/list
use aiken/crypto.{Blake2b_224, Hash, VerificationKey, blake2b_256}
use aiken/primitive/bytearray
use aiken/interval.{Finite}
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, VerificationKeyCredential}
use aiken/transaction/value.{lovelace_of}

/// Distributor datum - stores snapshot data
pub type DistributorDatum {
  /// Merkle root of holder snapshot
  merkle_root: ByteArray,
  /// Total PSY supply at snapshot
  total_psy_supply: Int,
  /// Total ADA reward pool (lovelace)
  accumulated_ada: Int,
  /// Snapshot timestamp (POSIX ms)
  snapshot_time: Int,
  /// Snapshot period number (1, 2, 3, ...)
  snapshot_period: Int,
  /// List of addresses that have claimed
  claimed_addresses: List<Hash<Blake2b_224, VerificationKey>>,
  /// Admin public key hash
  admin_pkh: Hash<Blake2b_224, VerificationKey>,
  /// Minimum reward threshold (lovelace)
  min_reward_threshold: Int,
}

/// Redeemer actions
pub type DistributorRedeemer {
  /// Admin: Submit new snapshot
  SubmitSnapshot {
    new_merkle_root: ByteArray,
    new_total_supply: Int,
    new_reward_pool: Int,
    new_period: Int,
  }
  /// User: Claim reward with Merkle proof
  Claim {
    psy_balance: Int,
    merkle_proof: List<ByteArray>,
    is_left: List<Bool>,
  }
  /// Admin: Withdraw unclaimed rewards after expiry
  WithdrawExpired { new_period: Int }
}

validator distributor {
  spend(
    datum: Option<DistributorDatum>,
    redeemer: DistributorRedeemer,
    _own_ref: Data,
    ctx: ScriptContext,
  ) {
    // Extract datum
    expect Some(dist_datum) = datum
    
    when redeemer is {
      // SUBMIT SNAPSHOT: Admin submits new snapshot
      SubmitSnapshot {
        new_merkle_root,
        new_total_supply,
        new_reward_pool,
        new_period,
      } -> {
        expect Spend(own_input_ref) = ctx.purpose
        let tx = ctx.transaction
        
        // Find own input
        expect Some(own_input) =
          list.find(tx.inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address
        
        // Check 1: Signed by admin
        let signed_by_admin = list.has(tx.extra_signatories, dist_datum.admin_pkh)
        
        // Check 2: Period increments
        let valid_period = new_period == dist_datum.snapshot_period + 1
        
        // Check 3: Total supply is positive
        let valid_supply = new_total_supply > 0
        
        // Check 4: Merkle root is valid (32 bytes)
        let valid_merkle_root = bytearray.length(new_merkle_root) == 32
        
        // Check 5: Continuing output with new datum
        expect Some(continuing_output) =
          list.find(tx.outputs, fn(output) { output.address == own_address })
        
        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: DistributorDatum = continuing_datum_data
        
        let datum_updated =
          continuing_datum.merkle_root == new_merkle_root && continuing_datum.total_psy_supply == new_total_supply && continuing_datum.accumulated_ada == new_reward_pool && continuing_datum.snapshot_period == new_period && list.length(
            continuing_datum.claimed_addresses,
          ) == 0
        
        // Check 6: ADA value matches reward pool
        let output_ada = lovelace_of(continuing_output.value)
        let value_correct = output_ada >= new_reward_pool
        
        signed_by_admin? && valid_period? && valid_supply? && valid_merkle_root? && datum_updated? && value_correct?
      }
      
      // CLAIM: User claims reward with Merkle proof
      Claim { psy_balance, merkle_proof, is_left } -> {
        expect Spend(own_input_ref) = ctx.purpose
        let tx = ctx.transaction
        
        // Find own input
        expect Some(own_input) =
          list.find(tx.inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address
        
        // Get claimer's PKH from extra signatories
        expect [claimer_pkh, ..] = tx.extra_signatories
        
        // Check 1: Claimer hasn't claimed yet
        let not_claimed = !list.has(dist_datum.claimed_addresses, claimer_pkh)
        
        // Check 2: PSY balance is positive
        let valid_balance = psy_balance > 0
        
        // Check 3: Calculate expected reward share
        let reward_share =
          psy_balance * dist_datum.accumulated_ada / dist_datum.total_psy_supply
        
        // Check 4: Reward is above minimum threshold
        let above_threshold = reward_share >= dist_datum.min_reward_threshold
        
        // Check 5: Verify Merkle proof
        let leaf_data = build_leaf_data(claimer_pkh, psy_balance)
        let leaf_hash = blake2b_256(leaf_data)
        let merkle_valid =
          verify_merkle_proof(
            leaf_hash,
            merkle_proof,
            is_left,
            dist_datum.merkle_root,
          )
        
        // Check 6: Reward sent to claimer
        let claimer_address =
          Address {
            payment_credential: VerificationKeyCredential(claimer_pkh),
            stake_credential: None,
          }
        
        let reward_sent =
          list.any(
            tx.outputs,
            fn(output) {
              output.address == claimer_address && lovelace_of(output.value) >= reward_share
            },
          )
        
        // Check 7: Continuing output with updated datum
        expect Some(continuing_output) =
          list.find(tx.outputs, fn(output) { output.address == own_address })
        
        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: DistributorDatum = continuing_datum_data
        
        let claimed_updated = list.has(continuing_datum.claimed_addresses, claimer_pkh)
        
        // Check 8: ADA value decreased by reward_share
        let input_ada = lovelace_of(own_input.output.value)
        let output_ada = lovelace_of(continuing_output.value)
        let value_decreased = output_ada == input_ada - reward_share
        
        not_claimed? && valid_balance? && above_threshold? && merkle_valid? && reward_sent? && claimed_updated? && value_decreased?
      }
      
      // WITHDRAW EXPIRED: Admin withdraws unclaimed rewards
      WithdrawExpired { new_period } -> {
        let tx = ctx.transaction
        
        // Check 1: Signed by admin
        let signed_by_admin = list.has(tx.extra_signatories, dist_datum.admin_pkh)
        
        // Check 2: Snapshot is old (>30 days)
        expect Finite(current_time) = tx.validity_range.lower_bound.bound_type
        let snapshot_age = current_time - dist_datum.snapshot_time
        let month_ms = 2592000000
        let snapshot_expired = snapshot_age > month_ms
        
        // Check 3: Moving to new period
        let valid_period = new_period > dist_datum.snapshot_period
        
        signed_by_admin? && snapshot_expired? && valid_period?
      }
    }
  }

  else(_) {
    fail
  }
}

/// Build leaf data for Merkle tree
fn build_leaf_data(
  pkh: Hash<Blake2b_224, VerificationKey>,
  psy_balance: Int,
) -> ByteArray {
  // Convert psy_balance to 8-byte big-endian
  let balance_bytes = int_to_bytes_8(psy_balance)
  bytearray.concat(pkh, balance_bytes)
}

/// Verify Merkle proof
fn verify_merkle_proof(
  leaf_hash: ByteArray,
  proof: List<ByteArray>,
  is_left: List<Bool>,
  root: ByteArray,
) -> Bool {
  when proof is {
    [] -> leaf_hash == root
    [sibling, ..rest_proof] -> {
      expect [is_left_sibling, ..rest_is_left] = is_left
      
      let combined =
        if is_left_sibling {
          bytearray.concat(leaf_hash, sibling)
        } else {
          bytearray.concat(sibling, leaf_hash)
        }
      
      let parent_hash = blake2b_256(combined)
      
      verify_merkle_proof(parent_hash, rest_proof, rest_is_left, root)
    }
  }
}

/// Convert integer to 8-byte big-endian representation
fn int_to_bytes_8(n: Int) -> ByteArray {
  // Simple encoding for now (placeholder)
  // In production, use proper 64-bit encoding
  let b7 = bytearray.push(#"", n / 72057594037927936 % 256)
  let b6 = bytearray.push(b7, n / 281474976710656 % 256)
  let b5 = bytearray.push(b6, n / 1099511627776 % 256)
  let b4 = bytearray.push(b5, n / 4294967296 % 256)
  let b3 = bytearray.push(b4, n / 16777216 % 256)
  let b2 = bytearray.push(b3, n / 65536 % 256)
  let b1 = bytearray.push(b2, n / 256 % 256)
  bytearray.push(b1, n % 256)
}
