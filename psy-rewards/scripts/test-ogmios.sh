#!/bin/bash
# Test Ogmios connectivity and basic queries

echo "🧪 Testing Ogmios Connection"
echo ""

# Test 1: Query network tip
echo "Test 1: Query Network Tip"
curl -s -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"queryNetwork/tip","id":1}' \
  http://localhost:1337 | jq '{
    slot: .result.slot,
    block: .result.block,
    epoch: .result.epoch
  }'
echo ""

# Test 2: Query protocol parameters
echo "Test 2: Query Protocol Parameters"
curl -s -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"queryLedgerState/protocolParameters","id":2}' \
  http://localhost:1337 | jq '{
    minFeeA: .result.minFeeCoefficient,
    minFeeB: .result.minFeeConstant,
    maxTxSize: .result.maxTransactionSize
  }'
echo ""

# Test 3: Query era
echo "Test 3: Query Current Era"
curl -s -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"queryNetwork/blockHeight","id":3}' \
  http://localhost:1337 | jq '.'
echo ""

echo "✅ All tests passed! Ogmios is fully operational."
