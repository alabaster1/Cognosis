# On-Chain Automation Analysis - Moving to Trustless Smart Contracts

**Question:** Can lottery drawing and PSY rewards be made more secure/trustless via smart contracts?

**Answer:** YES - significant improvements possible! 🎯

---

## Current Architecture (Centralized/Off-Chain)

### Lottery Drawing (Current)
❌ **Off-chain admin script** triggers drawing  
❌ **Off-chain randomness** (crypto.randomBytes)  
❌ **Trust required:** Admin must run script honestly  
❌ **Manual execution:** Relies on cron/human  

**Security issues:**
- Admin could manipulate timing
- Admin could manipulate winner selection
- Single point of failure (admin wallet)
- Not provably fair

### PSY Snapshot Rewards (Current)
❌ **Off-chain snapshot** (queries all holders)  
❌ **Off-chain distribution** (admin sends ADA)  
❌ **Trust required:** Admin calculates shares correctly  
❌ **Gas costs:** Admin pays for all distributions  

**Security issues:**
- Admin could miscalculate shares
- Admin could skip/delay distributions
- No on-chain verification of snapshot accuracy
- Holders can't verify they got correct amount

---

## Improved Architecture (On-Chain/Trustless)

### 1. Lottery Drawing → Fully On-Chain ✅

**How it works:**
1. Contract stores: `last_drawing_time`, `frequency_ms`, `accumulated_ada`, `participants`
2. **Anyone** can call `Draw` redeemer if `current_time >= last_drawing_time + frequency_ms`
3. Contract uses **Cardano VRF** or **on-chain randomness** to select winner
4. Contract **automatically** sends prize to winner
5. Contract resets for next cycle

**Aiken pseudocode:**
```aiken
validator lottery {
  // Redeemer: anyone can trigger if conditions met
  fn draw(datum: LotteryDatum, redeemer: Draw, ctx: ScriptContext) -> Bool {
    // Verify time elapsed
    let current_time = ctx.tx.valid_range.lower_bound
    let can_draw = current_time >= datum.last_drawing_time + datum.frequency_ms
    
    // Verify VRF randomness included in TX
    let random_value = extract_vrf_from_tx(ctx.tx)
    
    // Select winner based on weighted tickets
    let winner = select_winner_weighted(datum.participants, random_value)
    
    // Verify prize sent to winner
    let prize_output = find_output_to(ctx.tx.outputs, winner.address)
    prize_output.value == datum.accumulated_ada
    
    // Verify new datum resets pool
    let new_datum = get_continuing_datum(ctx)
    new_datum.last_drawing_time == current_time &&
    new_datum.accumulated_ada == 0 &&
    new_datum.participants == []
    
    can_draw
  }
}
```

**Benefits:**
✅ **Permissionless:** Anyone can trigger (not just admin)  
✅ **Provably fair:** VRF is cryptographically verifiable  
✅ **Automatic:** No cron jobs, no manual execution  
✅ **Trustless:** Smart contract enforces all rules  
✅ **Transparent:** All logic visible on-chain  

**Trade-offs:**
⚠️ Someone must pay TX fee to trigger (but winner could refund)  
⚠️ VRF setup requires validator key registration  

---

### 2. PSY Snapshot Rewards → Hybrid (Off-Chain Snapshot + On-Chain Verification) ✅

**How it works:**
1. **Off-chain:** Admin takes snapshot of all PSY holders → generates Merkle tree
2. **On-chain:** Admin submits Merkle root to contract
3. **Claim-based:** Each holder claims their share by providing Merkle proof
4. Contract verifies proof before releasing ADA

**Aiken pseudocode:**
```aiken
validator rewards_distributor {
  // Admin submits snapshot (once per month)
  fn submit_snapshot(datum: DistributorDatum, snapshot_root: ByteArray) -> Bool {
    // Verify admin signature
    // Update datum with new merkle_root
    // Lock total reward pool in contract
  }
  
  // Users claim their share (permissionless)
  fn claim(datum: DistributorDatum, redeemer: Claim, ctx: ScriptContext) -> Bool {
    let claimer = redeemer.address
    let psy_balance = redeemer.psy_balance
    let merkle_proof = redeemer.merkle_proof
    
    // Verify Merkle proof
    let leaf = hash(claimer ++ psy_balance)
    let is_valid = verify_merkle_proof(leaf, merkle_proof, datum.merkle_root)
    
    // Calculate reward share
    let total_supply = datum.total_psy_supply
    let reward_pool = datum.accumulated_ada
    let user_share = (psy_balance * reward_pool) / total_supply
    
    // Verify payout
    let payout = find_output_to(ctx.tx.outputs, claimer)
    payout.value >= user_share
    
    // Mark as claimed (prevent double-claim)
    let new_datum = datum
    new_datum.claimed_addresses = datum.claimed_addresses ++ [claimer]
    
    is_valid && !already_claimed(claimer, datum)
  }
}
```

