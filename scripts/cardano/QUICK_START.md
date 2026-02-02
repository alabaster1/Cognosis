# 🚀 Quick Start - Deploy PSY Reward System on Preprod

## Prerequisites

1. **Brave browser** with Eternl wallet extension installed
2. **Preprod wallet** funded with ~100 tADA from faucet

---

## Step 1: Export Wallet Seed

From Eternl wallet:
1. Settings → Security → Show Recovery Phrase
2. Copy your 24-word seed phrase
3. Set environment variable:

```bash
export WALLET_SEED_PHRASE="word1 word2 word3 ... word24"
```

---

## Step 2: Mint PSY Tokens

```bash
cd /home/albert/Cognosis/scripts/cardano

export BLOCKFROST_API_KEY=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL
export WALLET_SEED_PHRASE="<your 24 words>"

npx tsx mint-preprod-psy.ts 10000000000
```

**Save the PSY_POLICY_ID from the output!**

---

## Step 3: Initialize Reward Vault

```bash
export PSY_POLICY_ID="<from step 2>"

npx tsx init-reward-vault-preprod.ts
```

This locks 5 billion PSY in the vault with:
- Base reward: 100 PSY
- Max reward: 400 PSY
- Exponential curve (steepness 2.5)

---

## Step 4: Initialize Lottery Pool

```bash
npx tsx init-lottery-preprod.ts
```

Creates lottery contract with:
- Weekly drawings
- 0.01 ADA fee per submission
- PSY-weighted tickets

---

## Step 5: Test Reward Claim

```bash
# Test 75% accuracy (should get ~246 PSY)
npx tsx test-claim-reward-preprod.ts 75
```

---

## Validator Hashes (Already Built)

✅ **Reward Vault V2:**
```
a95df2440082887e93aea18768af16bb5c784f71d33dba21a4183a7b
```

✅ **PSY Lottery:**
```
30d6ef5fc1e228d6aa9f36ba7b8c16ac80270255142640f6f5176c0a
```

---

## Reward Examples

| Accuracy | PSY Earned |
|----------|------------|
| 20% | 105 PSY |
| 50% | 153 PSY |
| **75%** | **246 PSY** |
| 90% | 331 PSY |
| 95% | 364 PSY |

---

## Troubleshooting

**Error: "WALLET_SEED_PHRASE not set"**
→ Export your seed phrase as environment variable

**Error: "Insufficient funds"**
→ Get test ADA from preprod faucet:
https://docs.cardano.org/cardano-testnets/tools/faucet/

**Error: "PSY_POLICY_ID not set"**
→ Run step 2 (mint PSY) first

**Error: "No vault UTxO found"**
→ Run step 3 (initialize vault) first

---

## After Testing on Preprod

Once everything works:
1. Repeat on **mainnet** (different Blockfrost key)
2. Fund mainnet wallet with real ADA
3. Mint 10B PSY on mainnet
4. Initialize mainnet vault + lottery
5. Launch! 🎉

---

**Questions?** Ping @Elliot on Discord or check DEPLOYMENT_LOG.md
