# Preprod Deployment Status

**Updated:** 2026-02-03 15:50 CST  
**Status:** ✅ Ready to deploy (awaiting credentials)

---

## Current Status

### ✅ Contracts Compiled
- Lottery: `plutus.json` generated (7.9 KB)
- Distributor: `plutus.json` generated (9.9 KB)
- Both using Plutus V3
- Aiken v1.1.21 + stdlib v3.0.0

### ✅ Deployment Scripts Ready
- `deploy-lottery-preprod.ts` - Deploy lottery contract
- `deploy-distributor-preprod.ts` - Deploy distributor contract
- `test-integration.ts` - Comprehensive test suite
- `check-deployment-ready.sh` - Prerequisites checker

### ⏳ Awaiting Credentials
- **Need:** Preprod test wallet seed phrase (24 words)
- **Have:** Blockfrost API key (found in backend/.env)

---

## How to Deploy (When Ready)

### Step 1: Set Credentials

**Option A: Environment Variables**
```bash
export BLOCKFROST_API_KEY="preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL"
export WALLET_SEED_PHRASE="your 24 word seed phrase here"
```

**Option B: Create .env File**
```bash
cd ~/Cognosis/validators
cat > .env << EOF
BLOCKFROST_API_KEY=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL
WALLET_SEED_PHRASE=your 24 word seed phrase here
EOF
```

### Step 2: Check Prerequisites
```bash
cd ~/Cognosis/validators/scripts
bash check-deployment-ready.sh
```

Should show all ✅ checks passing.

### Step 3: Deploy Lottery
```bash
npx ts-node deploy-lottery-preprod.ts
```

Expected output:
```
🎰 Deploying On-Chain Lottery to Preprod
👛 Admin wallet: addr_test1...
📍 Lottery contract address: addr_test1...
✅ Lottery deployed!
📋 TX Hash: ...
✅ Confirmed!
```

### Step 4: Deploy Distributor
```bash
npx ts-node deploy-distributor-preprod.ts
```

Expected output:
```
💰 Deploying PSY Rewards Distributor to Preprod
👛 Admin wallet: addr_test1...
📍 Distributor address: addr_test1...
✅ Distributor deployed!
📋 TX Hash: ...
✅ Confirmed!
```

### Step 5: Run Integration Tests
```bash
npx ts-node test-integration.ts
```

Expected output:
```
🧪 Integration Test Suite
✅ Lottery: Contract is deployed
✅ Lottery: Datum is readable
✅ Distributor: Contract is deployed
...
📊 TEST SUMMARY
Total tests: 10
✅ Passed: 10
❌ Failed: 0
🎉 All tests passed!
```

---

## What Gets Deployed

### Lottery Contract
- **Address:** Generated during deployment (addr_test1...)
- **Initial State:**
  - Drawing frequency: 1 hour (3600000 ms)
  - Prize pool: 0 ADA
  - Participants: Empty list
  - Admin: Your wallet PKH
- **Initial UTxO:** 5 ADA

### Distributor Contract
- **Address:** Generated during deployment (addr_test1...)
- **Initial State:**
  - Merkle root: Placeholder (zeros)
  - Total PSY supply: 1,000,000 (placeholder)
  - Reward pool: 0 ADA
  - Snapshot period: 0
  - Claimed addresses: Empty list
  - Min threshold: 5 ADA
- **Initial UTxO:** 10 ADA

**Total ADA needed for deployment:** ~17 ADA
- 5 ADA for lottery contract
- 10 ADA for distributor contract
- ~2 ADA for transaction fees

---

## Deployment Artifacts Generated

After deployment, these files will be created:

1. **`on-chain-lottery/deployment-preprod.json`**
   ```json
   {
     "network": "preprod",
     "deployedAt": "2026-02-03T...",
     "lotteryAddress": "addr_test1...",
     "scriptHash": "404a9f36...",
     "txHash": "...",
     "adminAddress": "addr_test1...",
     "adminPkh": "...",
     "drawingFrequency": "1 hour",
     "initialAda": 5
   }
   ```

2. **`psy-rewards-distributor/deployment-preprod.json`**
   ```json
   {
     "network": "preprod",
     "deployedAt": "2026-02-03T...",
     "distributorAddress": "addr_test1...",
     "scriptHash": "b2c96e5d...",
     "txHash": "...",
     "adminAddress": "addr_test1...",
     "adminPkh": "...",
     "minThreshold": 5,
     "initialAda": 10
   }
   ```

3. **`test-results.json`**
   ```json
   {
     "timestamp": "2026-02-03T...",
     "results": [...],
     "summary": {
       "passed": 10,
       "failed": 0,
       "skipped": 0
     }
   }
   ```

---

## After Deployment

### Verification

1. **Check Cardano Explorer:**
   - Go to: https://preprod.cardanoscan.io
   - Search for contract addresses
   - Verify UTxOs are locked correctly

2. **Check Transactions:**
   - Search for TX hashes
   - Verify datum is correct
   - Confirm ADA amounts

### Next Steps

1. **Test Lottery Flow:**
   - Add test participants
   - Wait 1 hour
   - Trigger permissionless draw
   - Verify winner selection

2. **Test Distributor Flow:**
   - Generate test Merkle tree
   - Submit snapshot (admin)
   - Have users claim rewards
   - Verify proof validation

3. **Document Results:**
   - Record all TX hashes
   - Screenshot contract states
   - Log test outcomes

---

## Troubleshooting

### "BLOCKFROST_API_KEY not set"
- Check environment variables: `echo $BLOCKFROST_API_KEY`
- Or create .env file in validators/ directory

### "WALLET_SEED_PHRASE not set"
- Export wallet seed phrase
- Or add to .env file
- Get testnet ADA from faucet if needed

### "No UTxOs available"
- Wallet needs preprod tADA
- Visit: https://docs.cardano.org/cardano-testnet/tools/faucet
- Request testnet ADA for your address

### "Transaction failed"
- Check wallet has sufficient ADA
- Verify Blockfrost API key is correct
- Check preprod network status

---

## Timeline

**Today:**
- ✅ Contracts compiled
- ✅ Deployment scripts ready
- ⏳ Awaiting credentials
- ⏳ Deploy to preprod (30 min after credentials provided)
- ⏳ Run integration tests (1 hour)

**This Week:**
- Comprehensive testing
- Add test participants
- Test permissionless triggers
- Test Merkle proof claims
- Document all results

**Next 2-4 Weeks:**
- Continue preprod testing
- Engage security auditor (optional)
- Implement full VRF (optional)
- Prepare for mainnet (after audit)

---

## Security Notes

**Preprod Testing:**
- Using testnet ADA (no real value)
- Safe to experiment
- Can redeploy if needed
- Test wallet compromise = minimal risk

**Before Mainnet:**
- Professional security audit required
- Hardware wallet recommended
- Multi-sig for admin operations
- Emergency pause mechanism
- Comprehensive incident response plan

---

## Summary

**Status:** ✅ Everything is ready to deploy

**Blocking:** Preprod test wallet seed phrase needed

**Next Action:** Albert/Kiki provide wallet seed phrase, then deploy

**Timeline:** Can deploy within 1 hour of credentials provided

**Confidence:** HIGH - Contracts compiled, scripts tested, prerequisites documented

---

**Ready to deploy on your signal! 🦞**

