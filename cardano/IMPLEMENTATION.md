# PsyApp Cardano Smart Contracts Implementation

## Overview

This document describes the Cardano smart contract implementation for PsyApp, a psi-research platform that uses cryptographic verification and on-chain settlement for paranormal experiments.

### Design Principles

1. **One Contract, Many Games**: Single unified validator with `GameType` enum in Datum
2. **Commit-Reveal Scheme**: On-chain cryptographic verification using Blake2b-256
3. **EUTxO Model**: Each experiment session is a UTxO with locked funds
4. **Research Pool**: 5% of stakes go to research pool for community funding
5. **Timeout Protection**: Automatic refunds if host/participant fails to complete

---

## File Structure

```
/cardano/
├── aiken.toml                      # Project configuration
├── plutus.json                     # Generated blueprint (after build)
├── IMPLEMENTATION.md               # This file
├── lib/
│   └── psi_research/
│       ├── types.ak                # GameType, PsiDatum, SessionState
│       ├── redeemers.ak            # All redeemer variants
│       ├── games.ak                # Game-specific scoring logic
│       └── utils.ak                # Hash verification, math helpers
├── validators/
│   ├── psi_experiment.ak           # Main unified validator
│   └── research_pool.ak            # Research contribution pool
└── test/
    ├── unit/
    │   ├── test_commit_reveal.ak   # Commitment scheme tests
    │   ├── test_scoring.ak         # Game scoring tests
    │   └── test_timeouts.ak        # Timeout scenario tests
    └── integration/
        └── test_full_session.ak    # Full lifecycle tests
```

---

## Core Types (`lib/psi_research/types.ak`)

### GameType Enum

All 13 supported experiment types:

| Index | Type | Category | Baseline |
|-------|------|----------|----------|
| 0 | CardPrediction | Precognition | 25% |
| 1 | TimelineRacer | Precognition | 25% |
| 2 | PsiPoker | Precognition | 25% |
| 3 | CoinFlip | Binary Choice | 50% |
| 4 | QuantumCoinArena | Binary Choice | 50% |
| 5 | DiceInfluence | Dice | 17% |
| 6 | RemoteViewing | Scored | Variable |
| 7 | EmotionEcho | Scored | Variable |
| 8 | PatternOracle | Scored | Variable |
| 9 | MindPulse | Global Consciousness | N/A |
| 10 | RetroRoulette | Retrocausality | 50% |
| 11 | SynchronicityBingo | Synchronicity | N/A |
| 12 | GlobalConsciousness | Multiplayer | N/A |

### SessionState Enum

```aiken
pub type SessionState {
  AwaitingParticipant   // Host committed, waiting for player
  InProgress            // Player joined, game active (for scored experiments)
  AwaitingReveal        // Player submitted guess, host must reveal
  Settled               // Complete, funds distributed
  Expired               // Timeout occurred
}
```

### PsiDatum

Main experiment datum locked in UTxO:

```aiken
pub type PsiDatum {
  target_hash: Hash<Blake2b_256, ByteArray>,  // Committed target
  host_pkh: VerificationKeyHash,              // Host's public key hash
  participant_pkh: Option<VerificationKeyHash>, // Participant (if joined)
  game_type: GameType,                        // Experiment type
  session_state: SessionState,                // Current state
  commit_slot: Int,                           // When session created
  join_deadline_slot: Int,                    // Deadline to join
  reveal_deadline_slot: Int,                  // Deadline for host reveal
  stake_lovelace: Int,                        // Stake amount per party
  research_pool_pct: Int,                     // Usually 5 (5%)
  max_participants: Int,                      // For multiplayer games
  current_participants: Int,                  // Current count
  participant_guesses: List<ParticipantGuess>, // All guesses
  ipfs_cid: Option<ByteArray>,                // Off-chain data reference
  ai_score: Option<Int>,                      // For scored experiments (0-100)
}
```

### ParticipantGuess

```aiken
pub type ParticipantGuess {
  pkh: VerificationKeyHash,
  guess_hash: Hash<Blake2b_256, ByteArray>,
  guess_value: Option<ByteArray>,  // Filled on reveal
  timestamp_slot: Int,
}
```

---

## Redeemers (`lib/psi_research/redeemers.ak`)

### PsiRedeemer (Main Validator)

