/**
 * Reward Vault Off-Chain Transaction Builders
 * TypeScript bindings for Lucid Evolution to interact with the reward_vault validator
 */

import {
  Data,
  Constr,
  UTxO,
  type LucidEvolution,
  getAddressDetails,
  credentialToAddress,
} from "@lucid-evolution/lucid";

import {
  PSI_VALIDATOR_SCRIPT,
  RESEARCH_POOL_ADDRESS,
  buildRevealRedeemer,
  buildSubmitScoreRedeemer,
} from "./psiContract";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parsed reward vault data from UTxO datum
 */
export interface RewardVaultData {
  psyPolicyId: string;
  psyAssetName: string;
  baseReward: bigint;
  decayFactor: bigint;
  totalClaims: bigint;
  experimentScriptHash: string;
  adminPkh: string;
}

/**
 * Result of a reward claim transaction
 */
export interface RewardClaimResult {
  txHash: string;
  rewardAmount: bigint;
  newTotalClaims: bigint;
}

// ============================================================================
// CONTRACT STATE (Update after deployment)
// ============================================================================

export let REWARD_VAULT_ADDRESS = "";
export let REWARD_VAULT_SCRIPT = "";
export let PSY_POLICY_ID = "";
export let PSY_ASSET_NAME = "";

/**
 * Initialize reward vault contract state
 */
export function initializeRewardVault(
  address: string,
  script: string,
  psyPolicyId: string,
  psyAssetName: string
) {
  REWARD_VAULT_ADDRESS = address;
  REWARD_VAULT_SCRIPT = script;
  PSY_POLICY_ID = psyPolicyId;
  PSY_ASSET_NAME = psyAssetName;
}

// ============================================================================
// DATUM BUILDER
// ============================================================================

/**
 * Build RewardVaultDatum matching Aiken struct field order
 */
export function buildRewardVaultDatum(
  psyPolicyId: string,
  psyAssetName: string,
  baseReward: bigint,
  decayFactor: bigint,
  totalClaims: bigint,
  experimentScriptHash: string,
  adminPkh: string
): Data {
  return new Constr(0, [
    psyPolicyId,         // [0] psy_policy_id: ByteArray
    psyAssetName,        // [1] psy_asset_name: ByteArray
    baseReward,          // [2] base_reward: Int
    decayFactor,         // [3] decay_factor: Int
    totalClaims,         // [4] total_claims: Int
    experimentScriptHash, // [5] experiment_script_hash: ByteArray
    adminPkh,            // [6] admin_pkh: ByteArray
  ]);
}

// ============================================================================
// REDEEMER BUILDERS
// ============================================================================

/**
 * Build ClaimReward redeemer
 */
export function buildClaimRewardRedeemer(participantPkh: string): Data {
  return new Constr(0, [participantPkh]); // ClaimReward { participant_pkh }
}

/**
 * Build TopUp redeemer
 */
export function buildTopUpRedeemer(): Data {
  return new Constr(1, []); // TopUp
}

/**
 * Build UpdateParams redeemer
 */
export function buildUpdateParamsRedeemer(baseReward: bigint, decayFactor: bigint): Data {
  return new Constr(2, [baseReward, decayFactor]); // UpdateParams { base_reward, decay_factor }
}

// ============================================================================
// REWARD CALCULATION (mirrors on-chain logic)
// ============================================================================

/**
 * Calculate reward amount using exponential decay formula
 * reward = base_reward / (1 + decay_factor * total_claims)
 * Mirrors the on-chain calculation for UI display
 */
export function calculateReward(
  baseReward: bigint,
  decayFactor: bigint,
  totalClaims: bigint
): bigint {
  const denominator = 1n + decayFactor * totalClaims;
  if (denominator === 0n) return baseReward;
  return baseReward / denominator;
}

// ============================================================================
// TRANSACTION BUILDERS
// ============================================================================

/**
 * Composite transaction: reveal target AND claim reward in a single TX
 * Spends both the psi_experiment UTxO and the reward_vault UTxO
 */
