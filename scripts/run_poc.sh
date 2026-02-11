#!/bin/bash

###############################################################################
# Cognosis Proof of Concept Test Script
#
# Purpose: Run end-to-end integration test with mocked Midnight SDK
# Tests: Full commit/reveal flow from client to blockchain
#
# Usage: ./scripts/run_poc.sh
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "  Cognosis - Midnight PoC Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COORDINATOR_PORT=3001
COORDINATOR_PID=""

# Cleanup function
cleanup() {
  echo ""
  echo "Cleaning up..."
  if [ ! -z "$COORDINATOR_PID" ]; then
    echo "Stopping coordinator (PID: $COORDINATOR_PID)"
    kill $COORDINATOR_PID 2>/dev/null || true
  fi
  exit
}

trap cleanup EXIT INT TERM

# Check dependencies
echo "Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo "❌ node is required"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required"; exit 1; }
echo "✓ Dependencies OK"
echo ""

# Start off-chain coordinator
echo "Starting off-chain coordinator..."
cd backend/offchain_coordinator
export MIDNIGHT_NETWORK=testnet
export PINNING_SERVICE=mock
export PORT=$COORDINATOR_PORT

node index.js > /tmp/coordinator.log 2>&1 &
COORDINATOR_PID=$!

echo "Coordinator started (PID: $COORDINATOR_PID)"
echo "Waiting for coordinator to be ready..."
sleep 3

# Check if coordinator is running
if ! curl -s http://localhost:$COORDINATOR_PORT/health > /dev/null; then
  echo "❌ Coordinator failed to start"
  cat /tmp/coordinator.log
  exit 1
fi

echo "✓ Coordinator ready"
echo ""

# Go back to root
cd ../..

