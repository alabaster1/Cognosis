#!/bin/bash
##
# Deploy both contracts to preprod using cardano-cli
##

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATORS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Wallet paths
WALLET_SKEY="/home/albert/cardano-preprod/oracle/payment.skey"
WALLET_ADDR="/home/albert/cardano-preprod/oracle/payment.addr"

# Cardano node socket
export CARDANO_NODE_SOCKET_PATH="/home/albert/cardano-preprod/socket/node.socket"

echo "🎰 Deploying Cognosis Contracts to Preprod"
echo "=========================================="
echo ""

# Check wallet exists
if [ ! -f "$WALLET_SKEY" ]; then
  echo "❌ Wallet signing key not found: $WALLET_SKEY"
  exit 1
fi

# Check balance
WALLET_ADDRESS=$(cat "$WALLET_ADDR")
echo "👛 Wallet: $WALLET_ADDRESS"
echo ""

# Query UTxOs
cardano-cli query utxo \
  --address "$WALLET_ADDRESS" \
  --testnet-magic 1 \
  --out-file /tmp/utxo.json

# Calculate total balance
TOTAL_LOVELACE=$(jq '[.[] | .value.lovelace] | add' /tmp/utxo.json)
TOTAL_ADA=$(echo "scale=2; $TOTAL_LOVELACE / 1000000" | bc)

echo "💰 Balance: $TOTAL_ADA tADA ($TOTAL_LOVELACE lovelace)"
echo ""

if [ "$TOTAL_LOVELACE" -lt 17000000 ]; then
  echo "⚠️  Insufficient balance. Need ~17 tADA (currently have $TOTAL_ADA tADA)"
  echo ""
  echo "Get testnet ADA from: https://docs.cardano.org/cardano-testnet/tools/faucet"
  exit 1
fi

echo "✅ Sufficient balance for deployment"
echo ""
echo "📝 Deployment plan:"
echo "  - Lottery contract: 5 ADA + fees"
echo "  - Distributor contract: 10 ADA + fees"
echo "  - Total needed: ~17 ADA"
echo ""

read -p "Proceed with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Deployment cancelled"
  exit 1
fi

echo ""
echo "🚀 Deploying contracts..."
echo ""

# Note: Actual Plutus V3 deployment requires more complex setup
# This is a simplified check - full deployment needs cardano-cli with contract support

echo "⚠️  Full deployment requires cardano-cli transaction building with Plutus V3 scripts"
echo "📋 Contract addresses will be generated from script hashes:"
echo ""
echo "Lottery script hash: 404a9f36de0c69034013c414b83be731257cfd8dce4a570449dd074b"
echo "Distributor script hash: b2c96e5d074641f00ef04d3752428beac88eaccf6532eb5e01be7a41"
echo ""
echo "Next: Use proper Lucid Evolution deployment or cardano-cli build-raw"
