# Cognosis Cardano Scripts

Scripts for deploying and managing the PSY reward vault on Cardano.

## Quick Start

### 1. Setup Environment

```bash
cp .env.example .env
# Edit .env with your Blockfrost key and wallet seed phrase
```

### 2. Install Aiken (if not installed)

```bash
# macOS/Linux
curl -sSfL https://install.aiken-lang.org | bash

# Or via cargo
cargo install aiken
```

### 3. Compile Validators

```bash
cd ../validators
aiken build
```

### 4. Mint Preprod PSY (Testing)

```bash
npx tsx mint-preprod-psy.ts 1000000  # Mint 1M test PSY
```

### 5. Deploy Vault

```bash
# Preprod first (testing)
npx tsx setup-vault.ts preprod 100000

# Mainnet later (production)
npx tsx setup-vault.ts mainnet 1000000
```

## Scripts Overview

### Token Management
- **`mint-preprod-psy.ts`** - Mint PSY tokens on preprod for testing
- **`psy-token-config.ts`** - PSY token configuration (mainnet + preprod)

### Vault Deployment
- **`setup-vault.ts`** - Deploy reward vault contract
- **`top-up-vault.ts`** - Add more PSY to vault (admin only)

### Configuration
- **`SETUP_GUIDE.md`** - Complete deployment guide
- **`.env.example`** - Environment variables template

## Environment Variables

Required in `.env`:

```env
BLOCKFROST_API_KEY=your_key_here
WALLET_SEED_PHRASE="your 24 word seed phrase"
CARDANO_NETWORK=preprod  # or mainnet
```

## PSY Token Details

### Mainnet
- Policy: `d137118335bd9618c1b5be5612691baf7a5c13c159b00d44fb69f177`
- Asset: `507379` (hex for "Psy")

### Preprod
- Minted via `mint-preprod-psy.ts`
- Details saved to `psy-token-config.ts` after minting

## Deployment Flow

```
1. Compile Aiken validators
2. Mint preprod PSY (if testing)
3. Deploy vault to preprod
4. Test reward claims
5. Deploy vault to mainnet
6. Top up as needed
```

## Security

- Never commit `.env` with seed phrase!
- Test thoroughly on preprod before mainnet
- Use hardware wallet for mainnet deployment
- Keep deployment JSON files backed up

## Support

See `SETUP_GUIDE.md` for detailed instructions and troubleshooting.
