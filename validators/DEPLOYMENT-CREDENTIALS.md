# Deployment Credentials Setup

**Status:** Ready to deploy once credentials are provided

---

## Required Environment Variables

### 1. Blockfrost API Key ✅ FOUND

**Found in:** `backend/oracle/.env`
```
BLOCKFROST_PROJECT_ID=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL
```

**Note:** This is the Blockfrost API key for preprod testnet.

### 2. Wallet Seed Phrase ⚠️ NEEDED

**Purpose:** Admin wallet to deploy contracts and sign transactions

**Format:** 24-word seed phrase

**Security:** 
- Should be stored securely
- Can use test wallet for preprod (not real funds)
- DO NOT commit seed phrase to git

---

## Setup Options

### Option A: Use Existing Test Wallet

If you have a preprod test wallet:

```bash
export BLOCKFROST_API_KEY="preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL"
export WALLET_SEED_PHRASE="your 24 word seed phrase here"

cd ~/Cognosis/validators/scripts
npx ts-node deploy-lottery-preprod.ts
npx ts-node deploy-distributor-preprod.ts
```

### Option B: Create New Test Wallet

Generate a new preprod test wallet:

```bash
# Using cardano-wallet or similar
# Get testnet ADA from faucet: https://docs.cardano.org/cardano-testnet/tools/faucet

# Then export credentials
export BLOCKFROST_API_KEY="preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL"
export WALLET_SEED_PHRASE="newly generated 24 word phrase"
```

### Option C: Create .env File (Recommended)

Create `~/Cognosis/validators/.env`:

```env
BLOCKFROST_API_KEY=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL
WALLET_SEED_PHRASE=your 24 word seed phrase here
```

Then deployment scripts will auto-load from .env file.

---

## Deployment Checklist

Once credentials are set:

- [ ] Environment variables exported or .env file created
- [ ] Wallet has preprod tADA (get from faucet if needed)
- [ ] Run: `npx ts-node deploy-lottery-preprod.ts`
- [ ] Run: `npx ts-node deploy-distributor-preprod.ts`
- [ ] Run: `npx ts-node test-integration.ts`
- [ ] Review results and contract addresses

---

## Security Notes

**For Preprod:**
- Use test wallet with testnet ADA only
- Seed phrase can be less secure (test funds only)
- Contract addresses will be preprod testnet

**For Mainnet (Future):**
- Use hardware wallet or secure key management
- NEVER expose mainnet seed phrase
- Multi-sig recommended for admin actions
- Contract deployment requires thorough audit first

---

## Next Steps

1. Albert/Kiki: Provide preprod test wallet seed phrase
2. Elliot: Deploy contracts to preprod
3. Elliot: Run integration tests
4. Team: Review results and plan next phase

---

**Created:** 2026-02-03  
**Status:** Awaiting wallet credentials
