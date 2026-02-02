# Website Updates Required for PlutusV3

**Status:** ⚠️ REQUIRED BEFORE MAINNET DEPLOYMENT  
**Priority:** HIGH  
**Affected:** Frontend, Backend, Oracle

---

## Quick Reference - New Addresses

### Preprod (for testing)
```
Experiment: addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
Vault:      addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
Lottery:    addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY Policy: 52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
```

### Mainnet (when deployed)
```
TBD - Will be generated during mainnet deployment
```

---

## 1. Frontend Changes

### A. Contract Address Configuration

**File:** `web/src/config/cardano.ts` (or similar)

```typescript
// OLD (PlutusV2)
export const CONTRACTS = {
  experiment: 'addr_test1w...',  // OLD ADDRESS
  vault: 'addr_test1w...',       // OLD ADDRESS
  lottery: 'addr_test1w...',     // OLD ADDRESS
}

export const PSY_TOKEN = {
  policyId: '31558d61d5a7b5208afd8ae6a5f7ca1918a07b9320a6618eefbf8e9d',  // OLD
  assetName: '505359',
}

// NEW (PlutusV3)
export const CONTRACTS = {
  experiment: 'addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7',
  vault: 'addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj',
  lottery: 'addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4',
}

export const PSY_TOKEN = {
  policyId: '52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e',  // NEW
  assetName: '505359',
}
```

### B. PSY Token Display

**Components to Update:**
- Wallet balance display (checks PSY policy)
- Reward calculator preview
- Transaction history (filters by PSY policy)
- Leaderboard/stats (queries vault address)

**Example Fix:**
```typescript
// Before
const psyBalance = wallet.assets.find(a => 
  a.unit === '31558d61d5a7b5208afd8ae6a5f7ca1918a07b9320a6618eefbf8e9d505359'
)

// After
import { PSY_TOKEN } from '@/config/cardano'
const psyBalance = wallet.assets.find(a => 
  a.unit === `${PSY_TOKEN.policyId}${PSY_TOKEN.assetName}`
)
```

### C. Transaction Building

**RV Submission Form:**
- Update `buildExperimentTx()` to use new experiment address
- Verify datum structure matches V3 spec

**Claim Rewards (if manual):**
- Update vault address reference
- Verify redeemer structure

**Example:**
```typescript
// Update tx builder
const tx = await lucid
  .newTx()
  .payToContract(
    CONTRACTS.experiment,  // NEW ADDRESS
    { inline: datum },
    { lovelace: 2000000n }
  )
  .complete()
```

### D. Explorer Links

**CardanoScan Links:**
```typescript
// Update helper function
export const getExplorerUrl = (txHash: string, type: 'tx' | 'address') => {
  const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? '' : 'preprod.'
  return `https://${network}cardanoscan.io/${type}/${txHash}`
}
```

### E. Stats/Analytics Queries

**Vault Stats:**
- Query new vault address for total claims
- Update PSY distribution tracking
- Lottery pool balance (new address)

**Example API Call:**
```typescript
// Blockfrost API
const vaultUtxos = await fetch(
  `https://cardano-preprod.blockfrost.io/api/v0/addresses/${CONTRACTS.vault}/utxos`,
  { headers: { project_id: BLOCKFROST_KEY } }
)
```

---

## 2. Backend API Changes

### A. Oracle Service

**File:** `backend/oracle/.env`

Update with V3 addresses:
```bash
# PlutusV3 Addresses (preprod)
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4

# PSY Token
PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
PSY_ASSET_NAME=505359
```

### B. Reveal Transaction Builder

**File:** `backend/oracle/src/tx-builder.ts`

Update lottery output amount:
```typescript
// OLD: 10,000 lovelace
.payToAddress(lotteryAddr, { lovelace: 10000n })

