# Next Steps for PlutusV3 Deployment

**Date:** 2026-02-02  
**Status:** ✅ Preprod Complete | ⏸️ Paused Before Mainnet

---

## What Just Happened

PlutusV3 migration is **COMPLETE** on preprod testnet! 🎉

- ✅ All validators upgraded to PlutusV3
- ✅ Deployed on preprod testnet
- ✅ Successfully tested full reveal flow
- ✅ User received PSY tokens correctly
- ✅ Lottery pool funded
- ✅ All scripts working

**Test Transaction:** [View on CardanoScan](https://preprod.cardanoscan.io/transaction/28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b)

---

## What's Needed Before Mainnet

### 1. Website Frontend Updates

**File:** `web/src/config/cardano.ts` (or similar)

**Change:**
```typescript
// OLD addresses
export const CONTRACTS = {
  experiment: 'addr_test1w...',  // OLD
  vault: 'addr_test1w...',       // OLD
  lottery: 'addr_test1w...',     // OLD
}

export const PSY_TOKEN = {
  policyId: '31558d61d5a7b5208afd8ae6a5f7ca1918a07b9320a6618eefbf8e9d',  // OLD
  assetName: '505359',
}

// NEW addresses (preprod)
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

**Impact:**
- RV submission will use new experiment address
- Wallet will display new PSY tokens
- Stats will query new vault address

---

### 2. Backend API Updates

**File:** `backend/oracle/.env`

**Add:**
```bash
# PlutusV3 Addresses (preprod)
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
```

**Impact:**
- Oracle will monitor new experiment address
- Reveal transactions will use new vault

---

### 3. Test on Preprod Website

**Steps:**
1. Deploy frontend with V3 addresses to preprod environment
2. Submit RV experiment through website
3. Verify oracle reveals correctly
4. Check PSY tokens show in wallet
5. Confirm stats/leaderboard updates

**Expected:** Everything works just like before, but with new addresses

---

### 4. Deploy to Mainnet (When Ready)

**Timing:** After website updates and preprod testing

**Steps:**
1. Deploy contracts to mainnet (2-3 hours)
2. Update production config with mainnet addresses
3. Deploy production website
4. Monitor first 24h

**Estimated Time:** 1-2 days total

---

## Quick Reference

### Preprod V3 Addresses

```
Experiment: addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
Vault:      addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
Lottery:    addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4
PSY Policy: 52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
```

### Test Transaction

**Reveal (PlutusV3):** `28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b`

[View on CardanoScan](https://preprod.cardanoscan.io/transaction/28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b)

---

## Documentation

| Document | Purpose |
|----------|---------|
| **WEBSITE-UPDATES-FOR-V3.md** | ⭐ START HERE - Complete website update guide |
| **PLUTUSV3-DEPLOYMENT.md** | Full deployment details & addresses |
| **PLUTUSV3-MIGRATION.md** | Technical migration notes |
| **ORACLE-STATUS.md** | Current status & configuration |

---

## Questions?

- **What changed?** Smart contracts upgraded to PlutusV3, new addresses, new PSY policy
- **Do I need to update the website?** Yes, before mainnet deployment
- **Can I test now?** Yes! Website just needs new addresses for preprod
- **When mainnet?** After website is updated and tested on preprod
- **Will old PSY tokens work?** No, new policy required for V3 contracts

---

## Support

If you need help with website updates:

1. Read `WEBSITE-UPDATES-FOR-V3.md` first
2. Ask Elliot for debugging help
3. Test on preprod before production

**Status:** Ready for website updates! Once that's done, we can deploy to mainnet. 🚀
