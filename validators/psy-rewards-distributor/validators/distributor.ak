use aiken/collection/list
use aiken/crypto.{Hash, VerificationKey, blake2b_256}
use aiken/primitive/bytearray
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, PaymentCredential}
use aiken/transaction/value.{Value, ada_asset_name, ada_policy_id, quantity_of}

/// Merkle tree node (leaf or branch hash)
type MerkleNode =
  ByteArray

/// Merkle proof path (list of sibling hashes)
type MerklePath =
  List<ByteArray>

/// Distributor datum - stores snapshot data
type DistributorDatum {
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
  /// List of addresses that have claimed (prevent double-claim)
  claimed_addresses: List<Hash<Blake2b_224, VerificationKey>>,
  /// Admin public key hash (can submit snapshots)
  admin_pkh: Hash<Blake2b_224, VerificationKey>,
  /// Minimum reward threshold (lovelace) - don't distribute dust
  min_reward_threshold: Int,
}

/// Redeemer actions
type DistributorRedeemer {
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
    merkle_proof: MerklePath,
    is_left: List<Bool>,
  }
  /// Admin: Withdraw unclaimed rewards after expiry
  WithdrawExpired { new_period: Int }
}

/// PSY rewards distributor validator
validator distributor {
  spend(
    datum_opt: Option<DistributorDatum>,
    redeemer: DistributorRedeemer,
    _own_ref: Data,
    ctx: ScriptContext,
  ) {
    // Extract datum
    expect Some(datum) = datum_opt

    when redeemer is {
      // ========================================
      // SUBMIT SNAPSHOT: Admin submits new snapshot
      // ========================================
      SubmitSnapshot {
        new_merkle_root,
        new_total_supply,
        new_reward_pool,
        new_period,
      } -> {
        let ScriptContext { transaction, purpose } = ctx
        expect Spend(own_input_ref) = purpose
        let Transaction { inputs, outputs, extra_signatories, .. } = transaction

        // Find own input
        expect Some(own_input) =
          list.find(inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address

        // Check 1: Signed by admin
        let signed_by_admin = list.has(extra_signatories, datum.admin_pkh)

        // Check 2: Period increments
        let valid_period = new_period == datum.snapshot_period + 1

        // Check 3: Total supply is positive
        let valid_supply = new_total_supply > 0

        // Check 4: Merkle root is valid (non-empty)
        let valid_merkle_root = bytearray.length(new_merkle_root) == 32

        // Check 5: Continuing output with new datum
        expect Some(continuing_output) =
          list.find(outputs, fn(output) { output.address == own_address })

        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: DistributorDatum = continuing_datum_data

        let datum_updated =
          continuing_datum.merkle_root == new_merkle_root && continuing_datum.total_psy_supply == new_total_supply && continuing_datum.accumulated_ada == new_reward_pool && continuing_datum.snapshot_period == new_period && list.length(
            continuing_datum.claimed_addresses,
          ) == 0

        // Check 6: ADA value matches reward pool
        let output_ada =
          quantity_of(continuing_output.value, ada_policy_id, ada_asset_name)
        let value_correct = output_ada >= new_reward_pool

        signed_by_admin && valid_period && valid_supply && valid_merkle_root && datum_updated && value_correct
      }

      // ========================================
      // CLAIM: User claims reward with Merkle proof
      // ========================================
      Claim { psy_balance, merkle_proof, is_left } -> {
        let ScriptContext { transaction, purpose } = ctx
        expect Spend(own_input_ref) = purpose
        let Transaction { inputs, outputs, extra_signatories, .. } = transaction

        // Find own input
        expect Some(own_input) =
          list.find(inputs, fn(input) { input.output_reference == own_input_ref })
        let own_address = own_input.output.address

        // Get claimer's PKH from extra signatories
        expect [claimer_pkh, ..] = extra_signatories

        // Check 1: Claimer hasn't claimed yet
        let not_claimed =
          !list.has(datum.claimed_addresses, claimer_pkh)

        // Check 2: PSY balance is positive
        let valid_balance = psy_balance > 0

        // Check 3: Calculate expected reward share
        let reward_share =
          psy_balance * datum.accumulated_ada / datum.total_psy_supply

        // Check 4: Reward is above minimum threshold
        let above_threshold = reward_share >= datum.min_reward_threshold

        // Check 5: Verify Merkle proof
        let leaf_data = build_leaf_data(claimer_pkh, psy_balance)
        let leaf_hash = blake2b_256(leaf_data)
        let merkle_valid =
          verify_merkle_proof(
            leaf_hash,
            merkle_proof,
            is_left,
            datum.merkle_root,
          )

        // Check 6: Reward sent to claimer
        let claimer_address =
          Address {
            payment_credential: PaymentCredential::VerificationKeyCredential(
              claimer_pkh,
            ),
            stake_credential: None,
          }

        let reward_sent =
          list.any(
            outputs,
            fn(output) {
              output.address == claimer_address && quantity_of(
                output.value,
                ada_policy_id,
                ada_asset_name,
              ) >= reward_share
            },
          )

        // Check 7: Continuing output with updated datum (add to claimed list)
        expect Some(continuing_output) =
          list.find(outputs, fn(output) { output.address == own_address })

        expect InlineDatum(continuing_datum_data) = continuing_output.datum
        expect continuing_datum: DistributorDatum = continuing_datum_data

        let claimed_updated =
          list.has(continuing_datum.claimed_addresses, claimer_pkh)

        // Check 8: ADA value decreased by reward_share
        let input_ada =
          quantity_of(own_input.output.value, ada_policy_id, ada_asset_name)
        let output_ada =
          quantity_of(continuing_output.value, ada_policy_id, ada_asset_name)
        let value_decreased = output_ada == input_ada - reward_share

        not_claimed && valid_balance && above_threshold && merkle_valid && reward_sent && claimed_updated && value_decreased
      }

      // ========================================
      // WITHDRAW EXPIRED: Admin withdraws unclaimed rewards
      // ========================================
      WithdrawExpired { new_period } -> {
        let ScriptContext { transaction, .. } = ctx
        let Transaction { extra_signatories, validity_range, .. } = transaction

        // Check 1: Signed by admin
        let signed_by_admin = list.has(extra_signatories, datum.admin_pkh)

        // Check 2: Snapshot is old (>30 days)
        expect ValidityRange {
          lower_bound: Finite(current_time),
          ..
        } = validity_range
        let snapshot_age = current_time - datum.snapshot_time
        let month_ms = 30 * 24 * 60 * 60 * 1000
        let snapshot_expired = snapshot_age > month_ms

        // Check 3: Moving to new period
        let valid_period = new_period > datum.snapshot_period

        signed_by_admin && snapshot_expired && valid_period
      }
    }
  }

  else(_) {
    fail @"Invalid purpose"
  }
}

/// Build leaf data for Merkle tree
/// Leaf = blake2b_256(pkh ++ psy_balance)
fn build_leaf_data(pkh: Hash<Blake2b_224, VerificationKey>, psy_balance: Int) -> ByteArray {
  // Convert psy_balance to bytes (big-endian, 8 bytes)
  let balance_bytes = int_to_bytes(psy_balance)
  bytearray.concat(pkh, balance_bytes)
}

/// Verify Merkle proof
/// Starting from leaf_hash, climb up the tree using proof path
fn verify_merkle_proof(
  leaf_hash: ByteArray,
  proof: MerklePath,
  is_left: List<Bool>,
  root: ByteArray,
) -> Bool {
  // Base case: empty proof, leaf should equal root
  when proof is {
    [] -> leaf_hash == root
    [sibling, ..rest_proof] -> {
      expect [is_left_sibling, ..rest_is_left] = is_left

      // Combine with sibling
      let combined =
        if is_left_sibling {
          // Current node is on left, sibling on right
          bytearray.concat(leaf_hash, sibling)
        } else {
          // Current node is on right, sibling on left
          bytearray.concat(sibling, leaf_hash)
        }

      // Hash the combined node
      let parent_hash = blake2b_256(combined)

      // Recurse up the tree
      verify_merkle_proof(parent_hash, rest_proof, rest_is_left, root)
    }
  }
}

/// Convert integer to bytes (simplified)
/// Returns 8-byte big-endian representation
fn int_to_bytes(n: Int) -> ByteArray {
  // For now, use a simple encoding (this would need proper implementation)
  // This is a placeholder - in production, use proper integer serialization
  if n < 256 {
    bytearray.from_int(n)
  } else {
    bytearray.from_int(n / 256) |> bytearray.concat(bytearray.from_int(n % 256))
  }
}
