# Cognosis Oracle Backend - Deployment Summary

**Date:** 2026-02-02  
**Status:** 🟡 Partially Complete - Transaction builder needs finishing

---

## ✅ What's Deployed

### 1. Smart Contracts (Preprod Testnet)

**psi_experiment Validator** ✅
- **Address:** `addr_test1wp0m9gv6fzvr5gunqvzlj2g2s235vz3ecndvrg7hdtw92hsaucqr4`
- **Purpose:** Stores RV commitments, allows Oracle to reveal
- **Validator File:** `/home/albert/cardano-preprod/validators/experiment-validator-wrapped.json`
- **Test Submission:** Tx `05b91af64d8b769681be8902c3b8fef9481f4e079c2eda9b79cb2d27077139ff`
- **Datum:** User PKH, IPFS hash, timestamp, experiment type ("RV"), target description

**reward_vault_v2** ✅ (Already deployed)
- **Address:** `addr_test1wztacuc3ux3r9wnsdad0uwc0rmzt78wm9jhgk5tugp95vvge8k9ge`
- **Balance:** 5,000,000,000 PSY tokens ready
- **Reward Curve:** Base=100, Max=400, Steepness=2.5

**psy_lottery** ✅ (Already deployed)
- **Address:** `addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp`
- **Initialized:** 2 ADA locked
- **Current Balance:** Check via CardanoScan

### 2. Oracle Infrastructure

**Oracle Wallet** ✅
- **Address:** `addr_test1vzy2fzefwytvdad0h0x59svsvmey4465m60yywmvmn0ed7ssdlzqc`
- **PKH:** `88a48b297116c6f5afbbcd42c19066f24ad754de9e423b6cdcdf96fa`
- **Balance:** 100 tADA (funded via Tx `862044080efe73dc8c98045e82648d00fdb369b8b4feaab3908a04892a0b070e`)
- **Keys:** `~/cardano-preprod/oracle/payment.{skey,vkey,addr}`
- **Hardcoded in validator:** Only this Oracle can reveal experiments

### 3. Oracle Backend (TypeScript + Node.js)

**Location:** `/home/albert/Cognosis/backend/oracle/`

**Files Created:**
- `src/index.ts` - Main Oracle service (polling loop)
- `src/config.ts` - Configuration management
- `src/cardano-client.ts` - Lucid SDK integration
- `src/ai-scorer.ts` - OpenAI GPT-4 scoring
- `src/tx-builder.ts` - Transaction builder (⚠️ INCOMPLETE)
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `.env.example` - Environment template
- `README.md` - Setup guide

**What It Does:**
1. Polls experiment contract every 30 seconds for new UTxOs
2. Parses experiment datum (user, IPFS hash, target)
3. Fetches prediction from IPFS (currently dummy data)
4. Scores with OpenAI GPT-4 (semantic similarity)
5. Calculates PSY reward (exponential curve)
6. Builds reveal transaction (⚠️ NOT YET IMPLEMENTED)
7. Submits to preprod

**Status:**
- ✅ Polling works
- ✅ AI scoring works (GPT-4 + fallback)
- ✅ Reward calculation works
- ⚠️ Transaction building incomplete (Lucid reveal tx is complex)
- ⚠️ IPFS fetching not implemented (using dummy data)

### 4. Lottery Tracker (Website Component)

**Files Created:**
- `web/src/app/api/lottery/route.ts` - API endpoint (queries lottery balance)
- `web/src/components/LotteryTracker.tsx` - React component

**Features:**
- Shows current lottery pool balance (ADA)
- Displays total entries count
- Shows next drawing date (weekly, Mondays 8 PM CST)
- Links to CardanoScan for contract verification
- Auto-refreshes every 60 seconds

**Usage:**
```tsx
import LotteryTracker from '@/components/LotteryTracker';

// In your page
<LotteryTracker />
```

---

## 🚧 What's Missing

### Critical: Transaction Builder

**File:** `backend/oracle/src/tx-builder.ts`

**Problem:** Building the reveal transaction with Lucid is complex:

1. **Must spend TWO script UTxOs** (experiment + vault) in ONE transaction
2. **Each needs a redeemer** (Plutus script arguments)
3. **Must attach validators** (PlutusV2 scripts)
4. **Calculate exact PSY amounts** (reward + vault remainder)
5. **Build 3 outputs:**
   - User wallet: PSY reward
   - Lottery: 0.01 ADA
   - Vault (continuing): Remaining PSY + updated datum
6. **Oracle must sign**

**Current Status:**
- Redeemer construction: ✅ Done
- Reward calculation: ✅ Done
- Lucid transaction building: ❌ Throws error (not implemented)

