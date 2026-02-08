# PSY Token Staking Plan for Cognosis

**Date:** 2026-02-02  
**Goal:** Implement staking for PSY tokens using Bodega's revenue-sharing model with liquid staking enhancement

---

## Bodega Market Staking Model (Reference)

### How Bodega Works

**Core Mechanism:**
1. Users stake BODEGA tokens (platform token)
2. Platform collects fees from prediction market bets
3. **50% of fees → distributed to stakers** (in ADA)
4. 50% of fees → treasury (operational costs, market creation)

**Staking Mechanics:**
- **Period:** 30-day epochs
- **Snapshot:** Taken at end of epoch (records who staked how much)
- **Rewards Distribution:** Proportional to stake amount at snapshot time
  - If you stake 10% of total → you get 10% of reward pool
- **Rewards Token:** ADA (not BODEGA) - real yield in native currency
- **Unstaking:** Can unstake anytime - tokens NOT locked!
  - You just need tokens staked AT SNAPSHOT TIME to get rewards for that period
  - This is already liquid/flexible - no lockup

**Important Clarification:**
- **Staking ≠ Locking:** BODEGA tokens are only locked when used in prediction markets (betting)
- **Staking = Snapshot-based:** You can move tokens freely, just stake them before snapshot to earn rewards

**Example:**
```
Month 1:
- Total BODEGA staked: 1,000,000 tokens
- Platform fees collected: 10,000 ADA
- Staking reward pool: 5,000 ADA (50% of fees)

User stakes 100,000 BODEGA (10% of total):
- Reward: 500 ADA (10% of 5,000 ADA)
- APR: Depends on fee volume
```

**Key Insight:** Stakers earn from platform success (fee revenue), creating alignment between token holders and platform growth.

---

## Proposed PSY Staking Model

### Core Model: Direct Bodega Clone (Simplest)

**Bodega's model is already flexible** - no token lockup!

**How it works:**
1. Users stake PSY tokens (anytime)
2. Snapshot taken at end of 30-day period
3. Rewards (50% of platform fees) distributed based on snapshot
4. Users can unstake anytime - just need to be staked at snapshot to earn

**Benefits:**
- ✅ Simple, proven model
- ✅ No lockups - use tokens elsewhere if needed
- ✅ Real yield (ADA from platform fees)
- ✅ Proportional rewards

**This may be all we need!** Simple > complex.

---

### Optional Enhancement: Liquid Staking Tokens (sPSY)

**Why add sPSY if tokens aren't locked?**

Even without lockup, sPSY could provide:
1. **Auto-compounding:** Rewards compound into sPSY value (no manual claim)
2. **Proof of stake:** sPSY shows "I was staked at snapshot" for other protocols
3. **Tradeable yield:** Sell sPSY before snapshot = transfer rewards to buyer
4. **Composability:** DeFi protocols could accept sPSY as collateral

**But:** This adds complexity. Start simple, add later if needed.

---

## Implementation Design

### 1. Staking Contract (Plutus V3)

**Stake Function:**
```
Input: PSY tokens (amount)
Output: sPSY tokens (receipt)

Example:
User stakes 1,000 PSY
→ Receives 1,000 sPSY
→ sPSY represents share of staking pool
```

**Unstake Function:**
```
Input: sPSY tokens
Output: PSY tokens + accrued rewards

Example:
User returns 1,000 sPSY after 30 days
→ Receives 1,000 PSY + 50 ADA rewards
→ sPSY burned
```

### 2. Revenue Distribution (like Bodega)

**Fee Sources (Cognosis platform):**
- Remote Viewing experiment fees
- Other experiment fees (telepathy, precognition, etc.)
- Lottery entry fees
- Future premium features

**Distribution:**
- **50% → Stakers** (distributed proportionally to sPSY holdings)
- **25% → Treasury** (platform development, operations)
- **25% → Rewards Pool** (PSY token buyback for RV rewards, lottery prizes)

**Example Revenue Split:**
```
Month 1 platform revenue: 10,000 ADA
→ 5,000 ADA to stakers (50%)
→ 2,500 ADA to treasury (25%)
→ 2,500 ADA to rewards pool (25%)

If 100,000 PSY staked total:
→ Stakers earn 0.05 ADA per PSY per month
→ ~60% APR if PSY = $0.10 and fees stable
```

### 3. sPSY Token Utility

**What makes sPSY valuable:**
- **Tradeable:** Sell sPSY on DEXs (Minswap, Indigo)
- **Collateral:** Use sPSY as collateral for CDP (borrow against staked position)
- **Composable:** Use sPSY in other DeFi protocols
- **Auto-compounding:** Rewards accumulate in sPSY value (exchange rate grows)

