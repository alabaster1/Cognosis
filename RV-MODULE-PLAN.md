# Cognosis Remote Viewing Module - Implementation Plan

**Status:** 2026-02-02 - Architecture defined, ready for build-out

---

## Overview

Remote Viewing module provides immediate feedback loop:
1. User submits RV attempt (describes location)
2. **Immediate reveal** - Oracle scores with AI
3. **Automatic reward distribution** - PSY tokens sent based on accuracy
4. Lottery fee collected (0.01 ADA per submission)

**No waiting period.** No separate claim transaction. Everything happens in one atomic reveal transaction.

---

## Architecture

### Flow

```
User Submission
    ↓
Store commitment on-chain (psi_experiment UTxO)
    ↓
Oracle Backend receives submission event
    ↓
AI Scoring (GPT-4 semantic similarity)
    ↓
Build Reveal Transaction:
  - Spend: psi_experiment UTxO (commitment)
  - Spend: reward_vault UTxO (withdraw PSY)
  - Output 1: PSY tokens → user wallet (calculated reward)
  - Output 2: 0.01 ADA → lottery contract
  - Output 3: Updated vault → continuing vault address
    ↓
Submit to blockchain
    ↓
User sees result + PSY balance update
```

---

## Components to Build

### 1. psi_experiment.ak Validator ✅ (Already exists? Check)

**Needed for Remote Viewing:**
- Store commitment: `{ user_pkh, ipfs_hash, timestamp, experiment_type: "RV" }`
- Allow spending (reveal) immediately after submission
- Validate redeemer contains: `{ accuracy_score, ai_model_used }`

**Redeemer:**
```aiken
pub type ExperimentRedeemer {
  Reveal { 
    accuracy_score: Int,  // 0-100
    ai_model: ByteArray,  // e.g., "gpt-4"
  }
}
```

**Validation:**
- Must be signed by Oracle (trusted scorer)
- Must spend reward_vault in same transaction
- Accuracy score must be 0-100

### 2. Oracle Backend (Node.js/TypeScript)

**Responsibilities:**
- Listen for new RV submissions (query psi_experiment UTxOs)
- Fetch user prediction from IPFS
- Score with AI (semantic similarity to target description)
- Build reveal transaction (Lucid SDK)
- Submit to preprod/mainnet

**Key Files:**
- `backend/oracle/rv-processor.ts` - Main RV processing logic
- `backend/oracle/ai-scorer.ts` - GPT-4 scoring service
- `backend/oracle/tx-builder.ts` - Lucid transaction builder
- `backend/oracle/cardano-client.ts` - Node connection

**Environment Variables:**
```env
CARDANO_NODE_SOCKET_PATH=~/cardano-preprod/socket/node.socket
ORACLE_SIGNING_KEY=~/cardano-preprod/oracle/payment.skey
OPENAI_API_KEY=sk-...
PINATA_API_KEY=...
```

### 3. Frontend Integration (web/)

**User Flow:**
- RV submission form (describe what you see)
- Encrypt + upload to IPFS
- Build commitment transaction
- Submit to chain
- **Poll for result** (watch for reveal transaction)
- Display: Accuracy score + PSY earned + Leaderboard update

**Key Files:**
- `web/src/components/experiments/RemoteViewingForm.tsx`
- `web/src/services/cardano/rv-submit.ts`
- `web/src/services/oracle/result-poller.ts`

---

## Smart Contract Status

### ✅ reward_vault_v2.ak - Complete
- Exponential reward curve implemented
- Lottery fee distribution
- Claim counter tracking
- Admin functions (TopUp, UpdateParams, WithdrawLottery)

**Deployed on Preprod:**
- Old address (has 5B PSY): `addr_test1wztacuc3ux3r9wnsdad0uwc0rmzt78wm9jhgk5tugp95vvge8k9ge`
- New address (wrapped validator): `addr_test1wr4745n7yf3n70qw5kua969l9qku0l9dkmltkchrllewhsck4gpjc`

### ✅ psy_lottery.ak - Complete
- Accumulates fees
- Weekly drawings (will implement later)
- PSY-weighted tickets

**Deployed on Preprod:**
- Old address: `addr_test1wp8kmmtlc833d4d20nc6h0uvzmgqgp89z2pxgp8k6gtwps9qu6uz2`
- New address (wrapped validator): `addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp`
- **Initialized:** 2 ADA locked, ready for fee accumulation

### ❌ psi_experiment.ak - MISSING (Must Build)

**This is the blocker.** Need to create validator that:
- Stores RV commitments
- Allows Oracle to spend (reveal) immediately
- Validates reveal redeemer

---

## Implementation Priority

### Phase 1: Smart Contract (Tonight's Nightly Build)
1. **Create `psi_experiment.ak`**
   - Datum: `{ user_pkh, ipfs_hash, timestamp, experiment_type }`
   - Redeemer: `{ Reveal { accuracy_score, ai_model } }`
   - Validation: Oracle signature required, accuracy 0-100
2. **Compile with Aiken**
   - `cd /home/albert/Cognosis/validators && aiken build`
3. **Deploy to preprod** with real Oracle wallet
   - Create oracle signing key: `~/cardano-preprod/oracle/payment.skey`
   - Fund oracle wallet with tADA
   - Test with real RV submission (not mock)

### Phase 2: Oracle Backend (Next Day)
1. **Set up Oracle service**
   - Listen for new experiment UTxOs
   - Process RV submissions
2. **AI Scoring integration**
   - GPT-4 semantic similarity
   - Accuracy → 0-100 scale
3. **Transaction builder**
   - Lucid SDK reveal transaction
   - Handle vault spending + reward distribution

### Phase 3: Frontend Integration (After Backend Works)
1. **RV submission form**
2. **Result polling**
3. **Leaderboard**

---

## Test Plan

### Real End-to-End Testing on Preprod
**No mock data - real contracts, real Oracle, real submissions.**

1. **Submit REAL RV attempt** via frontend:
   - User describes what they see
   - Frontend encrypts + uploads to IPFS
   - Frontend builds commitment transaction
   - Submit to preprod blockchain
2. **Oracle processes REAL submission:**
   - Detects new experiment UTxO on-chain
   - Fetches prediction from IPFS
   - Scores with OpenAI GPT-4 (semantic similarity)
   - Builds reveal transaction
   - Submits to preprod
3. **Verify on-chain:**
   - User receives PSY tokens (based on real AI score)
   - Lottery receives 0.01 ADA
   - Vault datum updates (claim counter +1)
4. **Repeat with different RV attempts** (test reward curve with real scoring)

### Success Criteria
- [ ] 20% accuracy → ~105 PSY received
- [ ] 50% accuracy → ~153 PSY received
- [ ] 75% accuracy → ~246 PSY received
- [ ] 90% accuracy → ~331 PSY received
- [ ] Lottery pool grows by 0.01 ADA per submission
- [ ] Vault claim counter increments

---

## Next Steps (Right Now)

**Tonight's Nightly Build (3 AM):**
1. Create `psi_experiment.ak` validator
2. Compile with Aiken
3. Deploy to preprod (initialize with test commitment)
4. Document validator address + test script

**Tomorrow Morning:**
5. Build Oracle backend (RV processor)
6. Test end-to-end flow with manual RV submission

---

**Current Blockers:** None - just need to build psi_experiment validator

**Estimated Time:**
- Validator: 1-2 hours (tonight)
- Oracle backend: 2-3 hours (tomorrow)
- Frontend integration: 1-2 hours (after backend works)

**Total: 4-7 hours to full RV module**

---

*Last Updated: 2026-02-02 09:55 CST*
*Status: Ready to build*
