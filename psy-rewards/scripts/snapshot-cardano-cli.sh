#!/bin/bash
# PSY Snapshot Generator (using cardano-cli directly)
# 
# Simpler approach: Query UTxOs directly via cardano-cli
# Later optimize with Kupo for faster lookups
#
# Usage: ./snapshot-cardano-cli.sh preprod

set -e

NETWORK=${1:-preprod}
SOCKET_PATH="/home/albert/cardano-preprod/socket/node.socket"
PSY_POLICY_ID="your_psy_token_policy_id_here"  # TODO: Update with actual policy ID

# Get network magic
if [ "$NETWORK" = "mainnet" ]; then
    MAGIC="--mainnet"
else
    MAGIC="--testnet-magic 1"
fi

echo "🦞 PSY Snapshot Generator (cardano-cli)"
echo ""
echo "Network: $NETWORK"
echo "Socket: $SOCKET_PATH"
echo ""

# Get current tip
echo "📦 Querying blockchain tip..."
TIP=$(cardano-cli query tip $MAGIC --socket-path "$SOCKET_PATH")
BLOCK_HEIGHT=$(echo "$TIP" | jq -r '.block')
echo "Current block: $BLOCK_HEIGHT"
echo ""

# For now, just test the connection
echo "✅ Connected to cardano-node successfully!"
echo ""
echo "Next steps:"
echo "1. Get PSY token policy ID (from mainnet deployment)"
echo "2. Query all UTxOs containing PSY"
echo "3. Aggregate by address"
echo "4. Calculate shares"
echo "5. Build Merkle tree"
echo ""
echo "For full snapshot generation:"
echo "  npm run snapshot -- --network $NETWORK"
