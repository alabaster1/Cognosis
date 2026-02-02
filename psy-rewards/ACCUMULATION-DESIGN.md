# PSY Rewards Accumulation System

**Date:** 2026-02-02  
**Purpose:** Ensure ALL holders get rewards (no one excluded), while avoiding dust transactions

---

## Problem Statement

**Old approach:** Skip holders who earn < 5 ADA  
**Issue:** Small holders lose rewards forever (unfair!)

**New approach:** Accumulate rewards until they reach 5 ADA threshold, then pay out  
**Benefit:** Everyone gets paid eventually, no dust transactions

---

## How It Works

### Monthly Snapshot Process:

**Step 1: Take Snapshot (NO filtering)**
- Query all PSY holders on blockchain
- Calculate each holder's share
- Calculate each holder's reward for this month
- **No exclusions** - everyone is included

**Step 2: Load Accumulated Rewards**
- Read previous accumulation state
- For each holder: `totalOwed = currentMonthReward + previouslyAccumulated`

**Step 3: Distribute (with threshold)**
- If `totalOwed >= 5 ADA` → Send it! Reset accumulation to 0
- If `totalOwed < 5 ADA` → Don't send, update accumulation

**Step 4: Save Accumulation State**
- Store updated accumulation amounts for next month

---

## Example Scenario

### Holder with 5,000 PSY (1.56% of 320k supply)

**Month 1 (Feb 2026):**
- Reward pool: 10,000 ADA
- This month's reward: 156 ADA × 1.56% = 2.43 ADA
- Previously accumulated: 0 ADA
- **Total owed: 2.43 ADA**
- **Action:** Accumulate (< 5 ADA threshold)
- **Accumulation state:** 2.43 ADA

**Month 2 (Mar 2026):**
- Reward pool: 12,000 ADA
- This month's reward: 187.2 ADA × 1.56% = 2.92 ADA
- Previously accumulated: 2.43 ADA
- **Total owed: 5.35 ADA**
- **Action:** Send 5.35 ADA! ✅
- **Accumulation state:** 0 ADA (reset)

**Month 3 (Apr 2026):**
- Reward pool: 8,000 ADA
- This month's reward: 124.8 ADA × 1.56% = 1.95 ADA
- Previously accumulated: 0 ADA
- **Total owed: 1.95 ADA**
- **Action:** Accumulate (< 5 ADA threshold)
- **Accumulation state:** 1.95 ADA

---

## Data Structures

### Snapshot File (includes everyone):

```json
{
  "blockHeight": 4384686,
  "period": 682,
  "holders": [
    {
      "address": "addr_test1...",
      "psyBalance": 100000,
      "share": 31.25,
      "monthlyReward": 3125000000  // 3,125 ADA in lovelace
    },
    {
      "address": "addr_test1...small",
      "psyBalance": 5000,
      "share": 1.56,
      "monthlyReward": 156000000  // 156 ADA in lovelace
    }
  ]
}
```

### Accumulation State (persisted between snapshots):

```json
{
  "lastUpdated": "2026-02-28",
  "period": 682,
  "accumulated": {
    "addr_test1...small": {
      "amount": 2430000,  // 2.43 ADA in lovelace
      "sinceBlock": 4384686,
      "monthsAccumulated": 1
    },
    "addr_test1...tiny": {
      "amount": 950000,  // 0.95 ADA in lovelace
      "sinceBlock": 4384686,
      "monthsAccumulated": 1
    }
  }
}
```

### Distribution List (only those >= 5 ADA):

```json
{
  "period": 682,
  "distributions": [
    {
      "address": "addr_test1...",
      "amount": 3125000000,  // 3,125 ADA (this month only)
      "accumulated": 0,
      "totalSent": 3125000000
    },
    {
      "address": "addr_test1...medium",
      "amount": 5350000,  // 5.35 ADA (2.43 + 2.92 accumulated)
      "accumulated": 2430000,
      "totalSent": 5350000,
      "monthsAccumulated": 2
    }
  ],
  "notDistributed": [
    {
      "address": "addr_test1...small",
      "monthlyReward": 1560000,
      "accumulated": 2430000,
      "totalOwed": 3990000,  // 3.99 ADA (still < 5)
      "reason": "Below 5 ADA threshold"
    }
  ]
}
```