export async function claimRewardWithSettlement(
  lucid: LucidEvolution,
  sessionUtxo: UTxO,
  vaultUtxo: UTxO,
  target: string,
  nonce: string,
  recipientPkh: string
): Promise<RewardClaimResult> {
  if (!REWARD_VAULT_SCRIPT || !PSI_VALIDATOR_SCRIPT) {
    throw new Error("Validator scripts not initialized");
  }
  if (!REWARD_VAULT_ADDRESS || !RESEARCH_POOL_ADDRESS) {
    throw new Error("Contract addresses not initialized");
  }

  // Parse session datum for settlement calculation
  if (!sessionUtxo.datum) {
    throw new Error("Session UTxO missing datum");
  }
  const sessionDatum = Data.from(sessionUtxo.datum) as Constr<Data>;
  const sessionFields = sessionDatum.fields;
  const hostPkh = sessionFields[1] as string;
  const stakeLovelace = sessionFields[8] as bigint;
  const researchPct = sessionFields[9] as bigint;
  const currentParticipants = sessionFields[11] as bigint;

  // Settlement payout calculation
  const totalPool = stakeLovelace * (currentParticipants + 1n);
  const researchAmount = totalPool * researchPct / 100n;
  const winnerAmount = totalPool - researchAmount;

  // Parse vault datum for reward calculation
  if (!vaultUtxo.datum) {
    throw new Error("Vault UTxO missing datum");
  }
  const vaultDatum = Data.from(vaultUtxo.datum) as Constr<Data>;
  const vaultFields = vaultDatum.fields;
  const baseReward = vaultFields[2] as bigint;
  const decayFactor = vaultFields[3] as bigint;
  const totalClaims = vaultFields[4] as bigint;

  // Calculate reward
  const reward = calculateReward(baseReward, decayFactor, totalClaims);
  if (reward <= 0n) {
    throw new Error("Calculated reward is zero - vault may be depleted");
  }

  // Build updated vault datum (increment total_claims)
  const newTotalClaims = totalClaims + 1n;
  const updatedVaultDatum = buildRewardVaultDatum(
    vaultFields[0] as string,
    vaultFields[1] as string,
    baseReward,
    decayFactor,
    newTotalClaims,
    vaultFields[5] as string,
    vaultFields[6] as string
  );

  // Calculate continuing vault value (subtract reward tokens)
  const psyUnit = PSY_POLICY_ID + PSY_ASSET_NAME;
  const currentVaultTokens = vaultUtxo.assets[psyUnit] ?? 0n;
  if (currentVaultTokens < reward) {
    throw new Error("Vault has insufficient PSY tokens for reward");
  }
  const remainingTokens = currentVaultTokens - reward;

  // Build continuing vault assets
  const vaultAssets: Record<string, bigint> = {
    lovelace: vaultUtxo.assets.lovelace,
  };
  if (remainingTokens > 0n) {
    vaultAssets[psyUnit] = remainingTokens;
  }

  // Build redeemers
  const revealRedeemer = buildRevealRedeemer(target, nonce);
  const claimRedeemer = buildClaimRewardRedeemer(recipientPkh);

  // Determine recipient address from PKH
  const recipientAddress = credentialToAddress(
    lucid.config().network,
    { type: "Key", hash: recipientPkh }
  );
  const winnerAddress = await lucid.wallet().address();

  // Build composite transaction
  const tx = await lucid
    .newTx()
    // Spend experiment UTxO with Reveal redeemer
    .collectFrom([sessionUtxo], Data.to(revealRedeemer))
    .attach.SpendingValidator({ type: "PlutusV3", script: PSI_VALIDATOR_SCRIPT })
    // Spend vault UTxO with ClaimReward redeemer
    .collectFrom([vaultUtxo], Data.to(claimRedeemer))
    .attach.SpendingValidator({ type: "PlutusV3", script: REWARD_VAULT_SCRIPT })
    // Settlement outputs
    .pay.ToAddress(winnerAddress, { lovelace: winnerAmount })
    .pay.ToContract(
      RESEARCH_POOL_ADDRESS,
      { kind: "inline", value: Data.to(new Constr(0, [])) },
      { lovelace: researchAmount }
    )
    // Reward output to recipient
    .pay.ToAddress(recipientAddress, { [psyUnit]: reward })
    // Continuing vault UTxO
    .pay.ToContract(
      REWARD_VAULT_ADDRESS,
      { kind: "inline", value: Data.to(updatedVaultDatum) },
      vaultAssets
    )
    .addSignerKey(hostPkh)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return {
    txHash,
    rewardAmount: reward,
    newTotalClaims,
  };
}

/**
 * Composite transaction: submit score AND claim reward for scored experiments
 * Spends both the psi_experiment UTxO and the reward_vault UTxO
 */
