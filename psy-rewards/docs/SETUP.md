# PSY Rewards System Setup Guide

## Prerequisites

### Required Software
- **Node.js 18+** (for scripts)
- **Aiken v1.1.7+** (smart contract development)
- **cardano-node** (preprod testnet sync)
- **Ogmios + Kupo** (blockchain indexer - no Blockfrost!)

### System Requirements
- **RAM:** 16GB+ recommended
- **Storage:** 50GB+ for preprod blockchain data
- **Network:** Stable internet for node sync

---

## Step 1: Install Ogmios + Kupo

### What is Ogmios + Kupo?
- **Ogmios:** Lightweight bridge to cardano-node (JSON-RPC API)
- **Kupo:** Chain indexer (fast UTxO lookups)
- **Why:** Full control, no external API dependencies, faster than Blockfrost

### Installation (Docker - Easiest)

```bash
# Create docker-compose.yml for Ogmios + Kupo
cd /home/albert/Cognosis/psy-rewards

cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  cardano-node:
    image: inputoutput/cardano-node:latest
    volumes:
      - node-db:/data
      - node-ipc:/ipc
    environment:
      NETWORK: preprod
    command: run

  ogmios:
    image: cardanosolutions/ogmios:latest
    ports:
      - "1337:1337"
    volumes:
      - node-ipc:/ipc
    depends_on:
      - cardano-node

  kupo:
    image: cardanosolutions/kupo:latest
    ports:
      - "1442:1442"
    volumes:
      - kupo-db:/db
      - node-ipc:/ipc
    command: 
      - --node-socket
      - /ipc/node.socket
      - --node-config
      - /ipc/node.config
      - --since
      - origin
      - --match
      - "*"
      - --workdir
      - /db
    depends_on:
      - cardano-node

volumes:
  node-db:
  node-ipc:
  kupo-db:
EOF

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f ogmios
docker-compose logs -f kupo
```

### Alternative: Native Installation

If Docker doesn't work, install natively:

```bash
# Install Ogmios (pre-built binary)
wget https://github.com/CardanoSolutions/ogmios/releases/latest/download/ogmios-x86_64-linux.zip
unzip ogmios-x86_64-linux.zip
chmod +x ogmios
sudo mv ogmios /usr/local/bin/

# Install Kupo (pre-built binary)
wget https://github.com/CardanoSolutions/kupo/releases/latest/download/kupo-x86_64-linux.zip
unzip kupo-x86_64-linux.zip
chmod +x kupo
sudo mv kupo /usr/local/bin/

# Run Ogmios (pointing to cardano-node socket)
ogmios \
  --node-socket /path/to/cardano-node/node.socket \
  --node-config /path/to/cardano-node/config.json \
  --host 0.0.0.0 \
  --port 1337

# Run Kupo (separate terminal)
kupo \
  --node-socket /path/to/cardano-node/node.socket \
  --node-config /path/to/cardano-node/config.json \
  --since origin \
  --match "*" \
  --workdir ./kupo-db \
  --host 0.0.0.0 \
  --port 1442
```

### Verify Installation

```bash
# Check Ogmios (health check)
curl -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"queryNetwork/tip","id":1}' \
  http://localhost:1337

# Should return current blockchain tip

# Check Kupo (query matches)
curl http://localhost:1442/matches

# Should return indexed UTxOs
```

---

## Step 2: Install Aiken (Smart Contract Compiler)

```bash
# Install Aiken via cargo (Rust)
cargo install aiken

# Or download pre-built binary
wget https://github.com/aiken-lang/aiken/releases/latest/download/aiken-x86_64-linux.tar.gz
tar -xzf aiken-x86_64-linux.tar.gz
sudo mv aiken /usr/local/bin/

# Verify
aiken --version
# Should show: aiken v1.1.7 or later
```

---

## Step 3: Set Up Development Environment

```bash
cd /home/albert/Cognosis/psy-rewards

# Install Node.js dependencies
npm install

# Build smart contracts
cd contracts
aiken build

# Run tests
aiken check
```

---

## Step 4: Configure Preprod Testnet

```bash
# Create .env file
cat > .env << 'EOF'
NETWORK=preprod
OGMIOS_URL=http://localhost:1337
KUPO_URL=http://localhost:1442

# PSY Token (replace with actual policy ID once deployed)
PSY_POLICY_ID=your_psy_token_policy_id
PSY_ASSET_NAME=PSY

# Admin wallet (for submitting snapshots)
ADMIN_WALLET_PATH=/path/to/admin/wallet.skey

# Snapshot schedule
SNAPSHOT_INTERVAL_DAYS=30
SNAPSHOT_DAY_OF_MONTH=28  # Take snapshot on 28th of each month

# Rewards config
MIN_REWARD_THRESHOLD=5000000  # 5 ADA in lovelace
REVENUE_SPLIT_HOLDERS=0.50    # 50% to holders
REVENUE_SPLIT_LOTTERY=0.50    # 50% to lottery
EOF
```

---

## Step 5: Test Snapshot Generation

```bash
# Run snapshot script (dry run)
npm run snapshot -- --dry-run --network preprod

# Should output:
# - Total PSY holders found: X
# - Total PSY supply: Y
# - Merkle root: <hash>
# - Snapshot saved to: snapshots/2026-02-28.json
```

---

## Step 6: Deploy to Preprod

```bash
# Build contract
cd contracts
aiken build

# Deploy to preprod (generates script address)
aiken blueprint apply

# Fund contract with initial ADA (for tx fees)
# Use Eternl/Lace/Nami to send 10 ADA to contract address

# Submit first test snapshot
npm run snapshot:submit -- --network preprod --snapshot snapshots/test.json

# Verify on-chain
cardano-cli query utxo --address <contract-address> --testnet-magic 1
```

---

## Troubleshooting

### Ogmios won't connect
- Check cardano-node is running and synced
- Verify socket path is correct
- Check firewall allows port 1337

### Kupo indexing slow
- Normal on first sync (can take hours)
- Check disk space (needs 20GB+ for preprod)
- Use `--since <recent-slot>` to start from recent block

### Aiken build fails
- Update to latest version: `cargo install aiken --force`
- Check Plutus version compatibility (should be v3)
- Review error logs in `aiken.log`

### Snapshot script errors
- Verify Ogmios + Kupo are accessible
- Check PSY_POLICY_ID is correct
- Ensure network is set to preprod

---

## Next Steps

1. ✅ Infrastructure running (Ogmios + Kupo)
2. ✅ Aiken contracts building
3. ⏳ Test snapshot generation
4. ⏳ Deploy to preprod
5. ⏳ Test full distribution flow
6. ⏳ Security review
7. ⏳ Deploy to mainnet

---

**Questions?** Ask in Discord or check logs in `/home/albert/Cognosis/psy-rewards/logs/`
