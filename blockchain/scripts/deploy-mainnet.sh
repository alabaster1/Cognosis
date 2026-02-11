#!/bin/bash

# Deploy Compact Smart Contract to Midnight MAINNET
# ⚠️  USE WITH EXTREME CAUTION - THIS DEPLOYS TO PRODUCTION ⚠️

set -e  # Exit on error

echo "=========================================="
echo "  ⚠️  MAINNET DEPLOYMENT WARNING ⚠️"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${RED}${BOLD}YOU ARE ABOUT TO DEPLOY TO PRODUCTION MAINNET${NC}"
echo ""
echo "This action:"
echo "  - Cannot be reversed"
echo "  - Will cost real DUST tokens"
echo "  - Requires thorough testing and audit"
echo "  - May affect real user funds"
echo ""

# Safety check 1: Confirm environment
if [ -f "../../config/.env.mainnet" ]; then
    echo -e "${YELLOW}Loading mainnet configuration...${NC}"
    source ../../config/.env.mainnet
else
    echo -e "${RED}✗ Mainnet configuration file not found${NC}"
    echo "Expected: config/.env.mainnet"
    exit 1
fi

# Safety check 2: Verify mainnet environment
if [ "$MIDNIGHT_ENVIRONMENT" != "mainnet" ]; then
    echo -e "${RED}✗ MIDNIGHT_ENVIRONMENT must be set to 'mainnet'${NC}"
    echo "Current value: $MIDNIGHT_ENVIRONMENT"
    exit 1
fi

echo -e "${GREEN}✓ Environment: Mainnet${NC}"
echo ""

# Safety check 3: Confirm checklist completion
echo "=========================================="
echo "  Pre-Deployment Checklist"
echo "=========================================="
echo ""
echo "Have you completed ALL of the following?"
echo ""
echo "  [ ] Contract has been audited by security professionals"
echo "  [ ] All tests pass on testnet"
echo "  [ ] Integration tests completed successfully"
echo "  [ ] Stress tests completed successfully"
echo "  [ ] Team has reviewed and approved deployment"
echo "  [ ] Backup wallet and recovery phrase stored securely"
echo "  [ ] Have sufficient DUST for deployment and gas"
echo "  [ ] Mainnet configuration reviewed and verified"
echo "  [ ] Monitoring and alerting systems are ready"
echo "  [ ] Rollback plan documented and tested"
echo ""

read -p "All items checked? Type 'YES' to continue: " CONFIRM_CHECKLIST
if [ "$CONFIRM_CHECKLIST" != "YES" ]; then
    echo "Deployment cancelled - Complete checklist first"
    exit 0
fi

echo ""

# Safety check 4: Compiled contract exists
COMPILED_DIR="../compiled"
if [ ! -d "$COMPILED_DIR" ]; then
    echo -e "${RED}✗ Compiled contract not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Compiled contract found${NC}"
echo ""

# Safety check 5: Wallet configuration
if [ -z "$MIDNIGHT_WALLET_SEED" ]; then
    echo -e "${RED}✗ No wallet configured for mainnet${NC}"
    echo "Please configure MIDNIGHT_WALLET_SEED in .env.mainnet"
    exit 1
fi

echo "=========================================="
echo "  Mainnet Deployment Configuration"
echo "=========================================="
echo "Network: $MIDNIGHT_NETWORK"
echo "Node URL: $MIDNIGHT_NODE_URL"
echo "Indexer URL: $MIDNIGHT_INDEXER_URL"
echo "Proving Server: $MIDNIGHT_PROVING_SERVER_URL"
echo ""

# Final confirmation with typed confirmation
echo -e "${RED}${BOLD}FINAL CONFIRMATION REQUIRED${NC}"
echo ""
echo "Type the following EXACTLY to proceed:"
echo "  'DEPLOY TO MAINNET'"
echo ""
read -p "> " FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "DEPLOY TO MAINNET" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "=========================================="
echo "  Deploying to Mainnet..."
echo "=========================================="
echo ""

# Deploy the contract
midnight-cli deploy \
  --network mainnet \
  --contract "$COMPILED_DIR" \
  --node-url "$MIDNIGHT_NODE_URL" \
  --indexer-url "$MIDNIGHT_INDEXER_URL"

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  ✓ Mainnet Deployment Successful!"
    echo -e "==========================================${NC}"
    echo ""
    echo "⚠️  IMPORTANT POST-DEPLOYMENT STEPS:"
    echo ""
    echo "  1. Copy the contract address from output above"
    echo "  2. Verify contract on block explorer"
    echo "  3. Update production .env with contract address"
    echo "  4. Test all functionality on mainnet"
    echo "  5. Monitor contract for first 24 hours"
    echo "  6. Document deployment in team records"
    echo "  7. Announce to community (if applicable)"
    echo ""
    echo "Contract Address: [COPY FROM ABOVE]"
    echo "Block Explorer: https://explorer.midnight.network"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "  ✗ Mainnet Deployment Failed"
    echo -e "==========================================${NC}"
    echo ""
    echo "DO NOT RETRY without investigating the failure!"
    echo "Check error messages and consult the team."
    exit 1
fi