export async function claimRewardWithScore(
  lucid: LucidEvolution,
  sessionUtxo: UTxO,
  vaultUtxo: UTxO,
  score: number,
  oracleSignature: string,
  recipientPkh: string
): Promise<RewardClaimResult> {
  if (!REWARD_VAULT_SCRIPT || !PSI_VALIDATOR_SCRIPT) {
    throw new Error("Validator scripts not initialized");
  }
  if (!REWARD_VAULT_ADDRESS || !RESEARCH_POOL_ADDRESS) {
    throw new Error("Contract addresses not initialized");
  }

  // Parse session datum for settlement calculation
  if (!sessionUtxo.datum) {
    throw new Error("Session UTxO missing datum");
  }
  const sessionDatum = Data.from(sessionUtxo.datum) as Constr<Data>;
  const sessionFields = sessionDatum.fields;
  const hostPkh = sessionFields[1] as string;
  const stakeLovelace = sessionFields[8] as bigint;
  const researchPct = sessionFields[9] as bigint;
  const currentParticipants = sessionFields[11] as bigint;

  // Settlement payout calculation
  const totalPool = stakeLovelace * (currentParticipants + 1n);
  const researchAmount = totalPool * researchPct / 100n;
  const winnerAmount = totalPool - researchAmount;

  // Parse vault datum for reward calculation
  if (!vaultUtxo.datum) {
    throw new Error("Vault UTxO missing datum");
  }
  const vaultDatum = Data.from(vaultUtxo.datum) as Constr<Data>;
  const vaultFields = vaultDatum.fields;
  const baseReward = vaultFields[2] as bigint;
  const decayFactor = vaultFields[3] as bigint;
  const totalClaims = vaultFields[4] as bigint;

  // Calculate reward
  const reward = calculateReward(baseReward, decayFactor, totalClaims);
  if (reward <= 0n) {
    throw new Error("Calculated reward is zero - vault may be depleted");
  }

  // Build updated vault datum
  const newTotalClaims = totalClaims + 1n;
  const updatedVaultDatum = buildRewardVaultDatum(
    vaultFields[0] as string,
    vaultFields[1] as string,
    baseReward,
    decayFactor,
    newTotalClaims,
    vaultFields[5] as string,
    vaultFields[6] as string
  );

  // Calculate continuing vault value
  const psyUnit = PSY_POLICY_ID + PSY_ASSET_NAME;
  const currentVaultTokens = vaultUtxo.assets[psyUnit] ?? 0n;
  if (currentVaultTokens < reward) {
    throw new Error("Vault has insufficient PSY tokens for reward");
  }
  const remainingTokens = currentVaultTokens - reward;

  const vaultAssets: Record<string, bigint> = {
    lovelace: vaultUtxo.assets.lovelace,
  };
  if (remainingTokens > 0n) {
    vaultAssets[psyUnit] = remainingTokens;
  }

  // Build redeemers
  const scoreRedeemer = buildSubmitScoreRedeemer(score, oracleSignature);
  const claimRedeemer = buildClaimRewardRedeemer(recipientPkh);

  // Determine recipient address
  const recipientAddress = credentialToAddress(
    lucid.config().network,
    { type: "Key", hash: recipientPkh }
  );
  const winnerAddress = await lucid.wallet().address();

  // Build composite transaction
  const tx = await lucid
    .newTx()
    // Spend experiment UTxO with SubmitScore redeemer
    .collectFrom([sessionUtxo], Data.to(scoreRedeemer))
    .attach.SpendingValidator({ type: "PlutusV3", script: PSI_VALIDATOR_SCRIPT })
    // Spend vault UTxO with ClaimReward redeemer
    .collectFrom([vaultUtxo], Data.to(claimRedeemer))
    .attach.SpendingValidator({ type: "PlutusV3", script: REWARD_VAULT_SCRIPT })
    // Settlement outputs
    .pay.ToAddress(winnerAddress, { lovelace: winnerAmount })
    .pay.ToContract(
      RESEARCH_POOL_ADDRESS,
      { kind: "inline", value: Data.to(new Constr(0, [])) },
      { lovelace: researchAmount }
    )
    // Reward output to recipient
    .pay.ToAddress(recipientAddress, { [psyUnit]: reward })
    // Continuing vault UTxO
    .pay.ToContract(
      REWARD_VAULT_ADDRESS,
      { kind: "inline", value: Data.to(updatedVaultDatum) },
      vaultAssets
    )
    .addSignerKey(hostPkh)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return {
    txHash,
    rewardAmount: reward,
    newTotalClaims,
  };
}

/**
 * Admin adds PSY tokens to the vault
 */
