# Psy Token Participation Reward Vault — Technical Notes

> Draft notes for white paper. Based on implementation session, January 2026.

---

## Overview

The Reward Vault is an on-chain Cardano smart contract that holds pre-minted Psy tokens and distributes them to participants when games settle. It uses a **hyperbolic decay function** so early participants earn more, with rewards decreasing as total participation grows.

The vault is consumed in the **same transaction** as game settlement — the standard Cardano pattern for cross-validator communication. No oracle is needed; the vault simply verifies that a `psi_experiment` script input is being spent.

---

## Decay Function

```
reward = base_reward × decay_factor / (decay_factor + total_claims)
```

### Properties

| total_claims | reward | interpretation |
|---|---|---|
| 0 | base_reward | Full reward for first participant |
| decay_factor | base_reward / 2 | Half-reward at midpoint |
| 2 × decay_factor | base_reward / 3 | One-third at 2× midpoint |
| ∞ | → 0 | Asymptotically approaches zero |

### Why Hyperbolic Decay

- **Integer-safe**: Uses only multiplication and division — no floating point, no square roots, no logarithms on-chain.
- **Smooth and predictable**: Unlike linear decay (which hits zero abruptly) or exponential decay (which requires fixed-point math), hyperbolic decay provides a natural, continuously diminishing reward curve.
- **Tunable**: Two parameters (`base_reward`, `decay_factor`) control the initial magnitude and the rate of decline independently.
- **Incentive-compatible**: Creates urgency for early participation without punishing latecomers with zero rewards.

---

## Cumulative Distribution

The total tokens distributed after N claims is the harmonic partial sum:

```
S(N) = Σ(i=0 to N-1) [base_reward × decay_factor / (decay_factor + i)]
     ≈ base_reward × decay_factor × ln(1 + N / decay_factor)
```

This grows **logarithmically** — the series diverges, but slowly. Each successive "chunk" of tokens requires exponentially more claims to distribute.

### Distribution Timeline (5B tokens locked, various parameters)

| base_reward | decay_factor | 1st claim | @ 10K claims | @ 100K claims | Claims to exhaust 5B |
|---|---|---|---|---|---|
| 50,000 | 10,000 | 50,000 | 25,000 | 4,545 | ~2.7M |
| 10,000 | 50,000 | 10,000 | 8,333 | 3,333 | ~26M |
| 5,000 | 100,000 | 5,000 | 4,545 | 2,500 | ~86M |

### Recommended Initial Parameters

For a platform expecting ~10K–100K game settlements in year one:

```
base_reward  = 50,000   (50K Psy tokens for first claim)
decay_factor = 10,000   (half-reward reached at 10K claims)
```

This distributes approximately:
- ~347M tokens in the first 10K claims
- ~1.7B tokens in the first 100K claims
- Leaves ~3.3B for long-tail distribution

The admin `UpdateParams` redeemer allows adjusting the curve without redeploying if participation differs from projections.

---

## Token Economics Context

- **Total Psy supply**: 10,000,000,000 (10B)
- **Locked in reward vault**: 5,000,000,000 (5B) — 50% of supply
- **Distribution mechanism**: Purely participation-driven, no staking or time-lock requirements
- **Eligibility**: Any participant in a settled game (both host and participant can claim)

### Safety Mechanisms

1. **Vault balance is the hard cap** — the validator enforces `output_tokens == input_tokens - reward`, so the vault cannot overspend regardless of the formula.
2. **Zero-reward rejection** — when integer division truncates `reward` to 0, the validator rejects the claim (`expect reward > 0`).
3. **Settlement proof** — rewards can only be claimed in the same transaction as a legitimate game settlement (verified by checking for a `psi_experiment` script input).

---

## On-Chain Architecture

### Validator: `reward_vault`

A spending validator with three redeemers:

#### ClaimReward { participant }

Verification steps:
1. A `psi_experiment` script input exists in `tx.inputs` (settlement proof)
2. Calculate reward via decay function
3. Reward > 0 (reject if decayed to zero)
4. An output pays at least `reward` Psy tokens to `participant`
5. Continuing vault UTxO has:
   - `total_claims` incremented by 1
   - Psy token balance reduced by exactly `reward`
   - All other datum fields unchanged

#### TopUp

- Requires admin signature
- Continuing output has more Psy tokens than input
- Datum unchanged

#### UpdateParams { new_base_reward, new_decay_factor }

- Requires admin signature
- New values must be positive
- Vault token balance unchanged
- Datum updated only in `base_reward` and `decay_factor` fields

### Datum Structure

```
RewardVaultDatum {
  psy_policy_id: PolicyId,
  psy_asset_name: ByteArray,
  base_reward: Int,
  decay_factor: Int,
  total_claims: Int,
  experiment_script_hash: ByteArray,
  admin_pkh: VerificationKeyHash,
}
```

---

## Cross-Validator Communication

The vault uses Cardano's native UTxO composition model:

```
Transaction:
  Inputs:
    - psi_experiment UTxO (spent with Reveal/SubmitScore redeemer)
    - reward_vault UTxO (spent with ClaimReward redeemer)
  Outputs:
    - Settlement payouts (winner, research pool)
    - Psy token reward to participant
    - Continuing reward_vault UTxO (updated datum + reduced balance)
```

The vault validator checks for a script input matching `experiment_script_hash` — it doesn't need to know which game type or redeemer was used. Any legitimate settlement qualifies.

---

## Design Decisions

1. **Same-transaction proof over oracle**: No external oracle needed. The presence of a `psi_experiment` input proves a game is settling in this transaction.

2. **Both host and participant can claim**: The `participant` field in `ClaimReward` can be either party's PKH. The off-chain transaction builder decides who receives the reward. This allows flexible incentive structures (e.g., both parties get rewards, or only the winner).

3. **Admin-controlled parameters**: The `UpdateParams` redeemer allows tuning the decay curve without redeploying the validator. This is critical for a new platform where participation rates are uncertain.

4. **No time-lock or vesting**: Rewards are immediately available. The decay function itself provides the distribution schedule — no need for additional vesting complexity.

5. **Hyperbolic over linear/exponential**: Linear decay hits zero and stops. Exponential decay requires fixed-point math. Hyperbolic decay is the only curve that is both integer-safe and asymptotically approaches zero without ever reaching it.

---

## Implementation

- **Language**: Aiken v2.2.0
- **Files**: `validators/reward_vault.ak`, `lib/psi_research/reward_types.ak`
- **Tests**: 5 unit tests covering decay properties (first claim, midpoint, monotonic decrease, non-negativity, decay factor comparison)
- **Build**: Compiles with `aiken build`, all 35 project tests pass with `aiken check`