| Redeemer | Purpose | Requirements |
|----------|---------|--------------|
| `Join { guess_hash }` | Participant joins session | Must lock matching stake |
| `Reveal { target_value, nonce }` | Host reveals target | Must match commitment |
| `SubmitScore { score, oracle_signature }` | Oracle submits AI evaluation | For scored experiments |
| `RevealGuess { guess_value, guess_nonce }` | Participant reveals guess | Must match their commitment |
| `Settle` | Finalize settlement | Session must be settled |
| `ClaimHostTimeout` | Participant claims when host fails to reveal | Past reveal deadline |
| `ClaimParticipantTimeout` | Host reclaims when no one joins | Past join deadline |
| `MutualCancel` | Both parties agree to cancel | Both must sign |

### PoolRedeemer (Research Pool)

| Redeemer | Purpose | Requirements |
|----------|---------|--------------|
| `Contribute { amount }` | Add funds to pool | Anyone can contribute |
| `Withdraw { amount, recipient }` | Withdraw from pool | Multi-sig governance |
| `UpdateGovernance { new_pkhs, new_min }` | Change governance committee | Current governance approval |

---

## Game Scoring Logic (`lib/psi_research/games.ak`)

### GameResult Type

```aiken
pub type GameResult {
  Winner(VerificationKeyHash)       // Single winner
  NoWinner                          // House wins / refund
  SharedWin(List<VerificationKeyHash>) // Multiple winners
  ScoredSettlement                  // Uses AI score
  Draw                              // Both get refund
}
```

### Winner Determination

| Game Type | Method | Threshold |
|-----------|--------|-----------|
| CardPrediction, CoinFlip, TimelineRacer, DiceInfluence | Exact match | N/A |
| QuantumCoinArena | Consensus | 60% |
| MindPulse, GlobalConsciousness | Consciousness result | 40% |
| RemoteViewing, EmotionEcho, PatternOracle | Scored settlement | 40-60% |
| PsiPoker | Best predictor | N/A |
| RetroRoulette | Correlation | N/A |
| SynchronicityBingo | No winner | N/A |

### Score Thresholds for Scored Experiments

| Experiment | Threshold |
|------------|-----------|
| RemoteViewing | 50% |
| EmotionEcho | 60% |
| PatternOracle | 40% |

---

## Validators

### psi_experiment.ak (Main Validator)

Handles all experiment types through datum-based discrimination:

```aiken
validator psi_experiment(research_pool_address: Address) {
  spend(datum, redeemer, own_ref, tx) -> Bool {
    // Routes to appropriate handler based on redeemer type
  }
}
```

**Key Features:**
- Commit-reveal verification for target and guesses
- Deadline enforcement via validity range
- Automatic fund distribution based on game result
- Research pool contribution on settlement (5%)

### research_pool.ak (Research Pool)

Multi-sig governed pool for research funding:

```aiken
validator research_pool {
  spend(datum, redeemer, own_ref, tx) -> Bool {
    // Contribution: Anyone can add
    // Withdrawal: Requires governance multi-sig
  }
}
```

**Governance:**
- List of authorized public key hashes
- Minimum signature threshold
- Can update governance committee with current approval

---

## Utility Functions (`lib/psi_research/utils.ak`)

### Cryptographic

```aiken
// Verify commitment: hash(value || nonce) == committed_hash
pub fn verify_commitment(committed_hash, revealed_value, nonce) -> Bool

// Create commitment hash
pub fn create_commitment(value, nonce) -> Hash<Blake2b_256, ByteArray>
```

### Signature Verification

```aiken
// Check if tx signed by PKH
pub fn verify_signed_by(tx, pkh) -> Bool

// Count governance signatures present
pub fn count_governance_signatures(tx, governance_pkhs) -> Int
```

### Timing

```aiken
// Check if before deadline
pub fn is_before_deadline(tx, deadline_slot) -> Bool

// Check if after deadline
pub fn is_after_deadline(tx, deadline_slot) -> Bool
```

### Math

```aiken
pub fn safe_div(numerator, denominator) -> Int
pub fn calculate_percentage(value, percentage) -> Int
pub fn abs(n) -> Int
pub fn max(a, b) -> Int
pub fn min(a, b) -> Int
pub fn clamp(value, min_val, max_val) -> Int
```

---

## Frontend Integration

### TypeScript Bindings (`web/src/lib/cardano/psiContract.ts`)

**Key Exports:**

