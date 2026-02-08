# PlutusV3 Address Update Plan

**Date:** 2026-02-02  
**Status:** 🔨 In Progress  
**Priority:** HIGH - Required before testing

---

## Current Status

✅ **Contracts Deployed:** All PlutusV3 validators deployed to preprod  
⏳ **Frontend:** Needs address updates  
⏳ **Backend:** Needs address updates  
⏳ **Oracle:** Needs address updates

---

## 📋 Changes Required

### 1. Frontend (src/lib/cardano/)

#### File: `src/lib/cardano/rewardVault.ts`

**Line ~8:** Update PSY_POLICY_ID
```typescript
// OLD (mainnet policy)
export let PSY_POLICY_ID = "d137118335bd9618c1b5be5612691baf7a5c13c159b00d44fb69f177";

// NEW (preprod V3 policy)
export let PSY_POLICY_ID = "52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e";
```

**Note:** The addresses (REWARD_VAULT_ADDRESS, PSI_CONTRACT_ADDRESS, etc.) are initialized dynamically via:
- `initializeRewardVault(address, psyPolicyId, researchPoolAddress, script)`
- `initializeContracts(psiContractAddress, researchPoolAddress, validatorScript, researchPoolScript)`

These functions are likely called during app initialization. Need to find where and update the values passed.

---

### 2. Backend (backend/.env)

**File:** `backend/.env`

**Add these lines:**
```bash
# PlutusV3 Contract Addresses (Preprod)
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
PSY_ASSET_NAME=505359
```

---

### 3. Oracle Service

**File:** `backend/oracle/.env` (or oracle config)

**Add/Update:**
```bash
# PlutusV3 Addresses (Preprod)
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
```

---

## 🔍 Investigation Needed

### Where are contracts initialized?

Need to find where `initializeContracts()` and `initializeRewardVault()` are called:

**Likely locations:**
- `src/app/layout.tsx` (root layout)
- `src/app/providers.tsx` (context providers)
- `src/lib/init.ts` (initialization file)
- `src/services/cardanoService.ts` (service initialization)

**Search command:**
```bash
cd /home/albert/Cognosis
grep -r "initializeContracts\|initializeRewardVault" ./src --include="*.ts" --include="*.tsx"
```

---

## 🎯 Action Items

### Immediate (Today)

- [x] Document V3 addresses
- [ ] Find contract initialization code
- [ ] Update PSY_POLICY_ID in rewardVault.ts
- [ ] Update initialization calls with V3 addresses
- [ ] Add addresses to backend .env
- [ ] Test frontend builds successfully

### Testing (Tomorrow)

- [ ] Deploy updated frontend to preprod environment
- [ ] Submit test RV experiment
- [ ] Verify oracle reveals correctly
- [ ] Check PSY tokens in wallet
- [ ] Verify stats/leaderboard

### Mainnet (Future)

- [ ] Deploy V3 contracts to mainnet
- [ ] Generate mainnet addresses
- [ ] Update all configs with mainnet addresses
- [ ] Deploy production website
- [ ] Monitor first 24h

---

## 📦 Quick Reference

### PlutusV3 Preprod Addresses

```
Experiment: addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
Vault:      addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
Lottery:    addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY Policy: 52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
PSY Name:   505359
```

### Test Transaction

**Successful V3 Reveal:**
https://preprod.cardanoscan.io/transaction/28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b

---

## 🚀 Next Steps

1. Find initialization code
2. Update addresses
3. Test build
4. Deploy to preprod
5. Submit test experiment
6. Verify end-to-end

---

**Updated:** 2026-02-02 15:55 CST  
**By:** Elliot  
**Status:** Investigation phase - finding initialization code
