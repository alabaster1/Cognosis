

# PSY Reward System v2 - Deployment Guide

## Overview

New accuracy-based reward system with lottery mechanics:
- **Base reward:** 100 PSY (participation)
- **Max reward:** 400 PSY (perfect accuracy)
- **Exponential curve:** Steepness 2.5
- **Lottery:** 0.01 ADA per submission → weekly jackpot
- **Sustainability:** 937+ years at 500 submissions/week

---

## Architecture

### Smart Contracts

1. **Reward Vault v2** (`reward_vault_v2.ak`)
   - Distributes PSY based on accuracy scores
   - Sends 0.01 ADA to lottery pool per claim
   - Admin can adjust parameters

2. **PSY Lottery** (`psy_lottery.ak`)
   - Accumulates 0.01 ADA fees
   - Weekly drawings weighted by PSY earned
   - Hybrid sqrt/log ticket formula (α=0.5)

3. **PSY Token** (existing minting policy)
   - 10 billion total supply
   - Standard Cardano native token

---

## Deployment Steps

### 1. Build Validators

```bash
cd /home/albert/Cognosis/validators

# Check Aiken is installed
source ~/.aiken/bin/env
aiken --version

# Build all validators
aiken build

# Validators will be in: plutus.json
```

**Expected output:**
```json
{
  "validators": [
    {
      "title": "reward_vault_v2.reward_vault",
      "compiledCode": "...",
      "hash": "..."
    },
    {
      "title": "psy_lottery.psy_lottery",
      "compiledCode": "...",
      "hash": "..."
    }
  ]
}
```

### 2. Extract Validator Hashes

```bash
# Extract reward vault hash
cat plutus.json | jq -r '.validators[] | select(.title == "reward_vault_v2.reward_vault") | .hash'

# Extract lottery hash
cat plutus.json | jq -r '.validators[] | select(.title == "psy_lottery.psy_lottery") | .hash'

# Save these hashes - you'll need them!
```

### 3. Mint PSY Tokens (Preprod First)

```bash
cd /home/albert/Cognosis/scripts/cardano

# Set environment
export BLOCKFROST_API_KEY=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL
export WALLET_SEED_PHRASE="<your 24-word seed>"

# Mint 10 billion PSY
npx tsx mint-preprod-psy.ts 10000000000

# This mints the full supply to your wallet
```

### 4. Initialize Reward Vault

```bash
# Create initialization script (TypeScript)
npx tsx init-reward-vault.ts \
  --vault-hash <reward_vault_hash> \
  --lottery-hash <lottery_hash> \
  --psy-amount 5000000000 \
  --network preprod
```

**Vault initialization datum:**
```json
{
  "psy_policy_id": "<PSY_POLICY_ID>",
  "psy_asset_name": "505359",  // "PSY" in hex
  "base_reward": 100,
  "max_reward": 400,
  "reward_steepness": 250,     // 2.5 * 100
  "lottery_fee_lovelace": 10000,  // 0.01 ADA
  "lottery_script_hash": "<LOTTERY_HASH>",
  "experiment_script_hash": "<EXPERIMENT_HASH>",
  "admin_pkh": "<YOUR_PKH>",
  "total_claims": 0
}
```

### 5. Initialize Lottery Pool

```bash
npx tsx init-lottery-pool.ts \
  --lottery-hash <lottery_hash> \
  --vault-hash <vault_hash> \
  --network preprod
```

**Lottery initialization datum:**
```json
{
  "drawing_frequency_ms": 604800000,  // 1 week
  "last_drawing_time": 1738353600000, // Current time
  "accumulated_ada": 0,
  "alpha_weight": 50,  // 0.5 * 100
  "admin_pkh": "<YOUR_PKH>",
  "vault_script_hash": "<VAULT_HASH>"
}
```

### 6. Test Reward Claim

```bash
# Simulate participant claiming reward
npx tsx test-claim-reward.ts \
  --accuracy 75 \
  --network preprod

# Expected: 246 PSY + 0.01 ADA to lottery
```

### 7. Test Lottery Drawing

```bash
# After accumulating some fees, test weekly drawing
npx tsx test-lottery-draw.ts \
  --entries-file lottery-entries.json \
  --network preprod

# Selects winner based on PSY-weighted probability
```

---

## Reward Examples