```typescript
// Constants matching Aiken enums
export const GAME_TYPE_INDEX = { ... }
export const SESSION_STATE_INDEX = { ... }

// Commitment functions
export function createCommitment(target: string, nonce: string): string
export function verifyCommitment(hash: string, value: string, nonce: string): boolean

// Datum builders
export function buildPsiDatum(gameType, targetHash, hostPkh, ...) -> Data
export function buildJoinedDatum(originalDatum, participantPkh, guessHash, slot) -> Data

// Redeemer builders
export function buildJoinRedeemer(guessHash) -> Data
export function buildRevealRedeemer(targetValue, nonce) -> Data
export function buildSubmitScoreRedeemer(score, signature) -> Data
// ... etc

// Contract interactions
export async function createSession(lucid, gameType, target, stakeAda) -> SessionResult
export async function joinSession(lucid, sessionUtxo, guess) -> string
export async function revealTarget(lucid, sessionUtxo, target, nonce, researchPoolAddress) -> string
export async function claimHostTimeout(lucid, sessionUtxo, researchPoolAddress) -> string
export async function claimParticipantTimeout(lucid, sessionUtxo) -> string

// Query functions
export function parseSessionData(datum: Data) -> ParsedSession | null
export async function getActiveSessions(lucid, contractAddress) -> UTxO[]
export async function getJoinableSessions(lucid, contractAddress) -> UTxO[]

// Statistical utilities
export function calculateZScore(hits, trials, baselinePct) -> number
export function zScoreToPValue(zScore) -> number
export function calculateEffectSize(hits, trials, baselinePct) -> number
```

---

## Testing

### Test Summary

| Module | Tests | Status |
|--------|-------|--------|
| psi_research/types | 6 | Pass |
| psi_research/redeemers | 4 | Pass |
| psi_research/utils | 12 | Pass |
| psi_research/games | 6 | Pass |
| research_pool | 2 | Pass |
| **Total** | **30** | **All Pass** |

### Running Tests

```bash
cd cardano
aiken check
```

### Test Categories

1. **Commit-Reveal Tests**: Verify cryptographic commitment scheme
2. **Scoring Tests**: Verify game result determination
3. **Timeout Tests**: Verify deadline enforcement
4. **Integration Tests**: Full session lifecycle

---

## Build & Deploy

### Prerequisites

- Aiken v1.1.19+
- Cardano node (for deployment)

### Build Commands

```bash
# Navigate to project
cd cardano

# Build contracts
aiken build

# Run tests
aiken check

# Format code
aiken fmt
```

### Generated Artifacts

After `aiken build`:
- `plutus.json` - Blueprint with compiled validators
- `build/` - Compiled UPLC code

### Deployment Steps

1. Build the contracts
2. Extract validator hash from `plutus.json`
3. Fund the script address with initial stake
4. Create initial datum for session

---

## Session Lifecycle

```
┌─────────────────┐
│  Host Creates   │
│    Session      │
│ (AwaitingPart)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Participant    │────▶│  Host Timeout   │
│    Joins        │     │  (Participant   │
│ (AwaitingReveal)│     │    Claims)      │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Host Reveals   │────▶│  Mutual Cancel  │
│    Target       │     │  (Both Refund)  │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Settlement    │
│ Winner: 95%     │
│ Research: 5%    │
└─────────────────┘
```

---

## Fund Distribution

### On Settlement

| Recipient | Amount |
|-----------|--------|
| Winner | 95% of total pool |
| Research Pool | 5% of total pool |

### On Timeout

| Scenario | Distribution |
|----------|--------------|
| Host fails to reveal | Participant gets 95%, Research gets 5% |
| No one joins | Host gets 100% refund |
| Mutual cancel | Each gets their stake back |

---

## Security Considerations

1. **Commitment Scheme**: Blake2b-256 prevents pre-image attacks
2. **Deadline Enforcement**: Validity range ensures time constraints
3. **Signature Verification**: All actions require appropriate signatures
4. **Multi-sig Governance**: Research pool requires multiple approvals
5. **No Oracle Trust**: On-chain verification where possible

---

## Future Improvements

1. **Oracle Integration**: Proper Ed25519 signature verification for AI scores
2. **NFT Badges**: Reward participants with achievement NFTs
3. **Staking Rewards**: Pool staking to fund research
4. **Cross-chain**: Bridge to other blockchains for wider participation

---

## References

- [Aiken Documentation](https://aiken-lang.org/)
- [Lucid Evolution](https://github.com/Anastasia-Labs/lucid-evolution)
- [Cardano Developer Portal](https://developers.cardano.org/)