# Test 1: Health Check
echo "=========================================="
echo "Test 1: Health Check"
echo "=========================================="
response=$(curl -s http://localhost:$COORDINATOR_PORT/health)
echo "Response: $response"

if echo "$response" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ Test 1 PASSED${NC}"
else
  echo -e "${RED}✗ Test 1 FAILED${NC}"
  exit 1
fi
echo ""

# Test 2: Upload encrypted blob to IPFS
echo "=========================================="
echo "Test 2: Upload to IPFS"
echo "=========================================="
test_data="I see mountains and water flowing"
blob_base64=$(echo -n "$test_data" | base64)

response=$(curl -s -X POST http://localhost:$COORDINATOR_PORT/api/pin \
  -H "Content-Type: application/json" \
  -d "{\"blobBase64\":\"$blob_base64\",\"filename\":\"poc_test.enc\"}")

echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
  cid=$(echo "$response" | grep -o '"cid":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Test 2 PASSED${NC}"
  echo "CID: $cid"
else
  echo -e "${RED}✗ Test 2 FAILED${NC}"
  exit 1
fi
echo ""

# Test 3: Create commitment
echo "=========================================="
echo "Test 3: Create Commitment"
echo "=========================================="

# Generate test data
nonce=$(openssl rand -hex 32)
device_pubkey=$(openssl rand -hex 32)
timestamp=$(date +%s)
target_hash=$(openssl rand -hex 32)

metadata=$(cat <<EOF
{
  "experimentType": "remote_viewing",
  "timestamp": $timestamp,
  "targetHash": "$target_hash"
}
EOF
)

# Compute device signature
message="${cid}${metadata}${nonce}"
device_sig=$(echo -n "${message}${device_pubkey}" | openssl dgst -sha256 | awk '{print $2}')

# Create commitment
response=$(curl -s -X POST http://localhost:$COORDINATOR_PORT/api/commit \
  -H "Content-Type: application/json" \
  -d "{
    \"cid\": \"$cid\",
    \"metadata\": $metadata,
    \"nonce\": \"$nonce\",
    \"deviceSig\": \"$device_sig\",
    \"devicePubKey\": \"$device_pubkey\"
  }")

echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
  commitment_hash=$(echo "$response" | grep -o '"commitmentHash":"[^"]*"' | cut -d'"' -f4)
  commit_tx_id=$(echo "$response" | grep -o '"commitTxId":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Test 3 PASSED${NC}"
  echo "Commitment Hash: $commitment_hash"
  echo "Transaction ID: $commit_tx_id"
else
  echo -e "${RED}✗ Test 3 FAILED${NC}"
  exit 1
fi
echo ""

# Test 4: Query commitment status
echo "=========================================="
echo "Test 4: Query Commitment Status"
echo "=========================================="

response=$(curl -s http://localhost:$COORDINATOR_PORT/api/commit/$commitment_hash)
echo "Response: $response"

if echo "$response" | grep -q '"revealed":false'; then
  echo -e "${GREEN}✓ Test 4 PASSED${NC}"
  echo "Commitment exists and not yet revealed"
else
  echo -e "${RED}✗ Test 4 FAILED${NC}"
  exit 1
fi
echo ""

# Test 5: Reveal commitment
echo "=========================================="
echo "Test 5: Reveal Commitment"
echo "=========================================="

# Compute reveal signature
reveal_message="${commitment_hash}${cid}${nonce}"
reveal_sig=$(echo -n "${reveal_message}${device_pubkey}" | openssl dgst -sha256 | awk '{print $2}')

response=$(curl -s -X POST http://localhost:$COORDINATOR_PORT/api/reveal \
  -H "Content-Type: application/json" \
  -d "{
    \"commitmentHash\": \"$commitment_hash\",
    \"cid\": \"$cid\",
    \"nonce\": \"$nonce\",
    \"deviceSig\": \"$reveal_sig\",
    \"devicePubKey\": \"$device_pubkey\"
  }")

echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
  reveal_tx_id=$(echo "$response" | grep -o '"revealTxId":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Test 5 PASSED${NC}"
  echo "Reveal Transaction ID: $reveal_tx_id"
else
  echo -e "${RED}✗ Test 5 FAILED${NC}"
  exit 1
fi
echo ""

# Test 6: Query commitment status after reveal
echo "=========================================="
echo "Test 6: Verify Revealed Status"
echo "=========================================="

response=$(curl -s http://localhost:$COORDINATOR_PORT/api/commit/$commitment_hash)
echo "Response: $response"

if echo "$response" | grep -q '"revealed":true'; then
  echo -e "${GREEN}✓ Test 6 PASSED${NC}"
  echo "Commitment successfully revealed"
else
  echo -e "${RED}✗ Test 6 FAILED${NC}"
  exit 1
fi
echo ""

# Test 7: Try to reveal again (should fail)
echo "=========================================="
echo "Test 7: Duplicate Reveal (Should Fail)"
echo "=========================================="

response=$(curl -s -X POST http://localhost:$COORDINATOR_PORT/api/reveal \
  -H "Content-Type: application/json" \
  -d "{
    \"commitmentHash\": \"$commitment_hash\",
    \"cid\": \"$cid\",
    \"nonce\": \"$nonce\",
    \"deviceSig\": \"$reveal_sig\",
    \"devicePubKey\": \"$device_pubkey\"
  }")

echo "Response: $response"

if echo "$response" | grep -q '"error".*"Already revealed"'; then
  echo -e "${GREEN}✓ Test 7 PASSED${NC}"
  echo "Duplicate reveal correctly rejected"
else
  echo -e "${RED}✗ Test 7 FAILED${NC}"
  exit 1
fi
echo ""

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Details:"
echo "  - CID: $cid"
echo "  - Commitment Hash: $commitment_hash"
echo "  - Commit TX: $commit_tx_id"
echo "  - Reveal TX: $reveal_tx_id"
echo ""
echo "End-to-end commit/reveal flow verified!"
echo ""
echo "Coordinator log available at: /tmp/coordinator.log"
echo ""

exit 0
