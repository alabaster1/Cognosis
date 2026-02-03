#!/bin/bash
##
# Check if deployment prerequisites are met
##

echo "🔍 Checking deployment prerequisites..."
echo ""

READY=true

# Check Blockfrost API key
if [ -z "$BLOCKFROST_API_KEY" ]; then
  echo "❌ BLOCKFROST_API_KEY not set"
  READY=false
else
  echo "✅ BLOCKFROST_API_KEY is set"
fi

# Check wallet seed phrase
if [ -z "$WALLET_SEED_PHRASE" ]; then
  echo "❌ WALLET_SEED_PHRASE not set"
  READY=false
else
  echo "✅ WALLET_SEED_PHRASE is set"
fi

# Check if .env file exists
if [ -f "../.env" ]; then
  echo "✅ .env file found"
else
  echo "⚠️  .env file not found (optional)"
fi

# Check if contracts are compiled
if [ -f "../on-chain-lottery/plutus.json" ]; then
  echo "✅ Lottery contract compiled"
else
  echo "❌ Lottery contract not compiled"
  READY=false
fi

if [ -f "../psy-rewards-distributor/plutus.json" ]; then
  echo "✅ Distributor contract compiled"
else
  echo "❌ Distributor contract not compiled"
  READY=false
fi

# Check if TypeScript is available
if command -v npx &> /dev/null; then
  echo "✅ npx available"
else
  echo "❌ npx not found (install Node.js)"
  READY=false
fi

echo ""

if [ "$READY" = true ]; then
  echo "🎉 Ready to deploy!"
  echo ""
  echo "Run deployment:"
  echo "  npx ts-node deploy-lottery-preprod.ts"
  echo "  npx ts-node deploy-distributor-preprod.ts"
  exit 0
else
  echo "⚠️  Not ready to deploy. Fix issues above."
  echo ""
  echo "Setup instructions:"
  echo "  1. Set BLOCKFROST_API_KEY environment variable"
  echo "  2. Set WALLET_SEED_PHRASE environment variable"
  echo "  3. Or create ../validators/.env file with credentials"
  echo ""
  echo "See DEPLOYMENT-CREDENTIALS.md for details"
  exit 1
fi
