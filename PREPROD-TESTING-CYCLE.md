# Preprod Testing Cycle - Quick Iteration Guide

**Created:** 2026-02-03  
**Goal:** Test full rewards/lottery cycle rapidly on preprod testnet

---

## What Was Changed

### ✅ Lottery Drawing Frequency: Weekly → Hourly

**File:** `scripts/cardano/psy-reward-config.ts`

**Before:**
```typescript
drawingFrequency: 'weekly',
drawingFrequencyMs: 7 * 24 * 60 * 60 * 1000, // 1 week
```

**After:**
```typescript
drawingFrequency: 'hourly (PREPROD TESTING)',
drawingFrequencyMs: 60 * 60 * 1000, // 1 hour (was 1 week)
```

**Impact:** Lottery drawings can now happen every hour instead of weekly, allowing rapid testing.

**Committed:** `23ff4f3`

---

## Understanding the Two Systems

### 1. **Lottery System** (Hourly on Preprod)
- **Purpose:** Users pay 1 ADA to enter weekly lottery
- **Revenue split:** 50% to prize pool, 50% to PSY holder rewards
- **Drawing frequency:** Now hourly (for testing)
- **Location:** Managed by lottery smart contract

**Files:**
- Config: `scripts/cardano/psy-reward-config.ts`
- Init script: `scripts/cardano/init-lottery-preprod.ts`
- Test claim: `scripts/cardano/test-claim-reward-preprod.ts`

### 2. **PSY Snapshot Rewards** (Separate System)
- **Purpose:** Distribute accumulated ADA to PSY holders based on holdings
- **Snapshot frequency:** Not hardcoded - run manually or via cron
- **Location:** `psy-rewards/` directory

**Files:**
- Scripts: `psy-rewards/scripts/snapshot.ts` (main), `snapshot-ogmios.ts` (advanced)
- Distributions: `psy-rewards/scripts/distribute.ts`
- Progress: `psy-rewards/PROGRESS.md`

**Status:** Still in development (Week 1 of 8-week implementation plan)

---

## How to Test Lottery Cycle (Hourly)

### Step 1: Verify Lottery Contract is Initialized

```bash
cd ~/Cognosis/scripts/cardano
npm run init:lottery:preprod
```

This initializes the lottery pool with hourly drawing frequency.

### Step 2: Submit Test Lottery Entries

Users enter lottery by paying 1 ADA fee when doing RV experiments.

**Manual entry simulation:**
```bash
# TODO: Add manual lottery entry script for testing
# For now, entries happen automatically with RV submissions
```

### Step 3: Wait 1 Hour (Preprod Testing)

On preprod, lottery drawings can happen every hour (instead of weekly).

**Check time until next drawing:**
```bash
# Query lottery contract UTxO
# Check last_drawing_time + drawing_frequency_ms
```

### Step 4: Trigger Lottery Drawing

**TODO:** Need lottery drawing script that:
1. Checks if drawing_frequency_ms has elapsed
2. Takes snapshot of lottery participants
3. Selects winner via VRF
4. Distributes accumulated ADA
5. Resets pool for next cycle

**Current status:** Drawing mechanism not yet implemented.

---

## How to Test PSY Snapshot Rewards

### Step 1: Verify Ogmios is Running

```bash
ps aux | grep ogmios
# Should show: ogmios running on port 1337

# If not running:
cd ~/Cognosis/psy-rewards
./bin/ogmios --node-socket /home/albert/cardano-preprod/node.socket \
  --node-config /home/albert/cardano-preprod/preprod-config.json \
  --host 0.0.0.0 --port 1337
```

### Step 2: Run Test Snapshot

```bash
cd ~/Cognosis/psy-rewards

# Dry run (doesn't save)
npm run snapshot -- --dry-run

# Real snapshot
npm run snapshot -- --network preprod

# Snapshot at specific block
npm run snapshot -- --block-height 4384685
```

**Output:** Saved to `snapshots/snapshot-YYYY-MM-DD.json`

### Step 3: Verify Snapshot Data

```bash
cat snapshots/snapshot-*.json | jq
```

Should show:
- List of PSY holders
- Each holder's PSY balance
- Each holder's share percentage
- Merkle root for verification

### Step 4: Run Distribution (When Ready)

```bash
cd ~/Cognosis/psy-rewards
npm run distribute -- --snapshot snapshots/snapshot-2026-02-03.json
```

**Current status:** Distribution script exists but needs testing.