**Exchange Rate Mechanism:**
```
Initial: 1 PSY = 1 sPSY

After 30 days of rewards:
Total PSY staked: 100,000
Rewards added: 5,000 ADA worth of PSY (bought back)
New total value: 105,000 PSY equivalent

Exchange rate: 1 sPSY = 1.05 PSY
→ Rewards auto-compound into sPSY value
```

---

## Technical Implementation

### Phase 1: Smart Contracts (Plutus V3)

**Contracts Needed:**
1. **Staking Vault** - Holds PSY, mints/burns sPSY
2. **Rewards Distributor** - Collects fees, distributes to stakers
3. **sPSY Token Policy** - Minting policy for liquid staking tokens

**Architecture (Aiken):**
```aiken
// Staking Vault
validator staking_vault {
  stake(user: Address, amount: Int) -> sPSY_tokens {
    // Calculate sPSY to mint based on exchange rate
    let exchange_rate = get_exchange_rate()
    let spsy_amount = amount / exchange_rate
    
    // Lock PSY in vault
    lock_tokens(PSY, amount)
    
    // Mint sPSY receipt tokens
    mint_tokens(sPSY, spsy_amount, user)
  }
  
  unstake(user: Address, spsy_amount: Int) -> PSY_tokens {
    // Calculate PSY to return (including rewards)
    let exchange_rate = get_exchange_rate()
    let psy_return = spsy_amount * exchange_rate
    
    // Burn sPSY
    burn_tokens(sPSY, spsy_amount)
    
    // Return PSY + rewards
    unlock_tokens(PSY, psy_return, user)
  }
}

// Rewards Distributor
validator rewards_distributor {
  distribute_rewards(period: Int) {
    // Collect fees from platform
    let total_fees = collect_platform_fees()
    
    // Calculate distribution
    let staker_rewards = total_fees * 0.50  // 50% to stakers
    let treasury = total_fees * 0.25        // 25% to treasury
    let rewards_pool = total_fees * 0.25    // 25% to rewards pool
    
    // Buy back PSY with staker rewards
    let psy_bought = buyback_psy(staker_rewards)
    
    // Add to staking vault (increases exchange rate)
    add_to_vault(psy_bought)
    
    // Send to treasury/rewards
    send_to_treasury(treasury)
    send_to_rewards_pool(rewards_pool)
  }
}
```

### Phase 2: Frontend Integration

**Staking UI (Cognosis website):**
- `/stake` page
- Show APR (estimated based on recent fee revenue)
- Stake PSY → Receive sPSY
- Unstake sPSY → Receive PSY + rewards
- Real-time stats:
  - Total PSY staked
  - Your stake amount
  - Current exchange rate
  - Estimated APR
  - Next reward distribution date

**Example UI Flow:**
```
1. User connects Cardano wallet (Lace, Eternl, Nami)
2. Enter PSY amount to stake (e.g., 10,000 PSY)
3. Review:
   - Will receive: 10,000 sPSY
   - Current APR: 60% (based on last 30 days)
   - Next snapshot: Feb 28, 2026
4. Confirm → Transaction signs
5. Receive sPSY in wallet
6. sPSY auto-earns from platform fees
```

### Phase 3: sPSY Liquidity (DEX Integration)

**Create sPSY/ADA Pool:**
- List sPSY on Minswap (Cardano DEX)
- Provide initial liquidity: sPSY/ADA pair
- Users can trade sPSY without unstaking

**Arbitrage Opportunity:**
- sPSY should trade at premium to PSY (due to accrued rewards)
- If sPSY = 1.05 PSY equivalent, but trading at 1.02 PSY:
  - Arbitrageurs buy sPSY, unstake, sell PSY, profit 3%
  - This keeps sPSY price aligned with intrinsic value

---

## Comparison: Bodega vs. Cognosis (PSY)

| Feature | Bodega | Cognosis (Simple) | Cognosis (+ sPSY) |
|---------|--------|-------------------|-------------------|
| **Stake Token** | BODEGA | PSY | PSY |
| **Reward Token** | ADA | ADA | ADA |
| **Revenue Share** | 50% to stakers | 50% to stakers | 50% to stakers |
| **Staking Period** | 30-day epochs | 30-day epochs | 30-day epochs |
| **Token Lockup** | ✅ No lockup! | ✅ No lockup! | ✅ No lockup! |
| **Snapshot-based** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Unstaking** | Anytime | Anytime | Anytime |
| **Liquid Receipt Token** | ❌ No | ❌ No (keep simple) | ✅ sPSY optional |
| **DeFi Composability** | Limited | Limited | ✅ sPSY usable |
| **Reward Distribution** | Manual claim | Manual claim | Auto-compound (sPSY) |
| **Complexity** | Simple | Simple ✅ | More complex |

**Recommendation:** Start with simple Bodega clone (column 2). Add sPSY later if needed (column 3).

---

## Revenue Projections (Example)

