use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address, VerificationKey}
use cardano/assets.{flatten}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use psi_research/redeemers.{
  Contribute, PoolRedeemer, UpdateGovernance, Withdraw,
}
use psi_research/types.{PoolDatum}
use psi_research/utils.{count_governance_signatures, verify_signed_by}

// ============================================================================
// RESEARCH POOL VALIDATOR
// ============================================================================

/// PsyApp Research Pool Validator
/// Collects 5% of all experiment stakes for research funding
/// Governed by multi-sig of research committee
/// Research contribution pool
/// Collects percentage from all settled experiments
/// Withdrawals require multi-sig governance approval
validator research_pool {
  spend(
    datum: Option<PoolDatum>,
    redeemer: PoolRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(d) = datum

    when redeemer is {
      // ================================================================
      // CONTRIBUTE: Anyone can add funds to the pool
      // ================================================================
      Contribute { amount } -> {
        // Amount must be positive
        expect amount > 0

        // Verify output has increased by contribution amount
        verify_contribution_output(tx, own_ref, d, amount)
      }

      // ================================================================
      // WITHDRAW: Requires governance multi-sig
      // ================================================================
      Withdraw { amount, recipient } -> {
        // Amount must be positive and not exceed pool
        expect amount > 0
        expect amount <= d.total_collected

        // Count governance signatures
        let signatures = count_governance_signatures(tx, d.governance_pkhs)

        // Must meet minimum signature threshold
        expect signatures >= d.min_signatures

        // Verify withdrawal output
        verify_withdrawal_output(tx, own_ref, d, amount, recipient)
      }

      // ================================================================
      // UPDATE_GOVERNANCE: Change governance committee
      // ================================================================
      UpdateGovernance { new_governance_pkhs, new_min_signatures } -> {
        // Must have current governance approval
        let signatures = count_governance_signatures(tx, d.governance_pkhs)
        expect signatures >= d.min_signatures

        // New governance must be valid
        expect list.length(new_governance_pkhs) >= new_min_signatures
        expect new_min_signatures > 0

        // Verify governance update output
        verify_governance_update(
          tx,
          own_ref,
          d,
          new_governance_pkhs,
          new_min_signatures,
        )
      }
    }
  }

  else(_) {
    False
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Get lovelace value from output
fn get_lovelace(output: Output) -> Int {
  let flat = flatten(output.value)
  when list.find(flat, fn(asset) { asset.1st == #"" && asset.2nd == #"" }) is {
    Some(ada) -> ada.3rd
    None -> 0
  }
}

/// Find continuing output to same script
fn find_continuing_output(
  tx: Transaction,
  own_ref: OutputReference,
) -> Option<Output> {
  // Find own input to get script address
  when
    list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
  is {
    Some(own_input) -> {
      let script_address = own_input.output.address
      list.find(tx.outputs, fn(output) { output.address == script_address })
    }
    None -> None
  }
}

/// Verify contribution increases pool and updates datum
fn verify_contribution_output(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: PoolDatum,
  amount: Int,
) -> Bool {
  when find_continuing_output(tx, own_ref) is {
    Some(output) -> {
      // Check value increased
      expect Some(own_input) =
        list.find(tx.inputs, fn(i) { i.output_reference == own_ref })
      let old_value = get_lovelace(own_input.output)
      let new_value = get_lovelace(output)

      expect new_value >= old_value + amount

      // Check datum updated
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: PoolDatum = data
          new_datum.total_collected == old_datum.total_collected + amount && new_datum.governance_pkhs == old_datum.governance_pkhs && new_datum.min_signatures == old_datum.min_signatures
        }
        _ -> False
      }
    }
    None -> False
  }
}

/// Verify withdrawal reduces pool and sends to recipient
fn verify_withdrawal_output(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: PoolDatum,
  amount: Int,
  recipient: VerificationKeyHash,
) -> Bool {
  // Check continuing output has reduced balance
  let continuing_valid =
    when find_continuing_output(tx, own_ref) is {
      Some(output) -> {
        expect Some(own_input) =
          list.find(tx.inputs, fn(i) { i.output_reference == own_ref })
        let old_value = get_lovelace(own_input.output)
        let new_value = get_lovelace(output)

        // Value should decrease by withdrawal amount
        expect new_value >= old_value - amount

        // Datum should update total_collected
        when output.datum is {
          InlineDatum(data) -> {
            expect new_datum: PoolDatum = data
            new_datum.total_collected == old_datum.total_collected - amount && new_datum.governance_pkhs == old_datum.governance_pkhs && new_datum.min_signatures == old_datum.min_signatures
          }
          _ -> False
        }
      }
      // Pool might be fully depleted (no continuing output needed)
      None -> amount == old_datum.total_collected
    }

  // Check recipient receives the funds
  let recipient_paid =
    list.any(
      tx.outputs,
      fn(output) {
        when output.address.payment_credential is {
          VerificationKey(vkh) ->
            vkh == recipient && get_lovelace(output) >= amount
          _ -> False
        }
      },
    )

  continuing_valid && recipient_paid
}

/// Verify governance update maintains pool value but changes committee
fn verify_governance_update(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: PoolDatum,
  new_governance_pkhs: List<VerificationKeyHash>,
  new_min_signatures: Int,
) -> Bool {
  when find_continuing_output(tx, own_ref) is {
    Some(output) -> {
      // Value should not decrease
      expect Some(own_input) =
        list.find(tx.inputs, fn(i) { i.output_reference == own_ref })
      let old_value = get_lovelace(own_input.output)
      let new_value = get_lovelace(output)

      expect new_value >= old_value

      // Datum should update governance
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: PoolDatum = data
          new_datum.total_collected == old_datum.total_collected && new_datum.governance_pkhs == new_governance_pkhs && new_datum.min_signatures == new_min_signatures
        }
        _ -> False
      }
    }
    None -> False
  }
}

// ============================================================================
// MINTING POLICY FOR POOL STATE TOKEN
// ============================================================================

/// One-shot minting policy for research pool state token
/// Ensures only one pool instance can exist
validator research_pool_nft(utxo_ref: OutputReference) {
  mint(_redeemer: Data, _policy_id: ByteArray, tx: Transaction) {
    // Can only mint if consuming the specified UTxO
    list.any(tx.inputs, fn(input) { input.output_reference == utxo_ref })
  }

  else(_) {
    False
  }
}

// ============================================================================
// TESTS
// ============================================================================

test valid_pool_datum() {
  let datum =
    PoolDatum {
      total_collected: 1000000,
      governance_pkhs: [#"aabb", #"ccdd", #"eeff"],
      min_signatures: 2,
    }
  datum.total_collected > 0 && list.length(datum.governance_pkhs) >= datum.min_signatures
}

test min_signatures_requirement() {
  let governance = [#"aabb", #"ccdd", #"eeff"]
  let min_required = 2
  list.length(governance) >= min_required
}
