# Cognosis Cardano Deployment Log

## 2026-01-31 - PSY Reward System v2

### ✅ Validators Built

**Aiken build completed successfully:**
```bash
cd /home/albert/Cognosis/validators
source ~/.aiken/bin/env
aiken build
```

**Validator Hashes:**
- **Reward Vault V2:** `a95df2440082887e93aea18768af16bb5c784f71d33dba21a4183a7b`
- **PSY Lottery:** `30d6ef5fc1e228d6aa9f36ba7b8c16ac80270255142640f6f5176c0a`

### ✅ Configuration Files

- **psy-reward-config.ts** - Economics parameters, validator hashes, calculation functions
- **init-reward-vault-preprod.ts** - Vault initialization script  
- **init-lottery-preprod.ts** - Lottery pool initialization script
- **test-claim-reward-preprod.ts** - Reward claim test script

### ⏳ Pending (Waiting for Brave Wallet Setup)

1. **Generate Wallet:**
   - Set up Brave with Eternl wallet extension
   - Get 24-word seed phrase
   - Export to `WALLET_SEED_PHRASE` env variable

2. **Fund Wallet:**
   - Get test ADA from preprod faucet
   - Need ~100 tADA for deployment

3. **Mint PSY Tokens:**
   ```bash
   export BLOCKFROST_API_KEY=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL
   export WALLET_SEED_PHRASE="<24 words>"
   
   npx tsx mint-preprod-psy.ts 10000000000
   ```
   - Mints 10 billion PSY
   - Save PSY_POLICY_ID from output

4. **Initialize Reward Vault:**
   ```bash
   export PSY_POLICY_ID="<from minting>"
   
   npx tsx init-reward-vault-preprod.ts
   ```
   - Locks 5B PSY in vault
   - Sets reward parameters (100-400 PSY, steepness 2.5)

5. **Initialize Lottery Pool:**
   ```bash
   npx tsx init-lottery-preprod.ts
   ```
   - Creates lottery contract with 0.01 ADA fee
   - Sets weekly drawing frequency

6. **Test Reward Claim:**
   ```bash
   npx tsx test-claim-reward-preprod.ts 75
   ```
   - Tests 75% accuracy claim (should get ~246 PSY)
   - Verifies lottery fee payment

---

## Economics Summary

**Reward Parameters:**
- Base: 100 PSY (participation)
- Max: 400 PSY (perfect accuracy)
- Curve: Exponential (steepness 2.5)

**Reward Examples:**
- 20% → 105 PSY
- 50% → 153 PSY
- 75% → 246 PSY
- 90% → 331 PSY
- 95% → 364 PSY

**Lottery:**
- Fee: 0.01 ADA per submission
- Frequency: Weekly drawings
- Weighting: Hybrid α=0.5 (sqrt/log blend)

**Sustainability:**
- 500 submissions/week: 937 years
- 5,000 submissions/week: 94 years

---

## Next Steps (Tonight)

1. ✅ Build validators (`aiken build`) - DONE
2. ⏳ Set up Brave with Eternl wallet
3. ⏳ Fund preprod wallet
4. ⏳ Mint PSY tokens
5. ⏳ Initialize vault
6. ⏳ Initialize lottery
7. ⏳ Test claim
8. ⏳ Deploy to mainnet (after testing)

---

## Security Notes

- **Admin key:** Controls parameter updates and lottery drawings
- **Multi-sig recommended:** For mainnet deployment
- **Time locks:** Lottery has weekly frequency constraint
- **Audit:** Get validators audited before mainnet

---

**Status:** Ready for deployment as soon as wallet is set up! 🚀
