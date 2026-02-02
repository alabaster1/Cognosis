// PSY Snapshot Rewards Distributor
// Plutus V3 contract written in Aiken
//
// Purpose: Distribute ADA rewards to PSY token holders based on monthly snapshots
// Revenue: 50% of platform fees (lottery + experiments)
// Distribution: Auto-send to holders (min 5 ADA threshold)

use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{ada_asset_name, ada_policy_id}

// Snapshot data structure
type Snapshot {
  block_height: Int,
  timestamp: Int,
  merkle_root: ByteArray,  // Root hash of holder balances (Merkle tree)
  total_psy_supply: Int,
  total_reward_pool: Int,  // ADA available for distribution (in lovelace)
  period: Int,             // Snapshot period number (1, 2, 3, ...)
}

// Holder claim proof (for verification)
type HolderProof {
  address: Address,
  psy_balance: Int,
  merkle_proof: List<ByteArray>,  // Merkle branch proof
}

// Redeemer actions
type Redeemer {
  SubmitSnapshot { snapshot: Snapshot }
  DistributeRewards { holders: List<HolderProof>, period: Int }
}

// Datum stored in contract
type Datum {
  current_snapshot: Snapshot,
  admin: Address,  // Only admin can submit snapshots
  distributed_periods: List<Int>,  // Track which periods already distributed
}

// Main validator
validator {
  fn rewards_distributor(
    datum: Datum,
    redeemer: Redeemer,
    ctx: ScriptContext,
  ) -> Bool {
    when redeemer is {
      // Admin submits new snapshot (off-chain calculated, on-chain verified)
      SubmitSnapshot { snapshot } -> {
        // Verify admin signature
        expect Spend(own_ref) = ctx.purpose
        let tx = ctx.transaction
        
        // Check admin signed transaction
        let signed_by_admin = list.has(tx.extra_signatories, datum.admin)
        
        // Verify snapshot is sequential (period increments)
        let valid_period = snapshot.period == datum.current_snapshot.period + 1
        
        // Verify snapshot is recent (block height within last 100 blocks)
        // TODO: Add block height validation
        
        // Update datum with new snapshot
        // (Spending script must output new datum with updated snapshot)
        
        signed_by_admin && valid_period
      }
      
      // Distribute rewards to holders (batch transaction)
      DistributeRewards { holders, period } -> {
        expect Spend(own_ref) = ctx.purpose
        let tx = ctx.transaction
        
        // Verify period matches current snapshot
        let valid_period = period == datum.current_snapshot.period
        
        // Verify period not already distributed
        let not_distributed = !list.has(datum.distributed_periods, period)
        
        // Verify each holder
        let all_valid = list.all(
          holders,
          fn(holder) {
            // Verify Merkle proof (holder had PSY at snapshot time)
            verify_merkle_proof(
              datum.current_snapshot.merkle_root,
              holder.merkle_proof,
              holder.address,
              holder.psy_balance,
            ) &&
            
            // Calculate expected reward
            let share = holder.psy_balance * 100 / datum.current_snapshot.total_psy_supply
            let reward = datum.current_snapshot.total_reward_pool * share / 100
            
            // Verify reward meets min threshold (5 ADA = 5,000,000 lovelace)
            reward >= 5_000_000 &&
            
            // Verify transaction sends correct amount to holder
            transaction_pays_to(tx, holder.address, reward)
          },
        )
        
        valid_period && not_distributed && all_valid
      }
    }
  }
}

// Helper: Verify Merkle proof
fn verify_merkle_proof(
  root: ByteArray,
  proof: List<ByteArray>,
  address: Address,
  balance: Int,
) -> Bool {
  // Create leaf hash (hash of address + balance)
  let leaf = hash_leaf(address, balance)
  
  // Compute root from leaf + proof path
  let computed_root = list.foldr(
    proof,
    leaf,
    fn(sibling, current) {
      hash_pair(current, sibling)
    },
  )
  
  // Check if computed root matches stored root
  computed_root == root
}

// Helper: Hash leaf node (address + balance)
fn hash_leaf(address: Address, balance: Int) -> ByteArray {
  // TODO: Implement proper serialization and hashing
  // For now, pseudocode:
  // blake2b_256(address ++ int_to_bytes(balance))
  #""  // Placeholder
}

// Helper: Hash two nodes together (Merkle tree internal node)
fn hash_pair(left: ByteArray, right: ByteArray) -> ByteArray {
  // TODO: Implement
  // blake2b_256(left ++ right)
  #""  // Placeholder
}

// Helper: Check if transaction pays specific amount to address
fn transaction_pays_to(
  tx: Transaction,
  address: Address,
  amount: Int,
) -> Bool {
  // Check outputs for payment to address
  list.any(
    tx.outputs,
    fn(output) {
      output.address == address &&
      value.quantity_of(output.value, ada_policy_id(), ada_asset_name()) >= amount
    },
  )
}

// TODO:
// - Implement proper Merkle tree hashing
// - Add block height validation
// - Add datum update logic
// - Test on preprod
// - Security audit

// NOTES:
// - Snapshot generated off-chain (Ogmios + Kupo queries blockchain)
// - Merkle root verified on-chain (efficient, scales to many holders)
// - Distribution happens in batches (Cardano tx size limits)
// - Min 5 ADA threshold prevents dust spam
// - Admin can submit snapshots but cannot manipulate distribution (Merkle proof validates)