// NEW: 1,000,000 lovelace (minimum UTxO for script addresses)
.payToAddress(lotteryAddr, { lovelace: 1000000n })
```

### C. Analytics Endpoints

**Files:** `backend/api/stats/*.ts`

Update all queries that reference:
- Vault address (total PSY distributed)
- Experiment address (total submissions)
- Lottery address (pool balance)
- PSY policy ID (token holders)

---

## 3. Database/State Updates

### A. Contract Address Records

If you store contract addresses in DB:
```sql
UPDATE contract_addresses 
SET address = 'addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7'
WHERE name = 'experiment' AND network = 'preprod';

UPDATE contract_addresses 
SET address = 'addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj'
WHERE name = 'vault' AND network = 'preprod';

UPDATE contract_addresses 
SET address = 'addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4'
WHERE name = 'lottery' AND network = 'preprod';
```

### B. PSY Token Tracking

```sql
UPDATE tokens 
SET policy_id = '52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e'
WHERE symbol = 'PSY' AND network = 'preprod';
```

---

## 4. Testing Checklist (Preprod)

### Frontend Tests

- [ ] **Wallet Connection:**
  - [ ] PSY balance displays correctly
  - [ ] Wallet can see new PSY tokens

- [ ] **RV Submission:**
  - [ ] Form builds tx to correct experiment address
  - [ ] Transaction submits successfully
  - [ ] Confirmation shows correct explorer link

- [ ] **Rewards Display:**
  - [ ] Pending rewards calculated correctly
  - [ ] Claimed rewards show in history
  - [ ] PSY transfers display properly

- [ ] **Stats/Leaderboard:**
  - [ ] Total experiments count updated
  - [ ] PSY distributed total accurate
  - [ ] Lottery pool balance shown

### Backend Tests

- [ ] **Oracle Polling:**
  - [ ] Monitors correct experiment address
  - [ ] Detects new submissions

- [ ] **Reveal Transactions:**
  - [ ] Builds tx with correct vault address
  - [ ] Includes correct lottery output (1 ADA)
  - [ ] PSY rewards transfer correctly
  - [ ] Transaction submits successfully

- [ ] **API Endpoints:**
  - [ ] `/api/stats` returns correct data
  - [ ] `/api/experiments` queries new address
  - [ ] `/api/lottery` shows current pool

### Integration Tests

- [ ] **Full User Flow:**
  1. User submits RV experiment (preprod)
  2. Oracle detects and scores
  3. Reveal tx sends PSY to user
  4. User sees PSY in wallet
  5. Stats update correctly

- [ ] **Edge Cases:**
  - [ ] Multiple submissions in same block
  - [ ] Very high/low accuracy scores
  - [ ] Insufficient vault PSY (error handling)

---

## 5. Environment Variables Summary

### Development (.env.development)
```bash
NEXT_PUBLIC_NETWORK=preprod
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXX

# V3 Addresses
NEXT_PUBLIC_EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
NEXT_PUBLIC_VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
NEXT_PUBLIC_LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
NEXT_PUBLIC_PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
```

### Production (.env.production)
```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=mainnetXXXXXXXXXXXX

# V3 Addresses (mainnet - TBD)
NEXT_PUBLIC_EXPERIMENT_ADDRESS=addr1...  # DEPLOY FIRST
NEXT_PUBLIC_VAULT_ADDRESS=addr1...       # DEPLOY FIRST
NEXT_PUBLIC_LOTTERY_ADDRESS=addr1...     # DEPLOY FIRST
NEXT_PUBLIC_PSY_POLICY_ID=...            # MINT FIRST
```

---

## 6. Deployment Procedure

### Step 1: Update Preprod Website

1. **Code Changes:**
   ```bash
   cd ~/Cognosis/web
   # Update config files with V3 preprod addresses
   # Update .env.development
   npm run build
   ```

2. **Deploy to Preprod:**
   ```bash
   # Deploy to staging/preprod environment
   npm run deploy:preprod
   ```

3. **Test Full Flow:**
   - Submit RV experiment
   - Wait for oracle reveal
   - Verify PSY transfer
   - Check all UI components

### Step 2: Prepare Mainnet Contracts

1. **Deploy Contracts:**
   ```bash
   cd ~/cardano-mainnet
   # Run mainnet deployment scripts (when ready)
   bash scripts/deploy-v3-mainnet.sh
   ```

2. **Record Addresses:**
   - Save all mainnet contract addresses
   - Save PSY policy ID
   - Update `.env.production`

### Step 3: Update Production Website

1. **Code Changes:**
   ```bash
   cd ~/Cognosis/web
   # Update .env.production with mainnet addresses
   npm run build
   ```

2. **Deploy to Production:**
   ```bash
   npm run deploy:production
   ```

3. **Monitor:**
   - Watch first transactions carefully
   - Check oracle logs
   - Verify PSY transfers

---

## 7. Rollback Plan

If issues arise after deployment:

1. **Frontend Rollback:**
   ```bash
   # Revert to previous deployment
   git revert <commit-hash>
   npm run deploy:production
   ```

2. **Contract Rollback:**
   - Cannot rollback smart contracts (immutable)
   - Can pause oracle to stop processing
   - Can deploy new fixed contracts

3. **Data Migration:**
   - Old V2 transactions still valid
   - New V3 transactions separate
   - No data loss from upgrade

---

## 8. Questions to Answer

Before proceeding with website updates:

1. **Current Architecture:**
   - Where are contract addresses stored? (config file, env vars, database)
   - How does frontend query blockchain? (Blockfrost, Koios, own indexer)
   - Is there a staging/preprod website to test?

2. **Transaction Building:**
   - Does frontend build txs client-side (Lucid, Mesh)?
   - Or does backend build txs (oracle only)?
   - Are there any manual claim flows?

3. **PSY Token Usage:**
   - Do users need PSY tokens to interact?
   - Is PSY displayed in wallet UI?
   - Any PSY staking/governance features?

4. **Analytics:**
   - Real-time stats or cached?
   - Indexer tracking vault activity?
   - How are leaderboards computed?

---

## 9. Timeline Estimate

| Task | Time | Notes |
|------|------|-------|
| Update frontend config | 1-2 hours | Simple find/replace |
| Update backend APIs | 2-3 hours | Test all endpoints |
| Test on preprod | 4-6 hours | Full user flows |
| Deploy to preprod website | 1 hour | Assuming CI/CD |
| **Preprod Complete** | **~1 day** | |
| Deploy mainnet contracts | 2-3 hours | Careful execution |
| Update production config | 1 hour | |
| Deploy to production | 1 hour | |
| Monitor & verify | 2-4 hours | First 24h |
| **Mainnet Complete** | **~1 day** | |

**Total:** ~2 days from start to production

---

## 10. Support & Questions

If you need help during updates:

- **Contract addresses:** See `PLUTUSV3-DEPLOYMENT.md`
- **Datum structure:** See `validators/validators/*.ak`
- **Scripts:** `/home/albert/cardano-preprod/scripts/`
- **Elliot:** Available for debugging 🦞

---

**Next Action:** Make these updates to the website, test on preprod, then we're ready for mainnet deployment!
