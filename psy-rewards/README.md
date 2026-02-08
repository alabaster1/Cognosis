# PSY Snapshot Rewards Implementation

**Start Date:** 2026-02-02  
**Target Launch:** March 31, 2026 (First snapshot)  
**Status:** 🚧 In Development

---

## Project Structure

```
psy-rewards/
├── contracts/           # Plutus V3 smart contracts (Aiken)
│   ├── rewards-distributor.ak   # Main rewards contract
│   └── lib/                     # Shared utilities
├── scripts/             # Off-chain automation
│   ├── snapshot.ts              # Generate monthly snapshots
│   ├── distribute.ts            # Auto-send ADA to holders
│   └── verify.ts                # Verify snapshot integrity
├── docs/                # Documentation
│   └── SETUP.md                 # Setup instructions
└── README.md            # This file
```

---

## Implementation Phases

### Phase 1: Infrastructure Setup (Week 1-2) 🔄 IN PROGRESS
- [x] Create project structure
- [ ] Install Ogmios + Kupo locally
- [ ] Set up Aiken development environment
- [ ] Configure preprod testnet

### Phase 2: Smart Contracts (Week 3-4)
- [ ] Write rewards distributor contract (Aiken)
- [ ] Implement snapshot verification (Merkle proof)
- [ ] Add min threshold logic (5 ADA)
- [ ] Deploy to preprod

### Phase 3: Off-Chain Scripts (Week 5-6)
- [ ] Build snapshot generator (query PSY holders)
- [ ] Build distribution script (batch ADA sends)
- [ ] Build verification script (check integrity)
- [ ] Test end-to-end on preprod

### Phase 4: Launch (Week 7-8)
- [ ] Security review
- [ ] Deploy to mainnet
- [ ] First snapshot (March 31, 2026)
- [ ] Marketing campaign

---

## Quick Start

### Prerequisites
- Node.js 18+
- Aiken v1.1.7+
- Ogmios + Kupo (local Cardano indexer)
- cardano-node (preprod sync)

### Setup
```bash
cd /home/albert/Cognosis/psy-rewards

# Install dependencies
npm install

# Set up Ogmios + Kupo
# (See docs/SETUP.md)

# Build contracts
cd contracts
aiken build

# Run snapshot (test)
npm run snapshot -- --network preprod
```

---

## Tech Stack

- **Smart Contracts:** Aiken (Plutus V3)
- **Indexer:** Ogmios + Kupo (no Blockfrost)
- **Scripting:** TypeScript (Node.js)
- **Network:** Cardano Preprod → Mainnet

---

## Key Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Revenue split** | 50% holders / 50% lottery | Simple, sustainable |
| **Snapshot frequency** | 30 days | Monthly cadence |
| **Distribution** | Auto-send (batch tx) | Best UX, no user action |
| **Min threshold** | 5 ADA | Avoid dust transactions |
| **Indexer** | Ogmios + Kupo | Full control, no external API |

---

## Current Sprint (Week 1)

**Goals:**
- [x] Project setup
- [ ] Ogmios + Kupo installation
- [ ] First contract draft
- [ ] Snapshot script prototype

**Blockers:** None

**Next Sprint:** Contract development (Aiken)

---

**Last Updated:** 2026-02-02  
**Lead:** Elliot 🦞
