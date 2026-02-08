# PlutusV3 Address Update - COMPLETE ✅

**Date:** 2026-02-02 15:58 CST  
**Status:** ✅ Updates Applied  
**Commit:** 830e5be

---

## What Was Done

### 1. Oracle Backend ✅
**File:** `backend/oracle/src/config.ts`

Updated all three contract addresses:
```typescript
// OLD (PlutusV2)
experimentAddress: 'addr_test1wp0m9gv6fzvr5gunqvzlj2g2s235vz3ecndvrg7hdtw92hsaucqr4'
vaultAddress: 'addr_test1wztacuc3ux3r9wnsdad0uwc0rmzt78wm9jhgk5tugp95vvge8k9ge'
lotteryAddress: 'addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp'

// NEW (PlutusV3)
experimentAddress: 'addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7'
vaultAddress: 'addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj'
lotteryAddress: 'addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4'
```

### 2. Frontend PSY Token ✅
**File:** `src/lib/cardano/rewardVault.ts`

Updated PSY policy ID:
```typescript
// OLD (mainnet policy)
PSY_POLICY_ID = "d137118335bd9618c1b5be5612691baf7a5c13c159b00d44fb69f177"

// NEW (preprod PlutusV3 policy)
PSY_POLICY_ID = "52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e"
```

### 3. Backend Environment ✅
**File:** `backend/.env`

Added PlutusV3 addresses:
```bash
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
PSY_ASSET_NAME=505359
```

---

## Next Steps

### 1. Restart Oracle Service ⏳

The oracle needs to be restarted to pick up the new addresses:

```bash
# If running via systemd
sudo systemctl restart cognosis-oracle

# Or if running manually
cd /home/albert/Cognosis/backend/oracle
npm run build
npm start
```

### 2. Test RV Submission 🧪

**Test flow:**
1. Go to Cognosis website (preprod)
2. Connect wallet
3. Submit Remote Viewing experiment
4. Wait for oracle reveal (~30 sec)
5. Verify:
   - Experiment appears at new experiment address
   - Oracle reveals correctly
   - PSY tokens sent to vault
   - Tokens show in wallet with new policy ID

**Expected Result:**
- Tx confirms successfully
- PSY balance updates in wallet
- Stats/leaderboard reflect new data

### 3. Frontend Deployment 🚀

**If using Vercel:**
```bash
cd /home/albert/Cognosis
vercel deploy --prod
```

**If self-hosted:**
```bash
npm run build
# Deploy dist/ to web server
```

### 4. Monitor First Transactions 👀

Watch the first few RV submissions closely:
- Check CardanoScan for tx details
- Verify oracle is monitoring new experiment address
- Confirm PSY tokens are being distributed
- Check for any errors in oracle logs

---

## Rollback Plan (If Needed)

If issues arise, revert to PlutusV2 addresses:

```bash
cd /home/albert/Cognosis
git revert 830e5be
git push origin main
# Redeploy oracle + frontend
```

---

## Quick Reference

### PlutusV3 Preprod Addresses

```
Experiment: addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
Vault:      addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
Lottery:    addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY Policy: 52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
```

### Test Transaction (Verified Working)

https://preprod.cardanoscan.io/transaction/28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b

---

## Documentation

- **PLUTUSV3-DEPLOYMENT.md** - Full deployment details
- **NEXT-STEPS.md** - Mainnet deployment plan
- **WEBSITE-UPDATES-FOR-V3.md** - Complete update guide
- **UPDATE-V3-ADDRESSES.md** - Investigation notes

---

## Status

✅ Code Updated  
✅ Committed & Pushed  
⏳ Oracle Restart Needed  
⏳ Frontend Deployment Pending  
⏳ End-to-End Testing Pending

---

**Next Action:** Restart oracle service, then test RV submission flow.

**Contact:** Elliot (Discord) for questions or debugging assistance.

---

**Last Updated:** 2026-02-02 15:58 CST  
**By:** Elliot 🦞
