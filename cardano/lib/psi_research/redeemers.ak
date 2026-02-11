use aiken/crypto.{Blake2b_256, Hash, VerificationKeyHash}

// ============================================================================
// MAIN EXPERIMENT REDEEMERS
// ============================================================================

/// Redeemers for PsyApp Psi-Research Smart Contracts
/// All possible actions that can be taken on session UTxOs
/// All possible actions on a session UTxO
pub type PsiRedeemer {
  /// Player joins the session and locks matching stake
  /// Submits hash of their guess (commit phase)
  Join { guess_hash: Hash<Blake2b_256, ByteArray> }

  /// Host reveals the target value and nonce
  /// Triggers winner determination and settlement
  Reveal { target_value: ByteArray, nonce: ByteArray }

  /// For scored experiments - submit AI/oracle evaluation
  /// Only valid for RemoteViewing, EmotionEcho, PatternOracle
  SubmitScore {
    score: Int,
    // 0-100 similarity score
    oracle_signature: ByteArray,
  }

  // Oracle verification
  /// Player reveals their actual guess (for commit-reveal)
  /// Used in some game modes where participant also commits
  RevealGuess { guess_value: ByteArray, guess_nonce: ByteArray }

  /// Claim funds after successful reveal and settlement
  /// Called to finalize distribution
  Settle

  /// Claim timeout: Host failed to reveal in time
  /// Participant gets their stake back + host's stake (minus research %)
  ClaimHostTimeout

  /// Claim timeout: No one joined in time
  /// Host gets their stake back
  ClaimParticipantTimeout

  /// Emergency cancel with both parties signing
  /// Each party gets their stake refunded
  MutualCancel
}

/// Check if redeemer is a timeout claim
pub fn is_timeout_claim(redeemer: PsiRedeemer) -> Bool {
  when redeemer is {
    ClaimHostTimeout -> True
    ClaimParticipantTimeout -> True
    _ -> False
  }
}

/// Check if redeemer requires host signature
pub fn requires_host_signature(redeemer: PsiRedeemer) -> Bool {
  when redeemer is {
    Reveal { .. } -> True
    ClaimParticipantTimeout -> True
    MutualCancel -> True
    _ -> False
  }
}

/// Check if redeemer requires participant signature
pub fn requires_participant_signature(redeemer: PsiRedeemer) -> Bool {
  when redeemer is {
    Join { .. } -> True
    RevealGuess { .. } -> True
    ClaimHostTimeout -> True
    MutualCancel -> True
    _ -> False
  }
}

// ============================================================================
// RESEARCH POOL REDEEMERS
// ============================================================================

/// Actions for the research contribution pool
pub type PoolRedeemer {
  /// Add funds to the research pool
  /// Called automatically when experiments settle
  Contribute { amount: Int }

  /// Withdraw funds from pool (requires governance multi-sig)
  Withdraw { amount: Int, recipient: VerificationKeyHash }

  /// Update governance committee (requires current governance approval)
  UpdateGovernance {
    new_governance_pkhs: List<VerificationKeyHash>,
    new_min_signatures: Int,
  }
}

/// Check if pool redeemer requires governance approval
pub fn requires_governance(redeemer: PoolRedeemer) -> Bool {
  when redeemer is {
    Contribute { .. } -> False
    Withdraw { .. } -> True
    UpdateGovernance { .. } -> True
  }
}

// ============================================================================
// MINTING REDEEMERS
// ============================================================================

/// Redeemer for session NFT minting policy
/// Used to create unique session identifiers
pub type SessionMintRedeemer {
  /// Mint a new session NFT
  MintSession { session_id: ByteArray }
  /// Burn session NFT when session completes
  BurnSession
}

/// Redeemer for achievement badge minting
pub type BadgeMintRedeemer {
  /// Mint achievement badge (admin-controlled)
  MintBadge { badge_type: ByteArray, recipient: VerificationKeyHash }
  /// Mint streak badge
  MintStreakBadge { streak_count: Int, recipient: VerificationKeyHash }
}

// ============================================================================
// TESTS
// ============================================================================

test timeout_claims() {
  is_timeout_claim(ClaimHostTimeout) && is_timeout_claim(
    ClaimParticipantTimeout,
  ) && !is_timeout_claim(Settle)
}

test host_signature_requirements() {
  requires_host_signature(Reveal { target_value: "", nonce: "" }) && requires_host_signature(
    MutualCancel,
  ) && !requires_host_signature(ClaimHostTimeout)
}

test participant_signature_requirements() {
  requires_participant_signature(
    Join {
      guess_hash: #"0000000000000000000000000000000000000000000000000000000000000000",
    },
  ) && requires_participant_signature(ClaimHostTimeout)
}

test governance_requirements() {
  requires_governance(Withdraw { amount: 1000000, recipient: #"00" }) && !requires_governance(
    Contribute { amount: 1000000 },
  )
}
