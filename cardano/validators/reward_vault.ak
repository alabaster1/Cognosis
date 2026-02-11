use aiken/collection/list
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets.{flatten}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use psi_research/reward_types.{
  ClaimReward, RewardRedeemer, RewardVaultDatum, TopUp, UpdateParams,
  calculate_reward,
}
use psi_research/utils.{verify_signed_by}

// ============================================================================
// REWARD VAULT VALIDATOR
// ============================================================================

/// Psy Token Participation Reward Vault
/// Distributes pre-minted Psy tokens to game participants using hyperbolic decay.
/// Early participants earn more; rewards decrease as total participation grows.
validator reward_vault {
  spend(
    datum: Option<RewardVaultDatum>,
    redeemer: RewardRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(d) = datum

    when redeemer is {
      // ================================================================
      // CLAIM REWARD: Participant claims Psy tokens during settlement
      // ================================================================
      ClaimReward { participant } -> {
        // 1. Settlement proof: a psi_experiment script input is being spent
        expect has_experiment_input(tx, d.experiment_script_hash)

        // 2. Calculate reward using hyperbolic decay
        let reward = calculate_reward(d.base_reward, d.decay_factor, d.total_claims)

        // 3. Reward must be > 0 (reject if decayed to zero)
        expect reward > 0

        // 4. Verify participant receives the reward tokens
        expect
          verify_token_payment(
            tx,
            participant,
            d.psy_policy_id,
            d.psy_asset_name,
            reward,
          )

        // 5. Verify continuing vault output with updated datum
        verify_claim_continuation(tx, own_ref, d, reward)
      }

      // ================================================================
      // TOP UP: Admin deposits additional Psy tokens
      // ================================================================
      TopUp -> {
        // Admin must sign
        expect verify_signed_by(tx, d.admin_pkh)

        // Verify continuing output has more Psy tokens and unchanged datum
        verify_topup_continuation(tx, own_ref, d)
      }

      // ================================================================
      // UPDATE PARAMS: Admin adjusts decay parameters
      // ================================================================
      UpdateParams { new_base_reward, new_decay_factor } -> {
        // Admin must sign
        expect verify_signed_by(tx, d.admin_pkh)

        // New values must be positive
        expect new_base_reward > 0
        expect new_decay_factor > 0

        // Verify continuation with updated params only
        verify_update_continuation(
          tx,
          own_ref,
          d,
          new_base_reward,
          new_decay_factor,
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

/// Check if any transaction input is from the psi_experiment script
fn has_experiment_input(tx: Transaction, experiment_hash: ByteArray) -> Bool {
  list.any(
    tx.inputs,
    fn(input) {
      when input.output.address.payment_credential is {
        Script(hash) -> hash == experiment_hash
        _ -> False
      }
    },
  )
}

/// Get the amount of a specific token in an output
fn get_token_amount(
  output: Output,
  policy_id: ByteArray,
  asset_name: ByteArray,
) -> Int {
  let flat = flatten(output.value)
  when
    list.find(
      flat,
      fn(asset) { asset.1st == policy_id && asset.2nd == asset_name },
    )
  is {
    Some(token) -> token.3rd
    None -> 0
  }
}

/// Check if output is to the same script address (continuing output)
fn is_own_output(
  output: Output,
  own_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  when list.find(tx.inputs, fn(input) { input.output_reference == own_ref }) is {
    Some(own_input) -> output.address == own_input.output.address
    None -> False
  }
}

/// Find the single continuing output to this script
fn find_continuing_output(
  tx: Transaction,
  own_ref: OutputReference,
) -> Option<Output> {
  let continuing =
    list.filter(
      tx.outputs,
      fn(output) { is_own_output(output, own_ref, tx) },
    )

  when continuing is {
    [output] -> Some(output)
    _ -> None
  }
}

/// Verify an output pays at least `amount` of Psy tokens to the participant
fn verify_token_payment(
  tx: Transaction,
  participant: ByteArray,
  policy_id: ByteArray,
  asset_name: ByteArray,
  amount: Int,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      is_payment_to_pkh(output, participant) && get_token_amount(
        output,
        policy_id,
        asset_name,
      ) >= amount
    },
  )
}

/// Check if output is a payment to a PKH address
fn is_payment_to_pkh(output: Output, pkh: ByteArray) -> Bool {
  when output.address.payment_credential is {
    VerificationKey(vkh) -> vkh == pkh
    _ -> False
  }
}

/// Verify the continuing vault output after a claim
fn verify_claim_continuation(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: RewardVaultDatum,
  reward: Int,
) -> Bool {
  when find_continuing_output(tx, own_ref) is {
    Some(output) ->
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: RewardVaultDatum = data

          // Get token balances
          let input_tokens =
            get_input_token_amount(
              tx,
              own_ref,
              old_datum.psy_policy_id,
              old_datum.psy_asset_name,
            )
          let output_tokens =
            get_token_amount(
              output,
              old_datum.psy_policy_id,
              old_datum.psy_asset_name,
            )

          // Verify datum: only total_claims changes
          new_datum.psy_policy_id == old_datum.psy_policy_id && new_datum.psy_asset_name == old_datum.psy_asset_name && new_datum.base_reward == old_datum.base_reward && new_datum.decay_factor == old_datum.decay_factor && new_datum.total_claims == old_datum.total_claims + 1 && new_datum.experiment_script_hash == old_datum.experiment_script_hash && new_datum.admin_pkh == old_datum.admin_pkh && // Verify tokens reduced by exactly the reward amount
          output_tokens == input_tokens - reward
        }
        _ -> False
      }
    None -> False
  }
}

/// Verify the continuing vault output after a top-up
fn verify_topup_continuation(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: RewardVaultDatum,
) -> Bool {
  when find_continuing_output(tx, own_ref) is {
    Some(output) ->
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: RewardVaultDatum = data

          // Get token balances
          let input_tokens =
            get_input_token_amount(
              tx,
              own_ref,
              old_datum.psy_policy_id,
              old_datum.psy_asset_name,
            )
          let output_tokens =
            get_token_amount(
              output,
              old_datum.psy_policy_id,
              old_datum.psy_asset_name,
            )

          // Datum must be unchanged
          new_datum == old_datum && // Output must have more tokens than input
          output_tokens > input_tokens
        }
        _ -> False
      }
    None -> False
  }
}

