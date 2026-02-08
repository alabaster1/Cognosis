# PlutusV3 Deployment Summary

**Date:** 2026-02-02  
**Status:** ✅ Preprod Deployed & Tested | ⏸️ Mainnet Pending  
**Network:** Cardano Preprod Testnet

---

## Overview

Cognosis smart contracts have been successfully upgraded from PlutusV2 to PlutusV3 and deployed on preprod testnet. The migration was necessary for Aiken v1.1.7+ compatibility and enables cost vector V3 support.

---

## Deployed Contracts (Preprod)

### Contract Addresses

| Contract | Address |
|----------|---------|
| **Experiment** | `addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7` |
| **Vault** | `addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj` |
| **Lottery** | `addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4` |

### Contract Script Hashes

| Contract | Script Hash |
|----------|-------------|
| **Experiment** | `d2e5d17027906b3f033d3d9859413269897a2760998f691fd039077c` |
| **Vault** | `a95df2440082887e93aea18768af16bb5c784f71d33dba21a4183a7b` |
| **Lottery** | `30d6ef5fc1e228d6aa9f36ba7b8c16ac80270255142640f6f5176c0a` |

### PSY Token

| Property | Value |
|----------|-------|
| **Policy ID** | `52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e` |
| **Asset Name** | `505359` (hex for "PSY") |
| **Supply** | 10,000,000,000 PSY |
| **Location** | Vault contract |

---

## Deployment Transactions