**Benefits:**
✅ **Trustless verification:** Merkle proofs are cryptographically secure  
✅ **Gas efficient:** Users pay to claim (not admin pays for all)  
✅ **Transparent:** Anyone can verify snapshot accuracy  
✅ **Scalable:** Works with 10,000+ holders  
✅ **No admin trust:** Contract enforces correct payouts  

**Trade-offs:**
⚠️ Users must claim (not auto-sent)  
⚠️ Off-chain snapshot still requires trusted indexer  
⚠️ Small UX friction (claim button vs. auto-receive)  

---

### 3. Cardano VRF (Verifiable Random Function) for Lottery

**What is VRF?**
Cryptographically secure randomness that's **provably fair** and **verifiable** by anyone.

**How it works:**
1. Validator registers VRF key on-chain
2. When drawing lottery, validator produces VRF proof
3. Contract verifies VRF proof is valid
4. VRF output used as random seed for winner selection

**Why it's better than crypto.randomBytes:**
- ✅ Provable: Anyone can verify randomness wasn't manipulated
- ✅ On-chain: Verified by smart contract, not off-chain script
- ✅ Deterministic: Given same inputs, produces same output (auditable)
- ✅ Unpredictable: Cannot be predicted before reveal

**Cardano VRF resources:**
- Uses same VRF as block production (stake pool VRF)
- Can reuse validator VRF keys
- Reference: Hydra protocol uses similar VRF approach

---

## Comparison: Current vs. On-Chain

| Feature | Current (Off-Chain) | On-Chain (Trustless) |
|---------|---------------------|----------------------|
| **Lottery Trigger** | Admin cron job | Anyone can trigger |
| **Winner Selection** | Off-chain random | On-chain VRF |
| **Prize Distribution** | Admin TX | Smart contract |
| **Trust Required** | HIGH (admin honesty) | NONE (code is law) |
| **Transparency** | Logs only | Full on-chain audit |
| **Automation** | Cron (can fail) | Permissionless (always works) |
| **Gas Costs** | Admin pays | Caller pays (refundable) |
| **PSY Snapshot** | Off-chain query | Off-chain + Merkle |
| **PSY Distribution** | Admin batch TX | Users claim |
| **Verification** | Trust admin | Merkle proofs |

**Winner:** On-chain is objectively more secure and trustless.

---

## Implementation Plan

### Phase 1: On-Chain Lottery (2-3 weeks)

**Week 1:**
- [ ] Design lottery contract with VRF support
- [ ] Implement permissionless `Draw` redeemer
- [ ] Add weighted ticket calculation (on-chain)
- [ ] Write tests (Aiken check)

**Week 2:**
- [ ] Set up VRF keys for validator
- [ ] Deploy to preprod testnet
- [ ] Test permissionless drawing (non-admin triggers)
- [ ] Verify VRF randomness

**Week 3:**
- [ ] Security audit (contract logic)
- [ ] Load testing (100+ participants)
- [ ] Deploy to mainnet
- [ ] Monitor first 5 drawings

**Expected outcome:** Anyone can trigger lottery when time elapsed. Provably fair.

---

### Phase 2: Merkle-Based PSY Rewards (3-4 weeks)

**Week 1:**
- [ ] Implement Merkle tree generation (off-chain)
- [ ] Build snapshot → Merkle root script
- [ ] Design rewards distributor contract (claim-based)

**Week 2:**
- [ ] Implement Merkle proof verification (on-chain)
- [ ] Add claim redeemer
- [ ] Prevent double-claims (datum tracking)
- [ ] Write tests

**Week 3:**
- [ ] Frontend integration (claim button)
- [ ] User UX: "You have X ADA to claim"
- [ ] Deploy to preprod
- [ ] Test claim flow

**Week 4:**
- [ ] Security audit
- [ ] Gas optimization
- [ ] Deploy to mainnet
- [ ] Monitor first distribution cycle

**Expected outcome:** Users claim rewards via Merkle proof. Fully verifiable.

---

## Security Improvements Summary