### Assumptions:
- 100,000 PSY staked (10% of supply)
- Platform generates 10,000 ADA/month in fees
- 50% (5,000 ADA) goes to stakers

### Staker Returns:
```
APR calculation:
- Staker share: 5,000 ADA/month = 60,000 ADA/year
- PSY staked: 100,000
- Reward per PSY: 0.6 ADA/year

If PSY = $0.10 and ADA = $1:
- PSY market cap: $100k total supply × $0.10 = ?
- Reward value: 0.6 ADA × $1 = $0.60 per PSY staked
- APR: $0.60 / $0.10 = 600% 🚀

(More realistic with higher PSY price:
If PSY = $1, APR = 60%)
```

**Key Insight:** APR depends on:
1. Platform fee revenue (more users = higher APR)
2. PSY price (lower price = higher APR %)
3. Total PSY staked (less competition = higher share)

---

## Implementation Timeline

### Phase 1: Smart Contracts (4-6 weeks)
- [x] Research Bodega model
- [ ] Design Plutus V3 staking vault
- [ ] Design sPSY token policy
- [ ] Write Aiken validators
- [ ] Test on preprod testnet
- [ ] Security audit (if budget allows)

### Phase 2: Frontend Integration (2-3 weeks)
- [ ] Build `/stake` UI page
- [ ] Wallet connection (cardano-cli or Lucid)
- [ ] Stake/unstake transactions
- [ ] Real-time stats dashboard
- [ ] Reward history tracking

### Phase 3: sPSY Liquidity (1-2 weeks)
- [ ] List sPSY on Minswap
- [ ] Provide initial liquidity
- [ ] Monitor arbitrage activity
- [ ] Document sPSY use cases

### Phase 4: Launch (1 week)
- [ ] Deploy to mainnet
- [ ] Marketing campaign (Twitter, Discord, Cardano community)
- [ ] Incentivize early stakers (bonus rewards?)
- [ ] Monitor contract performance

**Total Timeline:** ~8-12 weeks from start to mainnet launch

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Low fee revenue** | Low staking APR → users unstake | Drive user growth, add more experiments, marketing |
| **Smart contract bug** | Funds at risk | Audit contracts, start with small TVL, gradual ramp |
| **sPSY liquidity issue** | Can't trade sPSY efficiently | Provide initial liquidity, incentivize LPs |
| **PSY price volatility** | APR fluctuates wildly | Communicate clearly (APR is variable), diversify revenue sources |
| **Regulatory** | Staking = securities? | Consult legal, geographic restrictions if needed |

---

## Next Steps

**Immediate (This Week):**
1. ✅ Research Bodega staking model (DONE)
2. [ ] Review with Albert/Kiki - approve design
3. [ ] Decide: Aiken or Plutus TS for contract development?
4. [ ] Set up preprod testnet environment

**Short-Term (Next 2 Weeks):**
1. [ ] Write staking vault validator (Aiken)
2. [ ] Write sPSY minting policy
3. [ ] Deploy to preprod
4. [ ] Test stake/unstake flows

**Medium-Term (Next 4-8 Weeks):**
1. [ ] Build frontend staking UI
2. [ ] Integrate with Cognosis website
3. [ ] Security audit (if possible)
4. [ ] Deploy to mainnet

## Recommendation: Start Simple 🦞

**Phase 1: Direct Bodega Clone (MVP)**
- Stake PSY → earn ADA from platform fees
- 30-day epochs with snapshots
- No lockup (can unstake anytime)
- 50% fees → stakers, 25% treasury, 25% rewards pool
- Simple, proven, fast to implement

**Phase 2: Add sPSY (If Needed)**
- Only if users demand more composability
- Or if we want auto-compounding
- Don't over-engineer upfront

**Timeline (Simple Model):**
- 4-6 weeks: Smart contracts (staking vault + rewards distributor)
- 2-3 weeks: Frontend (/stake page)
- 1 week: Deploy to mainnet
- **Total: 7-10 weeks** (vs 8-12 with sPSY complexity)

---

## Questions for Albert:

1. **Revenue split:** 50/25/25 (stakers/treasury/rewards) good? Or different?
2. **Rewards token:** ADA directly or use ADA to buyback PSY and distribute PSY?
3. **Snapshot frequency:** 30-day epochs (like Bodega) or weekly/monthly?
4. **Launch priority:** Fast & simple (7-10 weeks) or add sPSY upfront (10-14 weeks)?

**My vote:** Fast & simple. Start with Bodega model exactly, add enhancements later based on user feedback.

---

**Reference:**
- Bodega Docs: https://docs.bodegacardano.org/staking
- Lido (Ethereum liquid staking leader): https://lido.fi
- Cardano staking: https://docs.cardano.org/learn/pledging-and-delegation/

**Created:** 2026-02-02  
**Author:** Elliot (via Albert's request)