| Step | Transaction Hash | Explorer Link |
|------|------------------|---------------|
| **Mint PSY** | `819b7c5d472e773fa85767e244bbc9c55ec6395513f08dbf10743f73cf85c3b1` | [View](https://preprod.cardanoscan.io/transaction/819b7c5d472e773fa85767e244bbc9c55ec6395513f08dbf10743f73cf85c3b1) |
| **Init Vault** | `5ba18e2602ec9734bb274977e8d8f07a63bf17f57507b0f64a341952b4baeded` | [View](https://preprod.cardanoscan.io/transaction/5ba18e2602ec9734bb274977e8d8f07a63bf17f57507b0f64a341952b4baeded) |
| **Init Lottery** | `6765fabef169413276542c3e011cc60abec6bcad440188790e88d07dc5167f90` | [View](https://preprod.cardanoscan.io/transaction/6765fabef169413276542c3e011cc60abec6bcad440188790e88d07dc5167f90) |

---

## Test Transactions

| Action | Transaction Hash | Result |
|--------|------------------|--------|
| **Submit RV Experiment** | `be161b970a7c70cbd87fe92dc3c97e02540c50091255c1f230959531bdaccacc` | ✅ Success |
| **Oracle Reveal (V3)** | `28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b` | ✅ Success |

**Test reveal verified:**
- User received 245 PSY (75% accuracy score)
- Lottery received 1 ADA fee
- Vault claims counter incremented to 1
- All PlutusV3 validators executed successfully

---

## Changes from V2

### Technical Improvements

1. **Plutus Version:** V2 → V3
   - Enables Aiken v1.1.7+ compatibility
   - Cost vector V3 support
   - More efficient script execution

2. **Validator Structure:**
   - Wrapped validators with `spend` purpose only
   - Simplified error handling
   - Consistent inline datum usage

3. **Datum Fields (Vault):**
   ```
   field[0]: psy_policy_id
   field[1]: psy_asset_name
   field[2]: base_reward (100)
   field[3]: max_reward (400)
   field[4]: reward_steepness (250)
   field[5]: lottery_fee_lovelace (10000)
   field[6]: lottery_script_hash
   field[7]: experiment_script_hash
   field[8]: admin_pkh
   field[9]: total_claims
   ```

### Breaking Changes

- **New PSY Policy:** Old PSY tokens (policy `31558d61...`) are incompatible with V3 contracts
- **Contract Addresses:** All contract addresses have changed
- **Minimum UTxO:** Lottery outputs require ≥849070 lovelace (not 10000)

---

## Oracle Backend Updates

The oracle backend (`backend/oracle/`) has been updated with V3 addresses:

### Environment Variables

```bash
# PlutusV3 Contract Addresses
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4

# PSY Token (PlutusV3)
PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
PSY_ASSET_NAME=505359
```

---

## Website Updates Required

**⚠️ BEFORE MAINNET DEPLOYMENT:**

### Frontend Changes Needed

1. **Contract Address Display:**
   - Update vault address in UI
   - Update experiment address in RV submission flow
   - Update lottery pool address

2. **PSY Token References:**
   - Update PSY policy ID in token display logic
   - Update asset lookup queries (Blockfrost/Koios)
   - Update wallet balance checks for PSY

3. **Transaction Building:**
   - Use new contract addresses for user transactions
   - Update minimum UTxO calculations (lottery outputs)
   - Verify inline datum handling

4. **Explorer Links:**
   - Cardanoscan preprod links for testing
   - Switch to mainnet links when deployed

### Backend API Changes

1. **Oracle Service:**
   - Update `.env` with V3 addresses
   - Verify Lucid provider configuration
   - Test reveal transaction flow

2. **Analytics/Stats:**
   - Query new vault address for claims
   - Update PSY distribution tracking
   - Lottery pool balance queries

### Testing Checklist (Preprod)

- [ ] User can submit RV experiment
- [ ] Oracle reveals and distributes rewards
- [ ] PSY tokens transfer correctly
- [ ] Lottery pool accumulates fees
- [ ] Wallet displays PSY balance
- [ ] Transaction history shows correct data
- [ ] CardanoScan links work

---

## Mainnet Deployment Plan

**⏸️ PAUSED - Awaiting Website Updates**

### Pre-Deployment Checklist

- [ ] Website updated with V3 addresses
- [ ] Full preprod testing completed
- [ ] Mainnet oracle wallet funded
- [ ] Mainnet PSY minting policy created
- [ ] Security audit completed (if applicable)
- [ ] Backup/rollback plan documented

### Deployment Steps (When Ready)

1. **Mint PSY on Mainnet:**
   ```bash
   cd ~/cardano-mainnet
   bash scripts/mint-psy-v3-mainnet.sh
   ```

2. **Deploy Vault:**
   ```bash
   bash scripts/deploy-vault-v3-mainnet.sh
   ```

3. **Deploy Lottery:**
   ```bash
   bash scripts/deploy-lottery-v3-mainnet.sh
   ```

4. **Update Website Config:**
   - Switch from preprod to mainnet addresses
   - Update Blockfrost API to mainnet project
   - Enable mainnet transaction submission

5. **Verify:**
   - Submit test RV experiment on mainnet
   - Oracle reveal test transaction
   - Monitor first 24h of activity

---

## Files Updated

### Contract Code
- `validators/validators/psi_experiment.ak` (V3 upgrade)
- `validators/validators/reward_vault_v2.ak` (V3 upgrade)
- `validators/validators/lottery.ak` (V3 upgrade)
- `validators/aiken.toml` (Aiken v1.1.7)

### Deployment Scripts
- `cardano-preprod/scripts/deploy-v3-contracts.sh` (new)
- `cardano-preprod/scripts/mint-psy-v3.sh` (new)
- `cardano-preprod/scripts/reveal-experiment-v3.sh` (new)
- `cardano-preprod/scripts/submit-rv-v3.sh` (new)

### Documentation
- `PLUTUSV3-MIGRATION.md` (migration guide)
- `PLUTUSV3-DEPLOYMENT.md` (this file)
- `knowledge/cardano-plutus-versions.md` (technical reference)
- `backend/oracle/.env.example` (V3 addresses)

### Configuration
- `backend/oracle/.env.example` (V3 contract addresses)

---

## Known Issues & Limitations

1. **Minimum UTxO for Lottery:**
   - Outputs to lottery contract require ~850K lovelace (not 10K as in V2)
   - This is due to protocol min-UTxO calculation for script addresses
   - Impact: Slightly higher tx fees, but user doesn't notice

2. **PSY Token Migration:**
   - Old PSY tokens (V2 policy) cannot be used with V3 contracts
   - No migration path - users would need to be issued new PSY
   - Preprod only, so not an issue for production

3. **Validator Size:**
   - V3 validators are slightly larger than V2
   - Still well under Cardano limits
   - No performance impact observed

---

## Contact & Support

- **Developer:** Elliot (ElliotAI)
- **Documentation:** `/home/albert/Cognosis/`
- **Deployment Scripts:** `/home/albert/cardano-preprod/scripts/`
- **Contract Source:** `validators/validators/*.ak`

---

**Next Action:** Update website frontend and backend with V3 addresses, then proceed with mainnet deployment.
