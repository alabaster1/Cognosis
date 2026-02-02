# PSY Rewards Implementation Progress

**Started:** 2026-02-02 14:52 CST  
**Target Launch:** March 31, 2026 (8 weeks)  
**Status:** 🚧 Phase 1 - Infrastructure Setup

---

## Week 1: Infrastructure Setup (Feb 2-9)

### Day 1 (2026-02-02) ✅ COMPLETED
- [x] Create project structure
- [x] Write initial smart contract (Aiken outline)
- [x] Write snapshot script prototype (TypeScript)
- [x] Document setup process (Ogmios + Kupo)
- [x] Create package.json + dependencies
- [x] Commit to git

### Remaining This Week
- [ ] Install Ogmios + Kupo locally (requires system setup)
- [ ] Sync cardano-node to preprod
- [ ] Test Ogmios/Kupo connectivity
- [ ] Install Aiken compiler
- [ ] Run first test snapshot (mock data)

---

## Week 2: Contract Development (Feb 10-16)

- [ ] Implement Merkle proof verification
- [ ] Add min threshold logic (5 ADA)
- [ ] Implement datum update mechanism
- [ ] Write tests for contract logic
- [ ] Deploy to preprod testnet

---

## Week 3-4: Off-Chain Scripts (Feb 17 - Mar 2)

- [ ] Integrate real Ogmios/Kupo queries
- [ ] Build distribution script (auto-send ADA)
- [ ] Build verification script
- [ ] Test end-to-end on preprod
- [ ] Handle edge cases (dust, batch limits, etc.)

---

## Week 5-6: Testing & Polish (Mar 3-16)

- [ ] Security review
- [ ] Load testing (what if 10,000 holders?)
- [ ] Documentation updates
- [ ] Frontend integration (`/rewards` page)
- [ ] Dry-run full distribution

---

## Week 7-8: Launch Prep (Mar 17-31)

- [ ] Deploy contracts to mainnet
- [ ] Final security audit (if budget)
- [ ] Marketing materials
- [ ] Announce first snapshot date
- [ ] **First Snapshot: March 28, 2026** 🚀
- [ ] First distribution: March 31, 2026

---

## Blockers

| Blocker | Status | Action |
|---------|--------|--------|
| Need Ogmios + Kupo installed | ⏳ Pending | Requires system setup (Docker or native) |
| Need cardano-node synced | ⏳ Pending | Can reuse existing node from Aurumelius? |
| Need PSY token policy ID | ⏳ Pending | Get from mainnet deployment |
| Need admin wallet for snapshots | ⏳ Pending | Create dedicated wallet |

---

## Daily Log

### 2026-02-02
- ✅ Project kickoff
- ✅ Created project structure (`/psy-rewards`)
- ✅ Wrote initial Aiken contract (`rewards-distributor.ak`)
  - Snapshot submission logic
  - Merkle proof verification (outline)
  - Distribution validation
- ✅ Wrote snapshot script (`snapshot.ts`)
  - Mock data queries
  - Merkle tree generation
  - Share calculation
  - Min threshold filtering (5 ADA)
- ✅ Documented setup process (`docs/SETUP.md`)
  - Ogmios + Kupo installation
  - Aiken setup
  - Network configuration
- ✅ Created tracking docs (README, PROGRESS)
- ✅ Committed to git

**Next:** Install Ogmios + Kupo, test connectivity

---

## Notes

- **Architecture decision:** Using Ogmios + Kupo instead of Blockfrost (per Albert's preference)
- **Min threshold:** 5 ADA to avoid dust transactions (can be lowered later)
- **Revenue split:** 50% holders / 50% lottery (no treasury split)
- **Distribution:** Auto-send (batch transactions), no claim portal
- **Lottery fee:** Increased to 1 ADA from 0.01 ADA (100x increase for sustainability)

---

**Last Updated:** 2026-02-02 15:00 CST  
**Next Update:** After Ogmios + Kupo setup complete
