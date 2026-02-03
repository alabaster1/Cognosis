#!/bin/bash
# Build and submit RV reveal transaction using cardano-cli
# Spends experiment UTxO + vault UTxO, distributes PSY rewards

set -e

# Arguments
EXPERIMENT_UTXO="$1"  # Format: hash#index
USER_PKH="$2"
ACCURACY_SCORE="$3"
PSY_REWARD="$4"

if [ -z "$EXPERIMENT_UTXO" ] || [ -z "$USER_PKH" ] || [ -z "$ACCURACY_SCORE" ] || [ -z "$PSY_REWARD" ]; then
    echo "Usage: $0 <experiment_utxo> <user_pkh> <accuracy_score> <psy_reward>"
    exit 1
fi

# Environment
export CARDANO_NODE_SOCKET_PATH=~/cardano-preprod/socket/node.socket
TESTNET="--testnet-magic 1"

# Paths
ORACLE_SKEY=~/cardano-preprod/oracle/payment.skey
ORACLE_ADDR=$(cat ~/cardano-preprod/oracle/payment.addr)
VALIDATORS_DIR=~/cardano-preprod/validators

# Contract addresses
EXPERIMENT_ADDR="addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7"
VAULT_ADDR="addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj"
LOTTERY_ADDR="addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4"

echo "🔨 Building RV Reveal Transaction"
echo "=================================="
echo "  Experiment UTxO: $EXPERIMENT_UTXO"
echo "  User PKH: $USER_PKH"
echo "  Accuracy: $ACCURACY_SCORE%"
echo "  PSY Reward: $PSY_REWARD"
echo

# Step 1: Query vault UTxO
echo "1️⃣ Querying vault UTxO..."
cardano-cli query utxo --address "$VAULT_ADDR" $TESTNET --out-file /tmp/vault-utxos.json

VAULT_UTXO=$(jq -r 'to_entries | .[0].key' /tmp/vault-utxos.json)
VAULT_LOVELACE=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].value.lovelace' /tmp/vault-utxos.json)
PSY_ASSET=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].value | to_entries | .[] | select(.key != "lovelace") | .key' /tmp/vault-utxos.json)

# Get PSY balance (extract from nested token structure)
PSY_TOKEN_NAME=$(jq -r --arg utxo "$VAULT_UTXO" --arg asset "$PSY_ASSET" '.[$utxo].value[$asset] | to_entries | .[0].key' /tmp/vault-utxos.json)
PSY_BALANCE=$(jq -r --arg utxo "$VAULT_UTXO" --arg asset "$PSY_ASSET" --arg token "$PSY_TOKEN_NAME" '.[$utxo].value[$asset][$token]' /tmp/vault-utxos.json)

echo "   Vault UTxO: $VAULT_UTXO"
echo "   PSY Asset: $PSY_ASSET"
echo "   PSY Balance: $PSY_BALANCE"
echo

# Step 2: Parse vault datum
echo "2️⃣ Parsing vault datum..."
VAULT_DATUM_CBOR=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatumRaw' /tmp/vault-utxos.json)
CLAIMS_COUNT=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[9].int' /tmp/vault-utxos.json)

NEW_PSY_BALANCE=$((PSY_BALANCE - PSY_REWARD))
NEW_CLAIMS_COUNT=$((CLAIMS_COUNT + 1))

echo "   Current claims: $CLAIMS_COUNT"
echo "   New PSY balance: $NEW_PSY_BALANCE"
echo "   New claims count: $NEW_CLAIMS_COUNT"
echo

# Step 3: Build updated vault datum
echo "3️⃣ Building updated vault datum..."

# Parse existing vault datum fields
PSY_POLICY=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[0].bytes' /tmp/vault-utxos.json)
PSY_NAME=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[1].bytes' /tmp/vault-utxos.json)
BASE_REWARD=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[2].int' /tmp/vault-utxos.json)
MAX_REWARD=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[3].int' /tmp/vault-utxos.json)
STEEPNESS=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[4].int' /tmp/vault-utxos.json)
LOOKUP_DENOM=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[5].int' /tmp/vault-utxos.json)
ORACLE_PKH=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[6].bytes' /tmp/vault-utxos.json)
EXPERIMENT_HASH=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[7].bytes' /tmp/vault-utxos.json)
LOTTERY_HASH=$(jq -r --arg utxo "$VAULT_UTXO" '.[$utxo].inlineDatum.fields[8].bytes' /tmp/vault-utxos.json)

cat > /tmp/new-vault-datum.json <<EOF
{
  "constructor": 0,
  "fields": [
    {"bytes": "$PSY_POLICY"},
    {"bytes": "$PSY_NAME"},
    {"int": $BASE_REWARD},
    {"int": $MAX_REWARD},
    {"int": $STEEPNESS},
    {"int": $LOOKUP_DENOM},
    {"bytes": "$ORACLE_PKH"},
    {"bytes": "$EXPERIMENT_HASH"},
    {"bytes": "$LOTTERY_HASH"},
    {"int": $NEW_CLAIMS_COUNT}
  ]
}
EOF

echo "   ✅ New vault datum created"
echo

# Step 4: Build experiment redeemer (Reveal)
echo "4️⃣ Building experiment redeemer..."
AI_MODEL_HEX=$(echo -n "gpt-4" | xxd -p | tr -d '\n')

