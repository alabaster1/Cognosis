# Cognosis PSY Reward Vault - Setup Guide

This guide walks through deploying the reward vault on both Cardano preprod (testing) and mainnet (production).

## Prerequisites

- Node.js 18+ and npm
- Cardano wallet with funds
- Blockfrost API key
- Aiken CLI installed (for compiling validators)

## PSY Token Details

### Mainnet (Production)
- **Policy ID:** `d137118335bd9618c1b5be5612691baf7a5c13c159b00d44fb69f177`
- **Asset Name:** `507379` (hex for "Psy")
- **Fingerprint:** `asset14hzv9w4pqfwxhmcsjnze4ukx7wwjlpqrk68wal`

### Preprod (Testing)
- Minted separately for testing (see step 2 below)

---

## Setup Steps

### 1. Install Dependencies

```bash
cd /home/albert/Cognosis
npm install
```

### 2. Set Up Environment Variables

Create `.env` file in `/home/albert/Cognosis/scripts/cardano/`:

```env
# Blockfrost API key
BLOCKFROST_API_KEY=your_blockfrost_key_here

# Wallet seed phrase (24 words)
# IMPORTANT: Keep this secure! Never commit to git
WALLET_SEED_PHRASE="your twenty four word seed phrase here"

# Optional: Specify network (preprod or mainnet)
CARDANO_NETWORK=preprod
```

**Get Blockfrost API key:** https://blockfrost.io/

### 3. Compile Aiken Validators

```bash
cd /home/albert/Cognosis/validators
aiken build

# This generates compiled Plutus scripts in plutus.json
```

### 4. Mint Preprod PSY Tokens (Testing Only)

If deploying to preprod first (recommended), mint test PSY tokens:

```bash
cd /home/albert/Cognosis/scripts/cardano

# Mint 1 million test PSY tokens
npx tsx mint-preprod-psy.ts 1000000
```

This will:
- Create PSY tokens on preprod
- Update `psy-token-config.ts` with preprod policy ID
- Output the transaction hash

**Fund your wallet first:**
- Get test ADA from: https://docs.cardano.org/cardano-testnets/tools/faucet/

### 5. Deploy Reward Vault

#### Deploy to Preprod (Testing)

```bash
cd /home/albert/Cognosis/scripts/cardano

# Deploy vault with 100,000 PSY tokens
npx tsx setup-vault.ts preprod 100000
```

#### Deploy to Mainnet (Production)

⚠️ **ONLY after testing thoroughly on preprod!**

```bash
# Deploy vault with 1,000,000 PSY tokens
npx tsx setup-vault.ts mainnet 1000000
```

The deployment script will:
1. Deploy the compiled reward vault validator
2. Create initial vault UTxO with PSY tokens
3. Set reward parameters (base_reward, decay_factor)
4. Save deployment info to JSON file
5. Print integration code for your app

### 6. Update Frontend Configuration

After deployment, update `/home/albert/Cognosis/backend/.env`:

```env
# For preprod
CARDANO_NETWORK=preprod
BLOCKFROST_URL=https://cardano-preprod.blockfrost.io/api/v0

# For mainnet
CARDANO_NETWORK=mainnet
BLOCKFROST_URL=https://cardano-mainnet.blockfrost.io/api/v0
```

---

## Testing the Vault

### Check Vault Balance

```bash
# View current vault state
npx tsx check-vault-balance.ts preprod
```

### Top Up Vault (Admin Only)

```bash
# Add 50,000 more PSY tokens to vault
npx tsx top-up-vault.ts preprod 50000
```

### Simulate Reward Claim

```bash
# Test reward calculation
npx tsx simulate-reward.ts preprod
```

---

## Reward Parameters

**Base Reward:** 100 PSY (initial reward amount)

**Decay Factor:** 1 (exponential decay rate)

**Formula:**
```
reward = base_reward / (1 + decay_factor × total_claims)
```

**Example rewards:**
- Claim 1: 100 PSY (100 / (1 + 1×0) = 100)
- Claim 2: 50 PSY (100 / (1 + 1×1) = 50)
- Claim 3: 33 PSY (100 / (1 + 1×2) = 33)
- Claim 10: 9 PSY (100 / (1 + 1×9) = 9)

**Adjusting parameters (admin only):**
```bash
npx tsx update-vault-params.ts preprod --base-reward=200 --decay-factor=2
```

---

## Security Considerations

1. **Wallet Security:**
   - Never commit `.env` with seed phrase to git
   - Use hardware wallet for mainnet deployment
   - Keep backups of deployment info

2. **Validator Security:**
   - Aiken validators are formally verified
   - Test thoroughly on preprod before mainnet
   - Monitor vault balance regularly

3. **Admin Actions:**
   - TopUp and UpdateParams require admin signature
   - Admin PKH is set during deployment
   - Can't be changed after deployment

---

## Troubleshooting

### "Vault has insufficient PSY tokens for reward"
→ Top up the vault using `top-up-vault.ts`

### "Could not find vault UTxO"
→ Check if vault was deployed successfully
→ Verify you're on the correct network (preprod/mainnet)

### "Transaction failed: collateral required"
→ Ensure wallet has collateral UTxO (>5 ADA in single UTxO)

---

## Deployment Checklist

- [ ] Aiken validators compiled
- [ ] Environment variables set (`.env`)
- [ ] Wallet funded with ADA
- [ ] Preprod PSY minted (if testing)
- [ ] Vault deployed to preprod
- [ ] Tested reward claims on preprod
- [ ] Vault deployed to mainnet (production)
- [ ] Frontend updated with vault address
- [ ] Monitoring set up for vault balance

---

## Next Steps

After vault deployment:

1. **Integrate with Frontend:**
   - Update `src/lib/cardano/index.ts` with vault address
   - Call `initializeRewardVault()` on app startup
   - Connect wallet UI for claims

2. **Connect to Experiments:**
   - Link psi_experiment validator
   - Enable reward claims after experiment completion
   - Test full flow: commit → reveal → claim reward

3. **Monitor Vault:**
   - Track PSY balance
   - Monitor claim frequency
   - Top up as needed

---

**Questions?** Check deployment logs in `vault-deployment-{network}.json`