export async function topUpVault(
  lucid: LucidEvolution,
  vaultUtxo: UTxO,
  additionalTokens: bigint
): Promise<string> {
  if (!REWARD_VAULT_SCRIPT || !REWARD_VAULT_ADDRESS) {
    throw new Error("Reward vault not initialized");
  }

  if (!vaultUtxo.datum) {
    throw new Error("Vault UTxO missing datum");
  }

  // Get admin PKH from wallet
  const walletAddress = await lucid.wallet().address();
  const addressDetails = getAddressDetails(walletAddress);
  const adminPkh = addressDetails.paymentCredential?.hash;
  if (!adminPkh) {
    throw new Error("Could not get admin payment credential");
  }

  // Vault datum stays the same
  const vaultDatum = Data.from(vaultUtxo.datum);

  // Calculate increased vault value
  const psyUnit = PSY_POLICY_ID + PSY_ASSET_NAME;
  const currentVaultTokens = vaultUtxo.assets[psyUnit] ?? 0n;
  const newVaultTokens = currentVaultTokens + additionalTokens;

  const vaultAssets: Record<string, bigint> = {
    lovelace: vaultUtxo.assets.lovelace,
    [psyUnit]: newVaultTokens,
  };

  const redeemer = buildTopUpRedeemer();

  const tx = await lucid
    .newTx()
    .collectFrom([vaultUtxo], Data.to(redeemer))
    .attach.SpendingValidator({ type: "PlutusV3", script: REWARD_VAULT_SCRIPT })
    .pay.ToContract(
      REWARD_VAULT_ADDRESS,
      { kind: "inline", value: Data.to(vaultDatum) },
      vaultAssets
    )
    .addSignerKey(adminPkh)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return txHash;
}

/**
 * Admin adjusts vault reward parameters
 */
export async function updateVaultParams(
  lucid: LucidEvolution,
  vaultUtxo: UTxO,
  newBaseReward: bigint,
  newDecayFactor: bigint
): Promise<string> {
  if (!REWARD_VAULT_SCRIPT || !REWARD_VAULT_ADDRESS) {
    throw new Error("Reward vault not initialized");
  }

  if (!vaultUtxo.datum) {
    throw new Error("Vault UTxO missing datum");
  }

  // Get admin PKH from wallet
  const walletAddress = await lucid.wallet().address();
  const addressDetails = getAddressDetails(walletAddress);
  const adminPkh = addressDetails.paymentCredential?.hash;
  if (!adminPkh) {
    throw new Error("Could not get admin payment credential");
  }

  // Parse current datum to preserve other fields
  const currentDatum = Data.from(vaultUtxo.datum) as Constr<Data>;
  const fields = currentDatum.fields;

  // Build updated datum with new params
  const updatedDatum = buildRewardVaultDatum(
    fields[0] as string,    // psy_policy_id
    fields[1] as string,    // psy_asset_name
    newBaseReward,           // updated base_reward
    newDecayFactor,          // updated decay_factor
    fields[4] as bigint,    // total_claims (unchanged)
    fields[5] as string,    // experiment_script_hash
    fields[6] as string     // admin_pkh
  );

  // Vault value stays the same
  const vaultAssets: Record<string, bigint> = { ...vaultUtxo.assets };

  const redeemer = buildUpdateParamsRedeemer(newBaseReward, newDecayFactor);

  const tx = await lucid
    .newTx()
    .collectFrom([vaultUtxo], Data.to(redeemer))
    .attach.SpendingValidator({ type: "PlutusV3", script: REWARD_VAULT_SCRIPT })
    .pay.ToContract(
      REWARD_VAULT_ADDRESS,
      { kind: "inline", value: Data.to(updatedDatum) },
      vaultAssets
    )
    .addSignerKey(adminPkh)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  await lucid.awaitTx(txHash);

  return txHash;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Parse reward vault data from UTxO datum
 */
export function parseVaultData(utxo: UTxO): RewardVaultData | null {
  if (!utxo.datum) return null;

  try {
    const datum = Data.from(utxo.datum) as Constr<Data>;
    const fields = datum.fields;

    return {
      psyPolicyId: fields[0] as string,
      psyAssetName: fields[1] as string,
      baseReward: fields[2] as bigint,
      decayFactor: fields[3] as bigint,
      totalClaims: fields[4] as bigint,
      experimentScriptHash: fields[5] as string,
      adminPkh: fields[6] as string,
    };
  } catch (e) {
    console.error("Failed to parse vault data:", e);
    return null;
  }
}

/**
 * Get current vault data from the contract address
 */
export async function getVaultData(lucid: LucidEvolution): Promise<{
  utxo: UTxO;
  data: RewardVaultData;
} | null> {
  if (!REWARD_VAULT_ADDRESS) {
    throw new Error("Reward vault address not initialized");
  }

  const utxos = await lucid.utxosAt(REWARD_VAULT_ADDRESS);
  if (utxos.length === 0) return null;

  // Use the first UTxO (there should typically be one vault UTxO)
  const utxo = utxos[0];
  const data = parseVaultData(utxo);
  if (!data) return null;

  return { utxo, data };
}

/**
 * Calculate what the next reward claim would receive
 */
export async function getNextReward(lucid: LucidEvolution): Promise<bigint> {
  const vault = await getVaultData(lucid);
  if (!vault) {
    throw new Error("No vault UTxO found");
  }

  return calculateReward(
    vault.data.baseReward,
    vault.data.decayFactor,
    vault.data.totalClaims
  );
}