cat > /tmp/experiment-redeemer.json <<EOF
{
  "constructor": 0,
  "fields": [
    {"int": $ACCURACY_SCORE},
    {"bytes": "$AI_MODEL_HEX"}
  ]
}
EOF

echo "   ✅ Experiment redeemer (Reveal) created"
echo

# Step 5: Build vault redeemer (ClaimReward)
echo "5️⃣ Building vault redeemer..."

cat > /tmp/vault-redeemer.json <<EOF
{
  "constructor": 0,
  "fields": [
    {"bytes": "$USER_PKH"},
    {"int": $ACCURACY_SCORE}
  ]
}
EOF

echo "   ✅ Vault redeemer (ClaimReward) created"
echo

# Step 6: Derive user address from PKH using cardano-cli
echo "6️⃣ Deriving user address..."

# Create temporary payment verification key from PKH (for address derivation)
# This is a workaround - ideally we'd have the user's actual address
# For now, we'll construct a payment-only address on preprod
USER_ADDR=$(cardano-cli address build --payment-verification-key-hash "$USER_PKH" --testnet-magic 1)

echo "   User address: $USER_ADDR"
echo

# Step 7: Get Oracle collateral
echo "7️⃣ Getting Oracle collateral..."
cardano-cli query utxo --address "$ORACLE_ADDR" $TESTNET --out-file /tmp/oracle-utxos.json

# Find a suitable collateral (pure ADA, >= 5 ADA)
COLLATERAL_UTXO=$(jq -r 'to_entries | map(select(.value.value.lovelace >= 5000000)) | .[0].key' /tmp/oracle-utxos.json)

if [ "$COLLATERAL_UTXO" == "null" ] || [ -z "$COLLATERAL_UTXO" ]; then
    echo "   ❌ No suitable collateral found (need >= 5 ADA pure UTxO)"
    exit 1
fi

echo "   Collateral: $COLLATERAL_UTXO"
echo

# Step 8: Get protocol parameters
echo "8️⃣ Fetching protocol parameters..."
cardano-cli query protocol-parameters $TESTNET --out-file /tmp/protocol.json
echo "   ✅ Parameters fetched"
echo

# Step 9: Build transaction
echo "9️⃣ Building transaction..."

cardano-cli latest transaction build \
  --tx-in "$EXPERIMENT_UTXO" \
  --tx-in-script-file "$VALIDATORS_DIR/experiment-validator-v3.plutus" \
  --tx-in-inline-datum-present \
  --tx-in-redeemer-file /tmp/experiment-redeemer.json \
  --tx-in "$VAULT_UTXO" \
  --tx-in-script-file "$VALIDATORS_DIR/vault-validator-v3.plutus" \
  --tx-in-inline-datum-present \
  --tx-in-redeemer-file /tmp/vault-redeemer.json \
  --tx-in-collateral "$COLLATERAL_UTXO" \
  --tx-out "${USER_ADDR}+2000000+${PSY_REWARD} ${PSY_ASSET}.${PSY_TOKEN_NAME}" \
  --tx-out "${LOTTERY_ADDR}+10000000" \
  --tx-out "${VAULT_ADDR}+${VAULT_LOVELACE}+${NEW_PSY_BALANCE} ${PSY_ASSET}.${PSY_TOKEN_NAME}" \
  --tx-out-inline-datum-file /tmp/new-vault-datum.json \
  --required-signer-hash $(cardano-cli address key-hash --payment-verification-key-file ~/cardano-preprod/oracle/payment.vkey) \
  --change-address "$ORACLE_ADDR" \
  $TESTNET \
  --out-file /tmp/reveal-tx.raw

echo "   ✅ Transaction built"
echo

# Step 10: Sign transaction
echo "🔟 Signing transaction..."
cardano-cli latest transaction sign \
  --tx-body-file /tmp/reveal-tx.raw \
  --signing-key-file "$ORACLE_SKEY" \
  $TESTNET \
  --out-file /tmp/reveal-tx.signed

echo "   ✅ Transaction signed"
echo

# Step 11: Submit transaction
echo "1️⃣1️⃣ Submitting transaction..."
TX_HASH=$(cardano-cli latest transaction submit --tx-file /tmp/reveal-tx.signed $TESTNET 2>&1)

if echo "$TX_HASH" | grep -q "successfully submitted"; then
    ACTUAL_TX_HASH=$(cardano-cli latest transaction txid --tx-file /tmp/reveal-tx.signed)
    echo "   ✅ Transaction submitted!"
    echo
    echo "=================================="
    echo "✅ REVEAL TRANSACTION COMPLETE"
    echo "=================================="
    echo
    echo "Transaction ID: $ACTUAL_TX_HASH"
    echo "🔗 https://preprod.cardanoscan.io/transaction/$ACTUAL_TX_HASH"
    echo
    echo "Rewards distributed:"
    echo "  - User: $PSY_REWARD PSY"
    echo "  - Lottery: 10 ADA"
    echo "  - Vault: $NEW_PSY_BALANCE PSY remaining"
    echo
else
    echo "   ❌ Submission failed:"
    echo "$TX_HASH"
    exit 1
fi
