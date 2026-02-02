# Oracle Service Status

**Last Updated:** 2026-02-02  
**Status:** ✅ PlutusV3 Deployed on Preprod | ⏸️ Awaiting Website Updates

---

## Current State

### PlutusV3 Migration - COMPLETE ✅

The Cognosis smart contracts have been successfully upgraded to PlutusV3 and deployed on preprod testnet. All contracts are operational and tested.

**Key Achievement:** Successfully revealed RV experiment using PlutusV3 validators!

**Test Transaction:** [28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b](https://preprod.cardanoscan.io/transaction/28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b)

---

## Preprod Deployment (PlutusV3)

### Contract Addresses

| Contract | Address |
|----------|---------|
| **Experiment** | `addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7` |
| **Vault** | `addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj` |
| **Lottery** | `addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4` |

### PSY Token

- **Policy ID:** `52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e`
- **Asset Name:** `505359` (hex for "PSY")
- **Supply:** 10,000,000,000 PSY
- **Location:** Vault contract

### Deployment Transactions

| Step | Tx Hash | Status |
|------|---------|--------|
| Mint PSY | `819b7c5d472e773fa85767e244bbc9c55ec6395513f08dbf10743f73cf85c3b1` | ✅ |
| Init Vault | `5ba18e2602ec9734bb274977e8d8f07a63bf17f57507b0f64a341952b4baeded` | ✅ |
| Init Lottery | `6765fabef169413276542c3e011cc60abec6bcad440188790e88d07dc5167f90` | ✅ |
| Test Submit RV | `be161b970a7c70cbd87fe92dc3c97e02540c50091255c1f230959531bdaccacc` | ✅ |
| Test Reveal V3 | `28641cf97adde39ae863da6139250621e09e496ba64003cd984254e41fa8055b` | ✅ |

---

## What's Next

### Before Mainnet Deployment

1. **Website Updates (REQUIRED):**
   - Update frontend with V3 contract addresses
   - Update PSY token policy ID in UI
   - Update oracle backend `.env` with V3 addresses
   - Test full user flow on preprod
   - **See:** `WEBSITE-UPDATES-FOR-V3.md` for details

2. **Testing:**
   - Submit RV experiments on preprod
   - Verify oracle reveals work end-to-end
   - Check PSY token display in wallets
   - Confirm stats/leaderboard updates

3. **Mainnet Preparation:**
   - Fund mainnet oracle wallet
   - Create mainnet PSY minting policy
   - Review security checklist
   - Plan deployment window

### Mainnet Deployment (When Ready)

**Status:** ⏸️ PAUSED - Awaiting website updates

**Steps:**
1. Deploy mainnet contracts (experiment, vault, lottery)
2. Mint PSY tokens on mainnet
3. Update production website config
4. Start oracle service on mainnet
5. Monitor first 24h carefully

---

## Documentation

- **Migration Guide:** `PLUTUSV3-MIGRATION.md`
- **Deployment Summary:** `PLUTUSV3-DEPLOYMENT.md`
- **Website Updates:** `WEBSITE-UPDATES-FOR-V3.md` ⭐ START HERE
- **Technical Reference:** `knowledge/cardano-plutus-versions.md`

---

## Oracle Configuration

### Preprod Oracle

**Status:** ✅ Ready (manual operation)

**Wallet:**
- Address: `addr_test1qzz2fr4j7ytrdh9tdkakq5epvle8x62ewu0ujxymd8wvkl3vlw0vkdvmyx3hkgs28gya30pyqnthq74gwhycazek24qsqcaef2`
- Balance: ~49.5 ADA
- Collateral: Set

**Environment:**
```bash
CARDANO_NETWORK=Preprod
CARDANO_NODE_SOCKET_PATH=/home/albert/cardano-preprod/socket/node.socket
ORACLE_SKEY_PATH=/home/albert/cardano-preprod/oracle/payment.skey

# V3 Addresses
EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4

PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
PSY_ASSET_NAME=505359
```

### Mainnet Oracle

**Status:** ⏸️ Not yet configured

**TODO:**
- Create mainnet oracle wallet
- Fund with 100+ ADA
- Set up collateral
- Configure `.env` for mainnet

---

## Manual Operations (Current)

Oracle is currently operated manually via scripts:

### Submit RV Experiment
```bash
cd ~/cardano-preprod
bash scripts/submit-rv-v3.sh
```

### Reveal Experiment (Oracle)
```bash
cd ~/cardano-preprod
bash scripts/reveal-experiment-v3.sh <experiment_utxo> <accuracy_score>
```

### Check Status
```bash
# Experiment address
cardano-cli conway query utxo --address addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7 --testnet-magic 1

# Vault
cardano-cli conway query utxo --address addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj --testnet-magic 1

# Lottery
cardano-cli conway query utxo --address addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4 --testnet-magic 1
```

---

## Automated Service (Future)

The Node.js oracle service (`backend/oracle/`) will automate:

1. **Polling:** Monitor experiment address for new submissions
2. **AI Scoring:** Score RV accuracy using GPT-4
3. **Reveal:** Build and submit reveal transactions
4. **Logging:** Track all operations for debugging

**To Run:**
```bash
cd ~/Cognosis/backend/oracle
npm install
npm run build
npm start
```

**Status:** Ready to run once website is updated

---

## Known Issues

### Resolved ✅

- ~~Aiken v1.1.6 cost vector incompatibility~~ → Upgraded to v1.1.7
- ~~PlutusV2 validators outdated~~ → Migrated to PlutusV3
- ~~Datum field ordering bug~~ → Fixed (lottery vs experiment hash)
- ~~Minimum UTxO for lottery outputs~~ → Updated to 1 ADA

### Outstanding

- None currently! All systems operational on preprod.

---

## Testing Results

### PlutusV3 Reveal Test (2026-02-02)

**Scenario:** User submitted RV experiment, oracle revealed with 75% accuracy

**Results:**
- ✅ Experiment input consumed correctly
- ✅ Vault input/output validated
- ✅ User received 245 PSY (correct amount for 75%)
- ✅ Lottery received 1 ADA fee
- ✅ Vault claims counter incremented
- ✅ All PlutusV3 validators executed successfully
- ✅ Transaction confirmed in ~20 seconds

**Performance:**
- **Tx Size:** 1.8 KB
- **Tx Fee:** 0.367199 ADA
- **Script Execution:** PlutusV3 (efficient)
- **Ex Units:** Within limits

---

## Contact

- **Developer:** Elliot (ElliotAI) 🦞
- **Location:** `/home/albert/Cognosis/`
- **Scripts:** `/home/albert/cardano-preprod/scripts/`
- **Validators:** `validators/validators/*.ak`

---

**Current Priority:** Update website with V3 addresses, test on preprod, then proceed to mainnet deployment.

**Status:** ✅ Smart contracts ready | ⏸️ Waiting on website updates | 🚀 Ready for mainnet when approved
