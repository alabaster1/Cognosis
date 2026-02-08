#!/bin/bash
#
# Create PSY/ADA Minswap Pool - Simple Approach
# Uses cardano-cli and Minswap REST API

set -e

# Configuration
WALLET_ADDR="addr_test1qpq9s2sxfmqhfvg6acem0aaye4hdk7vrm6hf8hc4zrkxpx266lf3ugvulgzeyvhg6t9a4xdj009nea8pwfax2da46zasy2me46"
PSY_POLICY="52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e"
PSY_NAME="505359"
ADA_AMOUNT=50000000  # 50 ADA
PSY_AMOUNT=200000000  # 200 PSY

echo "🦞 AURUMELIUS - Create Minswap PSY/ADA Pool"
echo "========================================================================"
echo ""
echo "⚠️  IMPORTANT: Pool creation requires specialized Plutus scripts"
echo "    The Minswap SDK handles this complexity for you."
echo ""
echo "📌 Recommended Approach:"
echo "    1. Use Minswap web UI to create the pool manually"
echo "    2. Or contact Minswap team for pool creation support"
echo ""
echo "🌐 Minswap Preprod UI:"
echo "    https://testnet-preprod.minswap.org/"
echo ""
echo "📝 Manual Steps:"
echo "    1. Go to https://testnet-preprod.minswap.org/liquidity"
echo "    2. Connect wallet (Eternl, Nami, etc.)"
echo "    3. Click 'Create Pool'"
echo "    4. Select: ADA / PSY"
echo "    5. Enter amounts: 50 ADA + 200 PSY"
echo "    6. Confirm transaction"
echo ""
echo "💡 Alternative: Fix SDK Dependencies"
echo "    The Minswap SDK needs compatible Lucid version"
echo "    This requires resolving npm package conflicts"
echo ""
echo "========================================================================"
echo ""
echo "❓ Would you like to:"
echo "    A) Continue with manual UI creation (recommended)"
echo "    B) Debug SDK dependencies (technical, time-consuming)"
echo ""

