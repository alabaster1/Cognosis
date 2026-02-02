# Cognosis Oracle Backend

**Status:** 🚧 In Development - Transaction building not yet complete

Watches for Remote Viewing submissions, scores them with AI, and distributes PSY rewards.

---

## Architecture

```
User submits RV → Creates experiment UTxO on-chain
          ↓
Oracle polls for new experiments
          ↓
Fetches prediction from IPFS
          ↓
Scores with OpenAI GPT-4 (semantic similarity)
          ↓
Builds reveal transaction:
  - Spends: experiment UTxO + vault UTxO
  - Outputs: PSY to user + 0.01 ADA to lottery + updated vault
          ↓
Submits to blockchain
```

---

## Setup

### 1. Install Dependencies

```bash
cd /home/albert/Cognosis/backend/oracle
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required variables:**
- `BLOCKFROST_PROJECT_ID` - Get from https://blockfrost.io (preprod project)
- `OPENAI_API_KEY` - OpenAI API key (needs GPT-4 access)
- Oracle wallet paths should already be correct

### 3. Build TypeScript

```bash
npm run build
```

---

## Running

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

## What It Does

1. **Polls experiment contract** every 30 seconds for new UTxOs
2. **Fetches RV prediction** from IPFS (currently using dummy data)
3. **Scores with GPT-4** using semantic similarity
4. **Builds reveal transaction** that:
   - Spends experiment UTxO (reveal)
   - Spends vault UTxO (withdraw PSY)
   - Sends PSY reward to user (exponential curve)
   - Sends 0.01 ADA to lottery
   - Updates vault datum (claim counter)
5. **Submits to preprod** (Oracle signs)

---

## Reward Curve

Base: **100 PSY**, Max: **400 PSY**, Steepness: **2.5**

| Accuracy | PSY Reward |
|----------|------------|
| 20%      | 105 PSY    |
| 50%      | 153 PSY    |
| 75%      | 246 PSY    |
| 90%      | 331 PSY    |
| 95%      | 364 PSY    |
| 100%     | 400 PSY    |

---

## Current Status

**✅ Complete:**
- Polling for new experiments
- AI scoring with GPT-4
- Reward calculation (exponential curve)
- Config management
- Error handling

**🚧 In Progress:**
- Transaction building with Lucid (complex Plutus script spending)
- IPFS fetching (currently using dummy data)

**TODO:**
- Complete Lucid transaction builder
- Add IPFS/Pinata integration
- Add proper logging
- Add monitoring/alerts
- Switch from Blockfrost to Kupo+Ogmios (production)

---

## Smart Contracts

**Experiment Contract:** `addr_test1wp0m9gv6fzvr5gunqvzlj2g2s235vz3ecndvrg7hdtw92hsaucqr4`
- Stores RV commitments
- Oracle signature required for reveal

**Vault Contract:** `addr_test1wztacuc3ux3r9wnsdad0uwc0rmzt78wm9jhgk5tugp95vvge8k9ge`
- Holds 5B PSY tokens
- Distributes rewards based on accuracy

**Lottery Contract:** `addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp`
- Accumulates 0.01 ADA per submission
- Weekly drawings (not yet implemented)

**Oracle Wallet:** `addr_test1vzy2fzefwytvdad0h0x59svsvmey4465m60yywmvmn0ed7ssdlzqc`
- Signs reveal transactions
- Funded with 100 tADA

---

## Files

- `src/index.ts` - Main Oracle service (polling loop)
- `src/config.ts` - Configuration management
- `src/cardano-client.ts` - Lucid SDK integration
- `src/ai-scorer.ts` - OpenAI GPT-4 scoring
- `src/tx-builder.ts` - Transaction builder (incomplete)

---

**Next:** Complete Lucid transaction builder, test end-to-end reveal flow
