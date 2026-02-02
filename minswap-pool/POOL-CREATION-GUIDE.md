# Minswap Pool Creation Guide

## Overview

This guide explains how to create a liquidity pool for PSY/ADA on Minswap preprod testnet.

## Prerequisites

1. **PSY Token Minted:** You must have already minted the PSY token on preprod (Albert confirmed this was done earlier)

2. **Funds Required:**
   - At least 105 ADA (100 for pool + ~5 for fees)
   - At least 100 PSY tokens (or whatever initial liquidity you want)

3. **Environment Variables:**
   ```bash
   export BLOCKFROST_PREPROD_KEY="your_blockfrost_key"
   export WALLET_ADDRESS="addr_test1..."
   export WALLET_SKEY="your_signing_key"
   ```

## PSY Token Details

**IMPORTANT:** Before running the script, you need to update the PSY policy ID in `create-minswap-pool.ts`:

```typescript
const PSY_ASSET: Asset = {
  policyId: "YOUR_ACTUAL_PSY_POLICY_ID", // ← Replace this!
  tokenName: "505359" // "PSY" in hex - this is correct
};
```

To find your PSY policy ID, check where you minted it earlier or query your wallet:

```bash
cardano-cli query utxo --address $WALLET_ADDRESS --testnet-magic 1
```

Look for the PSY token in the output - the policy ID is the long hex string before the token name.

## Running the Script

### Step 1: Install Dependencies

```bash
cd /home/albert/aurumelius
npm install
```

Make sure you have `@minswap/sdk` installed:

```bash
npm install @minswap/sdk @blockfrost/blockfrost-js
```

### Step 2: Update PSY Policy ID

Edit `create-minswap-pool.ts` and replace the PSY policy ID with your actual minted token policy.

### Step 3: Run the Script

```bash
# Option 1: Direct execution
./create-minswap-pool.ts

# Option 2: Via ts-node
npx ts-node create-minswap-pool.ts

# Option 3: Compile and run
npx tsc create-minswap-pool.ts
node create-minswap-pool.js
```

## What the Script Does

1. **Connects to preprod** using Blockfrost
2. **Checks if pool exists** (prevents duplicate creation)
3. **Verifies wallet balance** (ensures you have enough ADA and PSY)
4. **Builds pool creation tx** (100 ADA + 100 PSY initial liquidity)
5. **Signs and submits** to preprod testnet

## Pool Parameters

Current settings (can be adjusted in the script):

```typescript
const ADA_AMOUNT = 100_000_000n;      // 100 ADA
const PSY_AMOUNT = 100_000_000n;      // 100 PSY
const TRADING_FEE_NUMERATOR = 30n;    // 0.3% fee (Minswap standard)
```

### Adjusting Initial Liquidity

The ratio of ADA:PSY determines the initial price. Current settings (100:100) mean:
- **Initial Price:** 1 ADA = 1 PSY

To change the price, adjust the amounts:
- 1 ADA = 10 PSY → `ADA_AMOUNT = 100_000_000n`, `PSY_AMOUNT = 1_000_000_000n`
- 1 ADA = 0.1 PSY → `ADA_AMOUNT = 100_000_000n`, `PSY_AMOUNT = 10_000_000n`

## After Pool Creation

Once the transaction confirms (~1-2 minutes), you can:

### 1. Query the Pool

```typescript
const pool = await adapter.getV2PoolByPair(ADA, PSY_ASSET);
console.log(pool);
```

### 2. Add More Liquidity

Use the existing `test-minswap-swap.ts` deposit logic or Minswap UI.

### 3. Start Trading

The pool is now live! You (or anyone) can swap ADA ↔ PSY.

### 4. Deploy Contracts

Continue with the original plan: deploy Cognosis contracts and integrate PSY into predictions.

## Troubleshooting

### "Pool already exists"

If you see this error, the pool was already created. Check the LP asset details in the error message.

### "Insufficient ADA/PSY"

Fund your wallet:
- **ADA:** Get test ADA from [preprod faucet](https://docs.cardano.org/cardano-testnet/tools/faucet)
- **PSY:** Mint more using your original minting script

### "BLOCKFROST_PREPROD_KEY not set"

Get a free Blockfrost API key:
1. Go to [blockfrost.io](https://blockfrost.io)
2. Sign up
3. Create a preprod project
4. Copy the API key

### Transaction Fails

Check:
1. Wallet has enough collateral (5 ADA minimum)
2. PSY policy ID is correct
3. Token amounts are in lovelaces (1 ADA = 1_000_000 lovelaces)

## Next Steps

After pool creation:

1. ✅ **Pool Created** ← You are here
2. **Test Swaps:** Swap small amounts to verify pool works
3. **Deploy Contracts:** Continue with Cognosis oracle integration
4. **Monitor Liquidity:** Track pool depth, slippage, volume
5. **Aurumelius Integration:** Build arbitrage strategies

---

**Last Updated:** 2026-02-02  
**Network:** Preprod Testnet  
**DEX:** Minswap V2