---

## Quick Testing Workflow

### For Rapid Iteration (1-Hour Cycles):

1. **Morning (9 AM):**
   - Initialize lottery pool (if not done)
   - Submit 3-5 test RV experiments (generates lottery entries)

2. **10 AM (1 hour later):**
   - Trigger lottery drawing (TODO: script needed)
   - Verify winner selection
   - Check ADA distribution

3. **11 AM:**
   - Run PSY snapshot manually
   - Verify holder balances captured correctly

4. **12 PM:**
   - Run distribution (send ADA to PSY holders)
   - Verify all holders received proportional rewards

5. **Repeat:** Next lottery cycle starts at 1 PM (1 hour from 12 PM)

---

## What's Missing for Full Testing

### Lottery System:
- ✅ Drawing frequency set to hourly
- ✅ Lottery pool initialization script
- ❌ **Lottery drawing script** (triggers winner selection)
- ❌ **VRF integration** (Cardano VRF for provably fair selection)
- ❌ **Prize distribution logic** (send accumulated ADA to winner)

### PSY Snapshot Rewards:
- ✅ Snapshot script (basic structure)
- ✅ Ogmios integration
- ⏳ Distribution script (exists, needs testing)
- ❌ **Merkle proof verification** (on-chain)
- ❌ **Smart contract deployment** (rewards distributor)

---

## Recommended Next Steps

### To Test Lottery Cycle:

1. **Create lottery drawing script:**
   ```bash
   cd ~/Cognosis/scripts/cardano
   touch trigger-lottery-draw.ts
   ```

   Should:
   - Check if drawing_frequency_ms elapsed
   - Query all lottery participants from vault
   - Use Cardano VRF to select winner
   - Build transaction to distribute prize pool
   - Update lottery datum with new last_drawing_time

2. **Test on preprod:**
   - Submit entries
   - Wait 1 hour
   - Run drawing script
   - Verify winner receives ADA

### To Test PSY Rewards:

1. **Complete snapshot integration:**
   - Verify Ogmios queries work (already done)
   - Test with real preprod data
   - Generate Merkle tree

2. **Test distribution:**
   - Run `npm run distribute` with snapshot
   - Verify ADA sent to all holders proportionally
   - Check transaction success

3. **Deploy smart contract:**
   - Compile `contracts/rewards-distributor.ak`
   - Deploy to preprod
   - Test Merkle proof verification

---

## Configuration Files Reference

| File | Purpose | Current Value |
|------|---------|---------------|
| `scripts/cardano/psy-reward-config.ts` | Lottery frequency | 1 hour (preprod) |
| `psy-rewards/scripts/snapshot.ts` | Snapshot logic | Manual trigger |
| `psy-rewards/scripts/distribute.ts` | ADA distribution | Manual trigger |
| `.env` (backend) | Network config | Preprod testnet |

---

## Testing Checklist

- [ ] Lottery pool initialized with hourly frequency
- [ ] Submit 5+ test RV experiments (creates lottery entries)
- [ ] Wait 1 hour
- [ ] Trigger lottery drawing (script needed)
- [ ] Verify winner selected via VRF
- [ ] Verify prize pool distributed to winner
- [ ] Run PSY snapshot manually
- [ ] Verify all holders captured correctly
- [ ] Run distribution script
- [ ] Verify all PSY holders received ADA rewards
- [ ] Check Merkle proof verification works
- [ ] Repeat cycle 3-5 times for confidence

---

## Questions/Blockers

1. **Lottery drawing trigger:** Need script to execute draws. Should this be:
   - Manual script run by admin?
   - Automated cron job (every hour on preprod)?
   - Smart contract redeemer that anyone can call?

2. **VRF implementation:** Cardano VRF needs wallet with VRF keys. Do we:
   - Use admin wallet VRF?
   - Create dedicated VRF wallet?
   - Use Cardano-CLI VRF commands?

3. **Prize pool accumulation:** Where is lottery ADA stored between drawings?
   - In lottery contract datum?
   - In separate vault UTxO?

4. **Snapshot timing:** For testing, how often should snapshots run?
   - Same as lottery (hourly)?
   - Less frequent (daily)?
   - Manual only?

---

**Next Actions:**
1. Clarify lottery drawing mechanism
2. Create lottery drawing script
3. Test full 1-hour lottery cycle
4. Document results
5. Iterate!

**Created:** 2026-02-03  
**By:** Elliot (Agent)
