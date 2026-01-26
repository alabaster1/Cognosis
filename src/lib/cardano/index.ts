/**
 * Cardano Integration Module
 * Re-exports all psi-research contract utilities
 */

export {
  // Types
  type GameType,
  type SessionState,
  type SessionCreationResult,
  type SessionJoinResult,
  type SessionData,

  // Constants
  GAME_TYPE_INDEX,
  SESSION_STATE_INDEX,
  GAME_BASELINES,

  // Contract initialization
  initializeContracts,
  PSI_CONTRACT_ADDRESS,
  RESEARCH_POOL_ADDRESS,

  // Cryptographic utilities
  createCommitment,
  verifyCommitment,
  generateNonce,

  // Datum builders
  buildPsiDatum,
  buildJoinedDatum,

  // Redeemer builders
  buildJoinRedeemer,
  buildRevealRedeemer,
  buildSubmitScoreRedeemer,
  buildClaimHostTimeoutRedeemer,
  buildClaimParticipantTimeoutRedeemer,
  buildMutualCancelRedeemer,

  // Contract interactions
  createSession,
  joinSession,
  revealTarget,
  claimHostTimeout,
  claimParticipantTimeout,

  // Query functions
  parseSessionData,
  getActiveSessions,
  getJoinableSessions,

  // Utilities
  generateAlias,
  calculateZScore,
  zScoreToPValue,
  getSignificanceLevel,
  calculateEffectSize,
} from './psiContract';

export {
  // Types
  type RewardVaultData,
  type RewardClaimResult,

  // Contract state
  REWARD_VAULT_ADDRESS,
  REWARD_VAULT_SCRIPT,
  PSY_POLICY_ID,
  PSY_ASSET_NAME,

  // Initialization
  initializeRewardVault,

  // Datum builder
  buildRewardVaultDatum,

  // Redeemer builders
  buildClaimRewardRedeemer,
  buildTopUpRedeemer,
  buildUpdateParamsRedeemer,

  // Reward calculation
  calculateReward,

  // Transaction builders
  claimRewardWithSettlement,
  claimRewardWithScore,
  topUpVault,
  updateVaultParams,

  // Query functions
  parseVaultData,
  getVaultData,
  getNextReward,
} from './rewardVault';