### Lottery (On-Chain)
✅ **No admin trust required**  
✅ **Provably fair randomness (VRF)**  
✅ **Permissionless execution**  
✅ **Full transparency**  
✅ **Cannot be manipulated**  

### PSY Rewards (Hybrid)
✅ **Merkle proofs are cryptographically secure**  
✅ **Users verify their own payouts**  
✅ **No admin can steal/skip rewards**  
✅ **Scalable to thousands of holders**  
⚠️ Still requires trusted snapshot indexer (Ogmios/Blockfrost)

---

## Advanced: Fully Decentralized Snapshot (Future)

**Problem:** Off-chain snapshot still requires trust in indexer.

**Solution:** Use on-chain oracle or decentralized indexer:

### Option 1: Cardano Oracle (e.g., Charli3)
- Oracle queries PSY holders on-chain
- Submits Merkle root to contract
- Multiple oracle nodes = decentralized trust

### Option 2: Light Client Verification
- Contract accepts SPO-signed state proofs
- Users prove their PSY balance via state proof
- No central indexer needed

### Option 3: Recursive SNARKs (Advanced)
- Zero-knowledge proof of entire PSY holder set
- Contract verifies SNARK proof
- Fully trustless, but complex

**Reality check:** These are complex and may be overkill for now. Merkle + trusted indexer is good enough for v1.

---

## Recommended Approach

### Short Term (Next 1-2 Months)
1. ✅ **Move lottery to on-chain** (VRF + permissionless)
2. ✅ **Keep PSY snapshot off-chain** (Merkle proofs for verification)
3. ✅ **Claim-based distribution** (users claim vs. auto-send)

**Why:** Best balance of security, UX, and development time.

### Long Term (6-12 Months)
1. Explore decentralized snapshot oracles
2. Add recursive verification for full trustlessness
3. Optimize gas costs with batching/ZK proofs

---

## Cost Analysis

### Current (Off-Chain)
- **Lottery drawing:** ~0.5 ADA/draw (admin pays)
- **PSY distribution (100 holders):** ~5 ADA (admin pays batch TX)
- **Total monthly cost:** ~20 ADA (4 lottery + 1 PSY)

### On-Chain (Trustless)
- **Lottery drawing:** ~0.5 ADA/draw (anyone pays, refundable from pool)
- **PSY claims (100 holders):** ~0.3 ADA each (users pay individually)
- **Total monthly cost:** ~32 ADA (4 lottery + 100 * 0.3 claims)

**Trade-off:** Higher total gas, but distributed among users (fairer).

---

## Action Items

**For Albert to decide:**

1. **Priority:** Move lottery on-chain first? Or PSY rewards?
   - Lottery is simpler (1 winner vs. N holders)
   - PSY rewards impact more users

2. **UX trade-off:** Auto-send (current) vs. Claim-based (trustless)?
   - Auto-send = better UX, requires admin trust
   - Claim-based = worse UX, fully trustless

3. **Timeline:** Rush on-chain lottery (2-3 weeks) or plan for mainnet?
   - Could do preprod on-chain lottery NOW
   - Polish for mainnet launch

4. **VRF setup:** Do we have validator VRF keys?
   - Need to register VRF key on-chain
   - Can coordinate with Aurumelius validator setup?

---

## Next Steps

**If we proceed with on-chain automation:**

1. **This week:**
   - [ ] Design lottery contract with permissionless Draw
   - [ ] Research Cardano VRF integration
   - [ ] Draft Aiken contract structure

2. **Next week:**
   - [ ] Implement and test on preprod
   - [ ] Build permissionless trigger script (anyone can call)
   - [ ] Verify VRF randomness works

3. **Week 3:**
   - [ ] Security review
   - [ ] Deploy to mainnet
   - [ ] Deprecate off-chain automation

**Timeline:** 3 weeks to fully on-chain lottery.

---

## Conclusion

**Can it be more secure/trustless via smart contracts?**

✅ **YES - significantly!**

**Key improvements:**
1. Lottery → Fully on-chain (permissionless, VRF)
2. PSY rewards → Hybrid (Merkle proofs, claim-based)
3. No admin trust required
4. Provably fair and transparent

**Recommended:** Start with on-chain lottery (simpler, high impact). Then add Merkle-based PSY rewards.

**Timeline:** 3-4 weeks for on-chain lottery, 6-8 weeks for full trustless system.

---

**Created:** 2026-02-03  
**By:** Elliot (Agent)  
**Status:** Analysis complete, awaiting decision on implementation
