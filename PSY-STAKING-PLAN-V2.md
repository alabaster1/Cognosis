# PSY Snapshot-Based Rewards (Simple Holder Rewards)

**Date:** 2026-02-02 (Updated after Albert's clarification)  
**Model:** Snapshot-based rewards for PSY holders (simpler than traditional staking!)

---

## Core Concept: Just Hold PSY, Earn ADA

**No staking action required!**

1. Users earn PSY from Remote Viewing experiments (or buy on DEX)
2. PSY accumulates in their wallet
3. Every 30 days: Take blockchain snapshot
4. Distribute ADA rewards proportionally to PSY holders
5. Users can use/trade PSY anytime (fully liquid)

**This is SIMPLER than Bodega** - no explicit staking needed!

---

## How It Works

### Step 1: Platform Collects Fees
- Remote Viewing experiment fees
- Other experiment fees
- **Lottery entry fees** (increased to 1 ADA from 0.01 ADA)
- Future premium features

**Revenue Split:**
- 50% → PSY Holder Rewards (distributed in ADA, auto-send)
- 50% → Lottery Pool (weekly draws)

**Lottery Fee Update:**
- Current: 0.01 ADA per entry (too low)
- New: 1 ADA per entry
- **Why:** More sustainable revenue for holder rewards + larger lottery prizes
- **Impact:** If 100 people enter weekly lottery = 100 ADA fees
  - 50 ADA → holder rewards
  - 50 ADA → lottery prize pool

### Step 2: Monthly Snapshot
Every 30 days:
1. Query Cardano blockchain for all addresses holding PSY
2. Record PSY balance for each address
3. Calculate proportional share

**Example Snapshot:**
```json
{
  "snapshot_date": "2026-02-28",
  "total_psy_supply": 1000000,
  "holders": [
    {"address": "addr1...", "psy_balance": 10000, "share_pct": 1.0},
    {"address": "addr2...", "psy_balance": 50000, "share_pct": 5.0},
    // ... all holders
  ]
}
```

### Step 3: Distribute ADA Rewards
Based on snapshot:
- Total reward pool: 5,000 ADA (50% of month's fees)
- Address 1 (1% of supply): 50 ADA
- Address 2 (5% of supply): 250 ADA
- etc.

**Distribution method:**
- Batch transaction sends ADA to all eligible addresses
- Or claim portal (users claim their ADA based on snapshot)

---

## User Experience

### For Regular Users:
1. Do Remote Viewing experiment
2. Earn ~200 PSY as reward
3. PSY sits in wallet (can trade/use anytime)
4. End of month: Receive ADA proportional to PSY held
5. Repeat!

**No staking UI needed!** Just hold PSY → earn ADA.

### For Whale Holders:
1. Buy large PSY position on Minswap
2. Hold until snapshot
3. Earn larger ADA rewards
4. Can sell PSY anytime (fully liquid)

---

## Technical Implementation

### Smart Contract (Plutus V3)

**Rewards Distributor Contract:**
```aiken
validator rewards_distributor {
  // Collect platform fees
  collect_fees(period: Int) -> ADA_amount {
    let total_fees = sum_platform_fees(period)
    let holder_rewards = total_fees * 0.50  // 50%
    let treasury = total_fees * 0.25        // 25%
    let rewards_pool = total_fees * 0.25    // 25%
    
    send_to_treasury(treasury)
    send_to_rewards_pool(rewards_pool)
    
    return holder_rewards
  }
  
  // Take snapshot of PSY holders
  snapshot_psy_holders(block_height: Int) -> Snapshot {
    // Query all UTxOs containing PSY token
    let psy_utxos = query_all_psy_utxos(block_height)
    
    // Aggregate by address
    let holders = aggregate_by_address(psy_utxos)
    
    // Calculate shares
    let total_supply = sum(holders.balances)
    let shares = holders.map(h => {
      address: h.address,
      psy_balance: h.balance,
      share_pct: (h.balance / total_supply) * 100
    })
    
    return Snapshot {
      block_height: block_height,
      timestamp: get_block_time(block_height),
      holders: shares,
      total_supply: total_supply
    }
  }
  
  // Distribute ADA based on snapshot
  distribute_rewards(snapshot: Snapshot, reward_pool: ADA_amount) {
    for holder in snapshot.holders {
      let reward = reward_pool * (holder.share_pct / 100)
      if reward > 1.0 {  // Min 1 ADA to reduce tx spam
        send_ada(holder.address, reward)
      }
    }
  }
}
```

### Snapshot Mechanism

**Option A: Automated (On-Chain)**
- Contract queries blockchain state at specific block height
- Aggregates PSY holdings automatically
- **Challenge:** Expensive to query all UTxOs on-chain

**Option B: Off-Chain Indexer (Better)**
- Off-chain service queries blockchain state at snapshot time
- Generates snapshot data
- Contract verifies snapshot (Merkle root or similar)
- **Cheaper and faster**

**Indexer Options (No Blockfrost):**
1. **Koios API** - Similar to Blockfrost, public API, free tier
2. **cardano-db-sync** - Run our own indexer (full control, no external dependency)
3. **Ogmios + Kupo** - Lightweight local solution (fast, efficient)
4. **cardano-cli direct** - Query UTxOs directly (slow but simple, no extra services)

**Recommended:** Ogmios + Kupo (best balance of control + efficiency)

### Distribution Method: Auto-Send ✅

**Batch transactions** sent automatically to all eligible holders:
- Contract sends ADA directly to holder addresses
- **Min threshold: 5 ADA** (only send if reward ≥5 ADA)
  - Avoids spam/dust transactions
  - Can be lowered later if needed
- **Pro:** Automatic, seamless UX (no user action)
- **Con:** Platform pays tx fees (but worth it for UX)

**Implementation:**
- Off-chain script batches holders into groups (Cardano tx limits)
- Sends multiple batch txs if needed (split large holder lists)
- Users wake up to ADA in wallet - no action needed!

---

## User Interface

### Website: `/rewards` Page

**Shows:**
- Current period stats:
  - Days until next snapshot: 15 days
  - Platform fees collected: 8,500 ADA
  - Estimated reward pool: 4,250 ADA (50%)
  - Your PSY balance: 10,000 PSY
  - Your estimated reward: ~42.5 ADA (1% of supply)
  
- Past snapshots:
  - Feb 2026: You earned 35 ADA (claimed ✅)
  - Jan 2026: You earned 28 ADA (claimed ✅)
  - Dec 2025: You earned 31 ADA (claimed ✅)

**Actions:**
- View snapshot history
- Claim unclaimed ADA rewards
- See APR estimate (based on PSY price + recent fee volume)

---

## Advantages Over Traditional Staking

| Feature | Traditional Staking | Snapshot Rewards |
|---------|---------------------|------------------|
| **User Action** | Must explicitly stake | Just hold PSY |
| **Liquidity** | Locked or semi-locked | Fully liquid |
| **Receipt Token** | Often requires (sPSY) | None needed |
| **Complexity** | Stake/unstake UI | None - automatic |
| **Gas Fees** | Stake + unstake txs | Only claim tx |
| **Smart Contract** | Staking vault needed | Simple distributor |
| **UX** | Extra steps | Seamless |

**Winner:** Snapshot rewards (simpler, better UX)

---

## Example Scenarios

### Scenario 1: Active RV Participant
- **Month 1:**
  - Does 5 Remote Viewing sessions
  - Earns 1,000 PSY total
  - Snapshot taken: 1,000 PSY held
  - Platform fees: 10,000 ADA → 5,000 ADA to holders
  - Total PSY supply: 500,000
  - Share: 0.2%
  - **Reward: 10 ADA**

- **Month 2:**
  - Does 10 more RV sessions
  - Earns another 2,000 PSY (total: 3,000 PSY)
  - Snapshot taken: 3,000 PSY held
  - Platform fees: 12,000 ADA → 6,000 ADA to holders
  - Total PSY supply: 550,000
  - Share: 0.545%
  - **Reward: 32.7 ADA**

### Scenario 2: PSY Whale
- Buys 100,000 PSY on Minswap (~10% of supply)
- Holds for 6 months
- Each month earns ~10% of reward pool
- If avg monthly pool = 5,000 ADA → 500 ADA/month
- **6-month earnings: 3,000 ADA**
- Can sell PSY anytime (no lockup)

---

## Revenue Projections

### Assumptions:
- 500,000 PSY total supply
- Platform generates 10,000 ADA/month in fees
- 50% (5,000 ADA) distributed to holders

### APR Calculation:
```
Monthly reward pool: 5,000 ADA
Annual reward pool: 60,000 ADA

If PSY = $0.10 and ADA = $1:
- PSY market cap: 500,000 × $0.10 = $50,000
- Annual rewards: 60,000 ADA × $1 = $60,000
- APR: $60,000 / $50,000 = 120% 🚀

(More realistic with higher PSY price:
If PSY = $1:
- Market cap: $500,000
- APR: $60,000 / $500,000 = 12%)
```

**Key variables:**
1. Platform fee volume (more users = higher APR)
2. PSY price (lower price = higher APR %)
3. Total PSY supply (dilution from new rewards)

---

## Implementation Timeline

### Phase 1: Smart Contracts (3-4 weeks)
- [x] Research snapshot-based reward models
- [ ] Design rewards distributor contract (Aiken)
- [ ] Build off-chain indexer (Blockfrost API)
- [ ] Snapshot mechanism (query PSY holders)
- [ ] Verification logic (Merkle root or hash)
- [ ] Test on preprod testnet
- [ ] Security review

### Phase 2: Frontend Integration (2-3 weeks)
- [ ] Build `/rewards` page
- [ ] Show current period stats
- [ ] Display snapshot history
- [ ] Claim portal (connect wallet → claim ADA)
- [ ] APR calculator (estimate based on holdings)

### Phase 3: Indexer & Automation (1-2 weeks)
- [ ] Deploy off-chain indexer (query blockchain)
- [ ] Automate monthly snapshots (cron job)
- [ ] Generate snapshot data → IPFS
- [ ] Submit hash to blockchain (on-chain record)
- [ ] Monitor for errors

### Phase 4: Launch (1 week)
- [ ] Deploy to mainnet
- [ ] First snapshot (Feb 28, 2026?)
- [ ] Distribute first rewards
- [ ] Marketing campaign
- [ ] Monitor performance

**Total Timeline:** ~7-10 weeks from start to mainnet

---

## Smart Contract Pseudo-Code

```aiken
// PSY Rewards Distributor

type Snapshot {
  block_height: Int,
  timestamp: Int,
  merkle_root: ByteArray,  // Root of holder balances
  total_supply: Int,
  reward_pool: Int  // ADA available for this period
}

validator rewards_distributor {
  // Admin submits snapshot (off-chain calculated, on-chain verified)
  submit_snapshot(
    block_height: Int,
    merkle_root: ByteArray,
    total_supply: Int
  ) {
    // Verify admin signature
    verify_admin(tx.signer)
    
    // Store snapshot
    let snapshot = Snapshot {
      block_height: block_height,
      timestamp: current_time(),
      merkle_root: merkle_root,
      total_supply: total_supply,
      reward_pool: calculate_reward_pool()
    }
    
    save_snapshot(snapshot)
  }
  
  // User claims their ADA reward
  claim_reward(
    snapshot_id: Int,
    proof: MerkleProof,
    psy_balance: Int
  ) {
    let snapshot = get_snapshot(snapshot_id)
    
    // Verify user held PSY at snapshot time
    verify_merkle_proof(
      snapshot.merkle_root,
      proof,
      tx.signer,
      psy_balance
    )
    
    // Calculate reward
    let share = psy_balance / snapshot.total_supply
    let reward = snapshot.reward_pool * share
    
    // Check not already claimed
    assert(!has_claimed(tx.signer, snapshot_id))
    
    // Send ADA
    send_ada(tx.signer, reward)
    
    // Mark as claimed
    mark_claimed(tx.signer, snapshot_id)
  }
}
```

---

## Off-Chain Indexer (Ogmios + Kupo)

```typescript
import { createChainSyncClient } from '@cardano-ogmios/client';

const PSY_POLICY_ID = "your_psy_token_policy_id";
const PSY_ASSET_NAME = "PSY";

async function snapshotPsyHolders(blockHeight: number) {
  // Connect to local Ogmios + Kupo
  const ogmios = await createChainSyncClient({
    host: 'localhost',
    port: 1337
  });
  
  // Query all UTxOs containing PSY token at specific block
  const psyUtxos = await queryPsyUtxos(ogmios, blockHeight);
  
  // Aggregate by address
  const holders = new Map<string, number>();
  for (const utxo of psyUtxos) {
    const current = holders.get(utxo.address) || 0;
    holders.set(utxo.address, current + utxo.psyAmount);
  }
  
  const totalSupply = Array.from(holders.values())
    .reduce((sum, amt) => sum + amt, 0);
  
  // Calculate shares
  const snapshot = Array.from(holders.entries()).map(([addr, amt]) => ({
    address: addr,
    quantity: amt,
    share: amt / totalSupply,
  }));
  
  // Generate Merkle tree
  const merkleTree = buildMerkleTree(snapshot);
  
  return {
    blockHeight,
    timestamp: Date.now(),
    holders: snapshot,
    totalSupply,
    merkleRoot: merkleTree.root,
  };
}
```

---

## FAQ

### Q: Do I need to do anything to earn rewards?
**A:** No! Just hold PSY in your wallet. Rewards are automatic based on snapshots.

### Q: Can I sell my PSY before the snapshot?
**A:** Yes, PSY is fully liquid. But you'll only earn rewards if you hold PSY at snapshot time.

### Q: What if I miss claiming my reward?
**A:** Rewards don't expire. You can claim anytime after the snapshot.

### Q: How often are snapshots taken?
**A:** Every 30 days (monthly).

### Q: What if the platform generates low fees?
**A:** Rewards will be lower. APR depends on platform usage.

### Q: Can I earn compound interest?
**A:** Not automatic. But you can use ADA rewards to buy more PSY, increasing your share.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Low platform usage** | Low reward pool → low APR | Drive user growth, marketing |
| **Snapshot timing gaming** | Users buy PSY before snapshot, dump after | 30-day period randomness, or shorter/more frequent snapshots |
| **Indexer failure** | Can't generate snapshot | Multiple backup indexers (Blockfrost, Koios, custom) |
| **Smart contract bug** | Incorrect reward distribution | Audit, test thoroughly, gradual rollout |
| **Unclaimed rewards** | ADA locked in contract | Allow admin to reclaim after 1 year (send to treasury) |

---

## Next Steps

**Immediate (This Week):**
1. ✅ Finalize snapshot-based model (DONE)
2. [ ] Review with Albert/Kiki - approve design
3. [ ] Choose indexer (Blockfrost vs custom)
4. [ ] Set up preprod testnet environment

**Short-Term (Next 2 Weeks):**
1. [ ] Write rewards distributor contract (Aiken)
2. [ ] Build snapshot generation script (Blockfrost)
3. [ ] Deploy to preprod
4. [ ] Test snapshot → claim flow

**Medium-Term (Next 4-6 Weeks):**
1. [ ] Build `/rewards` frontend page
2. [ ] Integrate claim portal
3. [ ] Security review
4. [ ] Deploy to mainnet

**First Snapshot Target:** March 31, 2026 (8 weeks from now)

---

## Decisions Made ✅

1. **Revenue split:** 50% holders / 50% lottery (APPROVED)
2. **Snapshot frequency:** 30 days (APPROVED)
3. **Distribution method:** Auto-send batch tx (APPROVED)
4. **Min threshold:** 5 ADA minimum (can lower later if needed) (APPROVED)
5. **Lottery fee:** Increase from 0.01 ADA → 1 ADA (APPROVED)
6. **Indexer:** No Blockfrost - use Ogmios + Kupo or cardano-db-sync (APPROVED)

**Next Steps:**
1. Set up Ogmios + Kupo locally
2. Write snapshot generation script
3. Build rewards distributor contract (Aiken)
4. Test on preprod
5. Deploy to mainnet

**Target First Snapshot:** March 31, 2026 (~8 weeks)

---

**Recommendation:** This snapshot model is PERFECT for Cognosis:
- Simpler than traditional staking
- Better UX (no explicit staking action)
- Fully liquid PSY (use anytime)
- ADA rewards from platform fees
- Aligns incentives (hold PSY = support platform)

Let's build this! 🦞

**Created:** 2026-02-02  
**Author:** Elliot (CryptoGazer's clarification)
