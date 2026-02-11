#!/bin/bash

# Deploy Compact Smart Contract to Midnight Testnet-02
# This script deploys the compiled contract to testnet

set -e  # Exit on error

echo "=========================================="
echo "  Deploy to Midnight Testnet-02"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "../../config/.env" ]; then
    source ../../config/.env
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

# Verify we're on testnet
if [ "$MIDNIGHT_ENVIRONMENT" != "testnet" ]; then
    echo -e "${RED}✗ MIDNIGHT_ENVIRONMENT must be set to 'testnet'${NC}"
    echo "Current value: $MIDNIGHT_ENVIRONMENT"
    exit 1
fi

echo -e "${GREEN}✓ Environment: Testnet${NC}"
echo ""

# Check if compiled artifacts exist
COMPILED_DIR="../compiled"
if [ ! -d "$COMPILED_DIR" ]; then
    echo -e "${RED}✗ Compiled contract not found${NC}"
    echo "Please run ./compile-contract.sh first"
    exit 1
fi

echo -e "${GREEN}✓ Compiled contract found${NC}"
echo ""

# Check for wallet configuration
if [ -z "$MIDNIGHT_WALLET_SEED" ]; then
    echo -e "${YELLOW}⚠ No wallet seed configured${NC}"
    echo "Please set MIDNIGHT_WALLET_SEED in your .env file"
    echo "Or use Lace wallet for deployment (recommended)"
    echo ""
    read -p "Continue with Lace wallet? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "=========================================="
echo "  Deployment Configuration"
echo "=========================================="
echo "Network: $MIDNIGHT_NETWORK"
echo "Node URL: $MIDNIGHT_NODE_URL"
echo "Indexer URL: $MIDNIGHT_INDEXER_URL"
echo "Proving Server: $MIDNIGHT_PROVING_SERVER_URL"
echo ""

read -p "Deploy to testnet? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Deploying contract to testnet..."
echo ""

# Deploy the contract
# Note: Adjust command based on actual Midnight CLI syntax
midnight-cli deploy \
  --network testnet-02 \
  --contract "$COMPILED_DIR" \
  --node-url "$MIDNIGHT_NODE_URL" \
  --indexer-url "$MIDNIGHT_INDEXER_URL"

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  ✓ Deployment Successful!"
    echo -e "==========================================${NC}"
    echo ""
    echo "Contract deployed to Midnight Testnet-02"
    echo ""
    echo "Next steps:"
    echo "  1. Copy the contract address from the output above"
    echo "  2. Update MIDNIGHT_CONTRACT_ADDRESS in config/.env"
    echo "  3. Test the deployment: ./verify-deployment.sh"
    echo "  4. Run integration tests: ../../scripts/run_poc.sh"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "  ✗ Deployment Failed"
    echo -e "==========================================${NC}"
    echo ""
    echo "Please check the error messages above."
    echo "Common issues:"
    echo "  - Insufficient tDUST balance"
    echo "  - Network connection issues"
    echo "  - Invalid wallet configuration"
    exit 1
fi
