#!/bin/bash
# Deploy Zener Oracle contracts to Cardano Preview testnet

set -e

echo "🎴 Deploying Zener Oracle to Preview Testnet"
echo "============================================"

# Check for aiken
if ! command -v aiken &> /dev/null; then
    echo "❌ Aiken not found. Install: curl -sSfL https://install.aiken-lang.org | bash"
    exit 1
fi

# Build contracts
echo "📦 Building Aiken contracts..."
cd "$(dirname "$0")/.."
aiken build

echo "✅ Contracts compiled to plutus.json"

# Check for cardano-cli (optional for ref scripts)
if command -v cardano-cli &> /dev/null; then
    echo "📝 Generating script addresses..."

    # Extract compiled validators
    STATS_VALIDATOR=$(jq -r '.validators[] | select(.title == "stats_keeper.stats_keeper.spend") | .compiledCode' plutus.json)

    if [ -n "$STATS_VALIDATOR" ]; then
        echo "Stats Keeper compiled successfully"
    fi
else
    echo "⚠️  cardano-cli not found - skip address generation"
    echo "   Use Lucid in the frontend to derive addresses"
fi

echo ""
echo "✅ Deployment prep complete!"
echo ""
echo "Next steps:"
echo "1. Copy plutus.json to web/src/contracts/"
echo "2. Initialize stats UTXO with datum {0, 0, 0}"
echo "3. Fund with test ADA from Preview faucet"
echo ""
echo "Preview faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/"