**What's needed:**
```typescript
const tx = await lucid
  .newTx()
  .collectFrom([experimentUTxO], experimentRedeemer)
  .attachSpendingValidator(experimentValidator)
  .collectFrom([vaultUTxO], vaultRedeemer)
  .attachSpendingValidator(vaultValidator)
  .payToAddress(userAddress, { lovelace: minAda, [psyAsset]: rewardAmount })
  .payToAddress(lotteryAddress, { lovelace: 10000n })
  .payToContract(vaultAddress, updatedDatum, remainingAssets)
  .addSigner(oracleAddress)
  .complete();

const signed = await tx.sign().complete();
const txHash = await signed.submit();
```

**Estimated Time:** 2-3 hours (complex Plutus script spending with Lucid)

### Non-Critical

- IPFS fetching (currently using dummy data)
- Logging/monitoring
- Error recovery
- Switch from Blockfrost to Kupo+Ogmios (production)
- Lottery drawing mechanism (not urgent)

---

## 🧪 Testing

### Test RV Submission

**Script:** `/home/albert/cardano-preprod/scripts/submit-rv-test.sh`

**Usage:**
```bash
cd /home/albert/cardano-preprod
./scripts/submit-rv-test.sh [ipfs_hash] [target_description]
```

**Default Test Data:**
- IPFS: QmTest123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ
- Target: red_barn_by_lake
- Creates commitment on-chain with 2 ADA

**Confirmed Test:** Tx `05b91af64d8b769681be8902c3b8fef9481f4e079c2eda9b79cb2d27077139ff`

### Manual Reveal (When Transaction Builder Complete)

```bash
cd /home/albert/Cognosis/backend/oracle
npm install
npm run dev
```

Oracle will detect the test commitment and attempt to reveal.

---

## 📊 Reward Curve

**Formula:** Base + (Max - Base) * lookup(accuracy, steepness)

**Parameters:**
- Base: 100 PSY
- Max: 400 PSY
- Steepness: 2.5

**Examples:**
| Accuracy | PSY Reward |
|----------|------------|
| 20%      | 105 PSY    |
| 50%      | 153 PSY    |
| 75%      | 246 PSY    |
| 90%      | 331 PSY    |
| 95%      | 364 PSY    |
| 100%     | 400 PSY    |

---

## 🔑 Environment Setup

**File:** `backend/oracle/.env`

**Required:**
```env
BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXXXXX
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXX
```

**Already Configured:**
- `CARDANO_NODE_SOCKET_PATH`
- `ORACLE_SKEY_PATH`
- `ORACLE_ADDR_PATH`

---

## 📁 File Locations

**Smart Contracts:**
- `/home/albert/Cognosis/validators/validators/psi_experiment.ak` (source)
- `/home/albert/cardano-preprod/validators/experiment-validator-wrapped.json` (compiled)
- `/home/albert/cardano-preprod/validators/vault-validator-wrapped.json`
- `/home/albert/cardano-preprod/validators/lottery-validator-wrapped.json`

**Oracle Backend:**
- `/home/albert/Cognosis/backend/oracle/` (all source files)

**Scripts:**
- `/home/albert/cardano-preprod/scripts/submit-rv-test.sh` (test RV submission)
- `/home/albert/cardano-preprod/scripts/init-lottery-cli.sh` (already run)

**Website:**
- `/home/albert/Cognosis/web/src/app/api/lottery/route.ts`
- `/home/albert/Cognosis/web/src/components/LotteryTracker.tsx`

---

## 🚀 Next Steps

### Immediate (Complete Oracle)

1. **Finish Lucid transaction builder** (2-3 hours)
   - Implement multi-script spending
   - Test on preprod with real RV submission
   
2. **Add IPFS fetching** (30 min)
   - Pinata API integration
   - Decrypt user prediction

3. **Test end-to-end flow** (1 hour)
   - Submit RV → Oracle scores → PSY distributed
   - Verify on CardanoScan

### Short-term (Production Ready)

4. **Add monitoring** (1 hour)
   - Health checks
   - Alert on errors
   - Prometheus metrics

5. **Switch to Kupo+Ogmios** (2 hours)
   - Replace Blockfrost
   - Better reliability + performance

6. **Deploy to production server** (1 hour)
   - Systemd service
   - Auto-restart on crash
   - Log rotation

### Long-term (Full Platform)

7. **Frontend integration** (2-3 hours)
   - RV submission form
   - Result polling
   - Leaderboard

8. **Lottery drawings** (4-6 hours)
   - Weekly drawing mechanism
   - VRF randomness
   - Winner notification

9. **Additional experiment types** (1-2 weeks)
   - Precognition (time-delayed reveal)
   - Telepathy (multi-party)
   - etc.

---

**Total Estimate to Working RV Module:** 4-6 hours

**Status:** Smart contracts deployed, Oracle backend scaffolded, transaction builder needs completion

---

**Questions/Issues:** Reach out to Elliot 🦞