---

## Implementation Changes

### Snapshot Script Updates:

```typescript
// NEW: Load previous accumulation
const prevAccumulation = loadAccumulationState(period - 1);

// Calculate rewards for all holders (no filtering!)
const holders = calculateShares(holdersMap, 0, rewardPool);  // Min threshold = 0

// Calculate total owed (monthly + accumulated)
const distributions = [];
const newAccumulation = {};

for (const holder of holders) {
  const monthlyReward = Math.floor((rewardPool * holder.share) / 100);
  const previouslyAccumulated = prevAccumulation[holder.address] || 0;
  const totalOwed = monthlyReward + previouslyAccumulated;
  
  if (totalOwed >= 5_000_000) {  // 5 ADA threshold
    // Send it!
    distributions.push({
      address: holder.address,
      amount: totalOwed,
      monthlyReward,
      accumulated: previouslyAccumulated,
    });
    // Reset accumulation
    newAccumulation[holder.address] = 0;
  } else {
    // Accumulate
    newAccumulation[holder.address] = totalOwed;
  }
}

// Save new accumulation state
saveAccumulationState(period, newAccumulation);
```

### Smart Contract Updates:

Contract doesn't need to track accumulation (off-chain handles it).

Contract just needs to verify:
1. Holder had PSY at snapshot time (Merkle proof)
2. Distribution amount is correct (matches snapshot)

---

## Benefits

1. **Fair:** Everyone gets paid eventually (no one excluded)
2. **Efficient:** Avoids dust transactions (only send >= 5 ADA)
3. **Transparent:** Holders can see accumulated balance
4. **Simple contract:** Accumulation logic off-chain (cheaper)

---

## Edge Cases

### What if holder sells PSY before accumulation pays out?

**Answer:** They still get their accumulated rewards!
- Snapshot captures PSY balance at specific block
- Rewards earned for that period
- Even if they sell later, they earned it

**Example:**
- Month 1: Hold 5,000 PSY → earn 2.4 ADA (accumulate)
- Month 2: Sell all PSY → still owe 2.4 ADA from Month 1
- Month 3: They hold 0 PSY → earn 0 new, but still owe 2.4 ADA accumulated
- Eventually: Pay out when/if they buy more PSY and accumulate > 5 ADA

**Alternative (simpler):** Only accumulate if they still hold PSY in next snapshot
- Pro: Cleaner (only active holders accumulate)
- Con: If someone sells and buys back, they lose accumulation

**Recommendation:** Keep accumulation even after selling (more fair)

### What if platform fees decrease and accumulation never reaches 5 ADA?

**Solution:** After X months (e.g., 12 months), force payout regardless of threshold
- Prevents infinite accumulation
- Ensures everyone gets paid within 1 year

---

## UI Display

On `/rewards` page, show holders their status:

```
Your PSY Holdings: 5,000 PSY (1.56% of supply)

This Month's Reward: 2.43 ADA
Accumulated Balance: 2.43 ADA (from Feb 2026)
Status: Accumulating (need 2.57 ADA more to reach 5 ADA threshold)

Estimated Payout: March 2026 (if fee volume stable)
```

---

## Implementation Timeline

**This week:**
- [x] Design accumulation system (DONE)
- [ ] Update snapshot script to load/save accumulation
- [ ] Test with mock data (3+ months simulation)
- [ ] Update distribution script to only send >= 5 ADA

**Next week:**
- [ ] Build accumulation state viewer (CLI tool)
- [ ] Add accumulation display to frontend
- [ ] Test edge cases (holder sells, buys back, etc.)

---

**Decision:** Approved by Albert 2026-02-02 ✅

**Next Steps:**
1. Update snapshot-ogmios.ts to implement accumulation
2. Create accumulation-state.json persistence
3. Test multi-month scenario
4. Verify no one loses rewards
