# Lottery Fee Update: 0.01 ADA → 1 ADA

**Date:** 2026-02-02  
**Decision:** Increase lottery entry fee from 0.01 ADA to 1 ADA

---

## Rationale

### Current Problem:
- Entry fee: 0.01 ADA (too low)
- Example: 100 entries = 1 ADA total fees
  - Too small to meaningfully fund holder rewards
  - Lottery prize pool is tiny

### New Model:
- Entry fee: **1 ADA**
- Example: 100 entries = 100 ADA total fees
  - 50 ADA → PSY holder rewards (50%)
  - 50 ADA → lottery prize pool (50%)

### Benefits:
1. **Sustainable revenue** for holder rewards
2. **Larger lottery prizes** (more attractive)
3. **Filters spam** (1 ADA commitment = more serious participants)
4. **Better economics** for platform sustainability

---

## Implementation

### Frontend Update:
**File:** `/home/albert/Cognosis/src/app/page.tsx` (lottery section)

**Current text:**
```tsx
<p className="text-xs text-slate-500 leading-relaxed">
  Rewards use an exponential curve - high accuracy is significantly rewarded. 
  AI scoring ensures objective, reproducible results.
</p>
```

**Update to:**
```tsx
<p className="text-xs text-slate-500 leading-relaxed">
  Entry fee: 1 ADA. 50% goes to weekly prize pool, 50% funds PSY holder rewards. 
  Provably fair drawing via Cardano VRF.
</p>
```

### Smart Contract Update:

**Current lottery contract:**
```aiken
validator lottery {
  enter_lottery(user: Address) {
    // Check entry fee (0.01 ADA)
    assert(tx.fee == 10000 lovelace)  // 0.01 ADA = 10,000 lovelace
    
    // Add to participant list
    add_participant(user)
  }
}
```

**Updated lottery contract:**
```aiken
validator lottery {
  enter_lottery(user: Address) {
    // Check entry fee (1 ADA)
    assert(tx.fee == 1000000 lovelace)  // 1 ADA = 1,000,000 lovelace
    
    // Add to participant list
    add_participant(user)
    
    // Split fees
    let holder_rewards = tx.fee * 0.5  // 50%
    let prize_pool = tx.fee * 0.5      // 50%
    
    send_to_holder_rewards_contract(holder_rewards)
    add_to_lottery_pool(prize_pool)
  }
}
```

### Database/Config Update:

**File:** Backend config or database

```javascript
// Update lottery entry fee
const LOTTERY_ENTRY_FEE = 1_000_000; // 1 ADA in lovelace (was 10_000)

// Update revenue split
const REVENUE_SPLIT = {
  holderRewards: 0.50,  // 50% to PSY holders
  lotteryPool: 0.50     // 50% to lottery prize
};
```

---

## Migration Plan

### Step 1: Update Smart Contract
- Deploy new lottery contract with 1 ADA fee
- Test on preprod testnet
- Verify fee split (50/50)

### Step 2: Update Frontend
- Change all lottery entry buttons/text to show "1 ADA entry"
- Update FAQ/help text
- Add tooltip: "50% to prize pool, 50% to PSY holder rewards"

### Step 3: Announce Change
- Blog post explaining new economics
- Twitter announcement
- Discord notification
- Email to existing users (if applicable)

### Step 4: Deploy
- Deploy new contract to mainnet
- Update frontend
- Monitor first few entries

**Estimated Time:** 1-2 weeks

---

## User Impact

### Before (0.01 ADA):
- "Almost free" entry
- Tiny prize pools
- Spam risk (people entering hundreds of times)

### After (1 ADA):
- More meaningful commitment
- Larger, more attractive prizes
- Sustainable revenue for platform
- Filters non-serious participants

**Example Weekly Lottery:**

**Old Model (0.01 ADA):**
- 100 entries × 0.01 ADA = 1 ADA total
- Prize pool: 0.5 ADA (not exciting)
- Holder rewards: 0.5 ADA (negligible)

**New Model (1 ADA):**
- 100 entries × 1 ADA = 100 ADA total
- Prize pool: 50 ADA (attractive!)
- Holder rewards: 50 ADA (meaningful APR contribution)

---

## Communication to Users

**Announcement Template:**

> 🎰 **Lottery Update: Bigger Prizes, Better Rewards**
> 
> We're increasing the lottery entry fee from 0.01 ADA to 1 ADA to create:
> - **Larger prize pools** (more exciting weekly draws!)
> - **Sustainable rewards** for PSY token holders (50% of fees)
> - **Fair economics** that support platform growth
> 
> **How it works:**
> - Enter weekly lottery: 1 ADA
> - 50% goes to that week's prize pool
> - 50% goes to PSY holder rewards (distributed monthly)
> - Same provably fair VRF drawing
> 
> **Why the change?**
> At 0.01 ADA, prize pools were too small to be exciting and holder rewards were negligible. 1 ADA creates sustainable economics while keeping entry affordable.
> 
> Questions? Join our Discord or check the FAQ.

---

## Rollout Checklist

- [ ] Update lottery smart contract (1 ADA fee)
- [ ] Deploy contract to preprod testnet
- [ ] Test entry flow (verify 1 ADA charge)
- [ ] Verify fee split (50% holders, 50% pool)
- [ ] Update frontend UI (entry fee display)
- [ ] Update FAQ/help text
- [ ] Write announcement blog post
- [ ] Post on Twitter/Discord
- [ ] Deploy to mainnet
- [ ] Monitor first week of entries

**Target Launch:** Align with PSY snapshot rewards launch (March 2026)

---

**Created:** 2026-02-02  
**Status:** Pending implementation  
**Priority:** High (required for sustainable holder rewards)
