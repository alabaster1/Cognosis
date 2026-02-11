#!/bin/bash

# Compile Compact Smart Contract
# This script compiles the psi_commit.compact.ts contract using Midnight CLI

set -e  # Exit on error

echo "=========================================="
echo "  Midnight Compact Contract Compiler"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contract path
CONTRACT_FILE="../compact/psi_commit.compact.ts"
OUTPUT_DIR="../compiled"

# Check if Midnight CLI is installed
if ! command -v midnight-cli &> /dev/null; then
    echo -e "${RED}✗ Midnight CLI not found${NC}"
    echo ""
    echo "Please install Midnight CLI first:"
    echo "  npm install -g @midnight-ntwrk/cli"
    echo ""
    echo "Or follow the official installation guide:"
    echo "  https://docs.midnight.network/develop/getting-started/installation"
    exit 1
fi

echo -e "${GREEN}✓ Midnight CLI found${NC}"
echo ""

# Check if contract file exists
if [ ! -f "$CONTRACT_FILE" ]; then
    echo -e "${RED}✗ Contract file not found: $CONTRACT_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contract file found${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Compiling contract..."
echo ""

# Compile the contract
# Note: Adjust command based on actual Midnight CLI syntax
midnight-cli compile \
  --input "$CONTRACT_FILE" \
  --output "$OUTPUT_DIR" \
  --target testnet

COMPILE_EXIT_CODE=$?

if [ $COMPILE_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  ✓ Compilation Successful!"
    echo -e "==========================================${NC}"
    echo ""
    echo "Compiled artifacts saved to: $OUTPUT_DIR"
    echo ""
    echo "Next steps:"
    echo "  1. Review the compiled output"
    echo "  2. Run local tests: ./test-contract-local.sh"
    echo "  3. Deploy to testnet: ./deploy-testnet.sh"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "  ✗ Compilation Failed"
    echo -e "==========================================${NC}"
    echo ""
    echo "Please check the error messages above and fix the contract code."
    exit 1
fi
