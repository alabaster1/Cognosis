#!/bin/bash
# Simple Oracle Test - Just run the oracle once to test transaction building

set -e

echo "🧪 Cognosis Oracle - Simple Test"
echo "================================="
echo

# Setup environment
export CARDANO_NODE_SOCKET_PATH=~/cardano-preprod/socket/node.socket
cd /home/albert/Cognosis/backend/oracle

echo "📋 Configuration:"
echo "   Node Socket: $CARDANO_NODE_SOCKET_PATH"
echo "   Working Dir: $(pwd)"
echo

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo

# Check experiment contract for pending UTxOs
echo "🔍 Checking for pending experiments..."
EXPERIMENT_ADDR="addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7"
cardano-cli query utxo --address "$EXPERIMENT_ADDR" --testnet-magic 1

echo
echo "📊 Checking vault..."
VAULT_ADDR="addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj"
cardano-cli query utxo --address "$VAULT_ADDR" --testnet-magic 1

echo
echo "🚀 Running Oracle (60 second timeout)..."
echo

# Run oracle with timeout
timeout 60 node dist/index.js || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo
        echo "⏱️ Timeout reached (expected)"
    else
        echo
        echo "❌ Oracle exited with code $EXIT_CODE"
    fi
}

echo
echo "✅ Test complete!"
echo
echo "If there were pending experiments, they should have been processed."
echo "Check the output above for transaction hashes."
