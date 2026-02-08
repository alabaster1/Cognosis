#!/bin/bash
# Manual End-to-End RV Test
# Step-by-step with clear instructions

set -e

echo "🧪 Cognosis RV Module - End-to-End Test"
echo "========================================"
echo

# Environment
export CARDANO_NODE_SOCKET_PATH=~/cardano-preprod/socket/node.socket
TESTNET="--testnet-magic 1"

# Wallet paths
USER_ADDR=$(cat ~/cardano-preprod/wallet/payment.addr)
USER_SKEY=~/cardano-preprod/wallet/payment.skey
USER_VKEY=~/cardano-preprod/wallet/payment.vkey

# Contract addresses (PlutusV3)
EXPERIMENT_ADDR="addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7"
VAULT_ADDR="addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj"

echo "📍 Configuration:"
echo "   User: $USER_ADDR"
echo "   Experiment: $EXPERIMENT_ADDR"
echo "   Vault: $VAULT_ADDR"
echo

# Step 1: Check balances
echo "1️⃣ Checking balances..."
echo
echo "User wallet:"
cardano-cli query utxo --address "$USER_ADDR" $TESTNET | head -10
echo
echo "Vault:"
cardano-cli query utxo --address "$VAULT_ADDR" $TESTNET | head -10
echo

# Step 2: Create test RV prediction
echo "2️⃣ Creating test RV prediction..."
cat > /tmp/rv-prediction.txt <<EOF
I see a large coastal structure, possibly a lighthouse.
There is water - ocean or large lake - with blue and white colors.
The structure is tall and cylindrical.
There's a sense of openness and the location feels temperate.
I detect gray stone or concrete in the construction.
EOF

echo "   ✅ Prediction created:"
cat /tmp/rv-prediction.txt
echo

# Step 3: Build experiment datum
echo "3️⃣ Building experiment datum..."

# Get user PKH
USER_PKH=$(cardano-cli address key-hash --payment-verification-key-file "$USER_VKEY")
echo "   User PKH: $USER_PKH"

# Mock IPFS hash
IPFS_HASH="QmTestRV12345678"
TIMESTAMP=$(date +%s)

# Convert strings to hex
IPFS_HEX=$(echo -n "$IPFS_HASH" | xxd -p | tr -d '\n')
RV_HEX=$(echo -n "RV" | xxd -p | tr -d '\n')
TARGET_HEX=$(echo -n "Coastal lighthouse" | xxd -p | tr -d '\n')

# Build datum (Constr 0): [user_pkh, ipfs_hash, timestamp, experiment_type, target_description]
cat > /tmp/experiment-datum.json <<EOF
{
  "constructor": 0,
  "fields": [
    {"bytes": "$USER_PKH"},
    {"bytes": "$IPFS_HEX"},
    {"int": $TIMESTAMP},
    {"bytes": "$RV_HEX"},
    {"bytes": "$TARGET_HEX"}
  ]
}
EOF

echo "   ✅ Datum created"
echo

# Step 4: Submit commitment transaction
echo "4️⃣ Submitting RV commitment..."

# Get protocol parameters
cardano-cli query protocol-parameters $TESTNET --out-file /tmp/protocol.json

# Get user UTxO
cardano-cli query utxo --address "$USER_ADDR" $TESTNET --out-file /tmp/user-utxos.json

UTXO=$(jq -r 'to_entries | sort_by(.value.value.lovelace) | reverse | .[0].key' /tmp/user-utxos.json)
UTXO_HASH=$(echo "$UTXO" | cut -d'#' -f1)
UTXO_IX=$(echo "$UTXO" | cut -d'#' -f2)
UTXO_LOVELACE=$(jq -r --arg utxo "$UTXO" '.[$utxo].value.lovelace' /tmp/user-utxos.json)

echo "   Using UTxO: ${UTXO_HASH}#${UTXO_IX} ($((UTXO_LOVELACE / 1000000)) ADA)"

# Build transaction
cardano-cli latest transaction build \
  --tx-in "${UTXO_HASH}#${UTXO_IX}" \
  --tx-out "${EXPERIMENT_ADDR}+5000000" \
  --tx-out-inline-datum-file /tmp/experiment-datum.json \
  --change-address "$USER_ADDR" \
  $TESTNET \
  --out-file /tmp/commitment-tx.raw

# Sign transaction
cardano-cli latest transaction sign \
  --tx-body-file /tmp/commitment-tx.raw \
  --signing-key-file "$USER_SKEY" \
  $TESTNET \
  --out-file /tmp/commitment-tx.signed

# Submit transaction
cardano-cli latest transaction submit --tx-file /tmp/commitment-tx.signed $TESTNET

COMMITMENT_TX=$(cardano-cli latest transaction txid --tx-file /tmp/commitment-tx.signed)
echo "   ✅ Commitment submitted!"
echo "   TX: $COMMITMENT_TX"
echo "   🔗 https://preprod.cardanoscan.io/transaction/$COMMITMENT_TX"
echo

# Step 5: Wait for confirmation
echo "5️⃣ Waiting for confirmation (30 seconds)..."
sleep 30
echo "   ✅ Should be confirmed"
echo

# Step 6: Verify experiment UTxO exists
echo "6️⃣ Verifying experiment UTxO..."
cardano-cli query utxo --address "$EXPERIMENT_ADDR" $TESTNET
echo

# Step 7: Run Oracle
echo "7️⃣ Running Oracle processor..."
echo "   (This will detect the commitment, score it with AI, and submit reveal tx)"
echo

cd /home/albert/Cognosis/backend/oracle

# Build first
echo "   Building TypeScript..."
npm run build > /dev/null 2>&1

# Run oracle (60 second timeout)
echo "   Starting Oracle..."
timeout 60 node dist/index.js || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo
        echo "   ⏱️ Oracle timeout (expected)"
    else
        echo
        echo "   ⚠️ Oracle exited with code $EXIT_CODE"
    fi
}

echo
echo "========================================="
echo "✅ End-to-End Test Complete!"
echo "========================================="
echo
echo "Check the output above for:"
echo "  - Commitment transaction hash"
echo "  - Oracle processing logs"
echo "  - Reveal transaction hash (if successful)"
echo
echo "To verify PSY rewards, check user wallet:"
echo "  cardano-cli query utxo --address $USER_ADDR --testnet-magic 1"