| Accuracy | PSY Reward | Calculation |
|----------|------------|-------------|
| 20% | 105 PSY | 100 + 300 * 0.04 |
| 50% | 153 PSY | 100 + 300 * 0.18 |
| 75% | 246 PSY | 100 + 300 * 0.42 |
| 90% | 331 PSY | 100 + 300 * 0.70 |
| 95% | 364 PSY | 100 + 300 * 0.81 |
| 100% | 400 PSY | 100 + 300 * 1.00 |

**Formula:** `reward = 100 + 300 * (accuracy/100)^2.5`

---

## Lottery Mechanics

### Ticket Weighting (α=0.5)

| PSY Earned | Tickets | Advantage |
|------------|---------|-----------|
| 25 PSY | 10.7 | 1.0x (baseline) |
| 50 PSY | 13.4 | 1.25x |
| 75 PSY | 15.2 | 1.42x |
| 100 PSY | 16.5 | 1.54x |
| 150 PSY | 18.7 | 1.75x |
| 200 PSY | 20.3 | 1.90x |

**Formula:** `tickets = 0.5 * sqrt(psy) + 0.5 * log(psy+1) * 5`

### Weekly Jackpot Projections

| Submissions/Week | Weekly Jackpot (ADA) |
|------------------|----------------------|
| 100 | 1 ADA |
| 500 | 5 ADA |
| 1,000 | 10 ADA |
| 5,000 | 50 ADA |

---

## Admin Operations

### Update Reward Parameters

```bash
npx tsx update-vault-params.ts \
  --base-reward 100 \
  --max-reward 400 \
  --steepness 2.5 \
  --network preprod
```

### Trigger Lottery Drawing

```bash
# Run weekly (can automate via cron)
npx tsx draw-lottery-winner.ts \
  --entries-file entries-week-of-2026-01-31.json \
  --network preprod
```

### Top Up Vault

```bash
# Add more PSY tokens to vault
npx tsx topup-vault.ts \
  --amount 1000000 \
  --network preprod
```

---

## Security Considerations

### Validator Constraints

✅ **Reward Vault:**
- Must verify experiment UTxO spent alongside claim
- Accuracy score must be 0-100
- Lottery fee must be sent to lottery contract
- Only admin can update parameters

✅ **Lottery Pool:**
- Only vault can add fees automatically
- Drawing requires admin signature + time lock
- Winner selection must be verifiable
- Cannot draw more than accumulated amount

### Recommended Safeguards

1. **Multi-sig admin** - Use multiple keys for admin operations
2. **Parameter bounds** - Enforce min/max on reward parameters
3. **Time locks** - Prevent rapid parameter changes
4. **Monitoring** - Track vault balance and claim rate
5. **Audit** - Get smart contracts audited before mainnet

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
// Reward vault
- Total PSY distributed
- Claims per week
- Average accuracy score
- Vault PSY balance
- Total claims counter

// Lottery pool
- Accumulated ADA
- Drawings completed
- Unique participants
- Average ticket count
- Winner distribution
```

### Dashboard Queries

```bash
# Check vault status
npx tsx query-vault-status.ts --network preprod

# Check lottery pool
npx tsx query-lottery-status.ts --network preprod

# Get claim history
npx tsx get-claim-history.ts --limit 100 --network preprod
```

---

## Mainnet Deployment Checklist

- [ ] Test all operations on preprod
- [ ] Audit smart contracts
- [ ] Multi-sig admin setup
- [ ] Monitor preprod for 2+ weeks
- [ ] Document emergency procedures
- [ ] Set up alerting (low vault balance, etc.)
- [ ] Deploy frontend integration
- [ ] Mint PSY tokens on mainnet
- [ ] Initialize mainnet vault
- [ ] Initialize mainnet lottery
- [ ] Announce launch!

---

## Troubleshooting

### Common Issues

**Issue:** "Insufficient PSY in vault"
- **Fix:** Run `topup-vault.ts` to add more tokens

**Issue:** "Accuracy score validation failed"
- **Fix:** Ensure score is 0-100 integer

**Issue:** "Lottery drawing fails"
- **Fix:** Check time lock (1 week must have passed)

**Issue:** "Transaction too large"
- **Fix:** Reduce number of lottery entries per transaction

---

## Next Steps

1. ✅ Build validators (`aiken build`)
2. ⏳ Generate wallet (Brave setup tonight)
3. ⏳ Mint PSY tokens on preprod
4. ⏳ Initialize reward vault
5. ⏳ Initialize lottery pool
6. ⏳ Test claim + drawing
7. ⏳ Deploy to mainnet

---

**Questions?** Check `/scripts/cardano/README.md` or ping @Elliot on Discord.
