use aiken/collection/list
use aiken/crypto.{Blake2b_224, Hash, VerificationKey, blake2b_256}
use aiken/primitive/bytearray
use aiken/interval
use cardano/address.{Address, VerificationKey as VKCred}
use cardano/assets.{lovelace_of}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}

/// Distributor datum - stores snapshot data
pub type DistributorDatum {
  merkle_root: ByteArray,
  total_psy_supply: Int,
  accumulated_ada: Int,
  snapshot_time: Int,
  snapshot_period: Int,
  claimed_addresses: List<Hash<Blake2b_224, VerificationKey>>,
  admin_pkh: Hash<Blake2b_224, VerificationKey>,
  min_reward_threshold: Int,
}

/// Redeemer actions
pub type DistributorRedeemer {
  SubmitSnapshot {
    new_merkle_root: ByteArray,
    new_total_supply: Int,
    new_reward_pool: Int,
    new_period: Int,
  }
  Claim {
    psy_balance: Int,
    merkle_proof: List<ByteArray>,
    is_left: List<Bool>,
  }
  WithdrawExpired { new_period: Int }
}

validator distributor {
  spend(
    datum: Option<DistributorDatum>,
    redeemer: DistributorRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(dist_datum) = datum
    
    when redeemer is {
      SubmitSnapshot {
        new_merkle_root,
        new_total_supply,
        new_reward_pool,
        new_period,
      } -> {
        // Check 1: Signed by admin
        expect list.has(self.extra_signatories, dist_datum.admin_pkh)
        
        // Check 2: Period increments
        expect new_period == dist_datum.snapshot_period + 1
        
        // Check 3: Valid supply and merkle root
        expect new_total_supply > 0
        expect bytearray.length(new_merkle_root) == 32
        
        True
      }
      
      Claim { psy_balance, merkle_proof, is_left } -> {
        // Get claimer PKH
        expect [claimer_pkh, ..] = self.extra_signatories
        
        // Check 1: Not claimed yet
        expect !list.has(dist_datum.claimed_addresses, claimer_pkh)
        
        // Check 2: Valid balance
        expect psy_balance > 0
        
        // Check 3: Calculate reward share
        let reward_share =
          psy_balance * dist_datum.accumulated_ada / dist_datum.total_psy_supply
        expect reward_share >= dist_datum.min_reward_threshold
        
        // Check 4: Verify Merkle proof
        let leaf_data = build_leaf_data(claimer_pkh, psy_balance)
        let leaf_hash = blake2b_256(leaf_data)
        expect verify_merkle_proof(
          leaf_hash,
          merkle_proof,
          is_left,
          dist_datum.merkle_root,
        )
        
        // Check 5: Reward sent to claimer
        let claimer_address =
          Address {
            payment_credential: VKCred(claimer_pkh),
            stake_credential: None,
          }
        
        expect list.any(
          self.outputs,
          fn(output) {
            output.address == claimer_address && lovelace_of(output.value) >= reward_share
          },
        )
        
        True
      }
      
      WithdrawExpired { new_period } -> {
        // Check 1: Signed by admin
        expect list.has(self.extra_signatories, dist_datum.admin_pkh)
        
        // Check 2: Snapshot expired (>30 days)
        expect interval.Finite(current_time) =
          self.validity_range.lower_bound.bound_type
        let snapshot_age = current_time - dist_datum.snapshot_time
        expect snapshot_age > 2592000000
        
        // Check 3: Valid period
        expect new_period > dist_datum.snapshot_period
        
        True
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
  let balance_bytes = int_to_bytes_8(psy_balance)
  bytearray.concat(pkh, balance_bytes)
}

/// Verify Merkle proof recursively
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

/// Convert integer to 8-byte big-endian
fn int_to_bytes_8(n: Int) -> ByteArray {
  let b7 = bytearray.push(#"", n / 72057594037927936 % 256)
  let b6 = bytearray.push(b7, n / 281474976710656 % 256)
  let b5 = bytearray.push(b6, n / 1099511627776 % 256)
  let b4 = bytearray.push(b5, n / 4294967296 % 256)
  let b3 = bytearray.push(b4, n / 16777216 % 256)
  let b2 = bytearray.push(b3, n / 65536 % 256)
  let b1 = bytearray.push(b2, n / 256 % 256)
  bytearray.push(b1, n % 256)
}