/// Verify the continuing vault output after a parameter update
fn verify_update_continuation(
  tx: Transaction,
  own_ref: OutputReference,
  old_datum: RewardVaultDatum,
  new_base_reward: Int,
  new_decay_factor: Int,
) -> Bool {
  when find_continuing_output(tx, own_ref) is {
    Some(output) ->
      when output.datum is {
        InlineDatum(data) -> {
          expect new_datum: RewardVaultDatum = data

          // Get token balances
          let input_tokens =
            get_input_token_amount(
              tx,
              own_ref,
              old_datum.psy_policy_id,
              old_datum.psy_asset_name,
            )
          let output_tokens =
            get_token_amount(
              output,
              old_datum.psy_policy_id,
              old_datum.psy_asset_name,
            )

          // Only base_reward and decay_factor change
          new_datum.psy_policy_id == old_datum.psy_policy_id && new_datum.psy_asset_name == old_datum.psy_asset_name && new_datum.base_reward == new_base_reward && new_datum.decay_factor == new_decay_factor && new_datum.total_claims == old_datum.total_claims && new_datum.experiment_script_hash == old_datum.experiment_script_hash && new_datum.admin_pkh == old_datum.admin_pkh && // Value must remain unchanged
          output_tokens == input_tokens
        }
        _ -> False
      }
    None -> False
  }
}

/// Get the token amount from the own input
fn get_input_token_amount(
  tx: Transaction,
  own_ref: OutputReference,
  policy_id: ByteArray,
  asset_name: ByteArray,
) -> Int {
  when list.find(tx.inputs, fn(input) { input.output_reference == own_ref }) is {
    Some(own_input) ->
      get_token_amount(own_input.output, policy_id, asset_name)
    None -> 0
  }
}
