# Compact Contract Sanity Test Plan

## Overview
Manual test plan for verifying the Midnight Compact contract functionality.

## Prerequisites
- Midnight testnet account with tokens
- Contract deployed to testnet
- `midnight-cli` installed and configured

## Test Cases

### 1. Contract Deployment

**Steps:**
```bash
# Compile contract
midnight-cli compile blockchain/compact/psi_commit.compact.ts

# Deploy to testnet
midnight-cli deploy \
  --network testnet \
  --contract psi_commit \
  --gas-limit 5000000
```

**Expected Result:**
- Contract compiles without errors
- Deployment succeeds
- Contract address returned
- Events emitted

**Verification:**
```bash
midnight-cli query contract <contract-address> --method getTotalCommitments
# Should return: 0
```

---

### 2. Create Commitment

**Test Data:**
```
commitmentHash: 0xabc123... (SHA256 of CID||metadata||nonce)
metadataHash: 0xdef456... (SHA256 of metadata)
revealWindow: current_block + 100
accessPolicy: { publicRead: false, authorizedKeys: [your_pubkey], requireProof: false }
```

**Steps:**
```bash
midnight-cli tx \
  --contract <contract-address> \
  --method commit \
  --args commitmentHash=0xabc123...,metadataHash=0xdef456...,revealWindow=<current_block+100>,accessPolicy='{"publicRead":false,"authorizedKeys":["<your_pubkey>"],"requireProof":false}' \
  --from <your-wallet>
```

**Expected Result:**
- Transaction succeeds
- `CommitmentCreated` event emitted
- Commitment stored on-chain

**Verification:**
```bash
midnight-cli query contract <contract-address> \
  --method getCommitment \
  --args commitmentHash=0xabc123...

# Should return:
# {
#   commitmentHash: "0xabc123...",
#   metadataHash: "0xdef456...",
#   participant: "<your-address>",
#   revealWindow: <block-number>,
#   timestamp: <timestamp>,
#   revealed: false,
#   ...
# }
```

---

### 3. Query Commitment (Access Control)

**Test 3a: Query as participant (should succeed)**
```bash
midnight-cli query contract <contract-address> \
  --method getCommitment \
  --args commitmentHash=0xabc123... \
  --from <your-wallet>
```

**Expected:** Returns full commitment record

**Test 3b: Query as unauthorized user (should fail)**
```bash
midnight-cli query contract <contract-address> \
  --method getCommitment \
  --args commitmentHash=0xabc123... \
  --from <different-wallet>
```

**Expected:** Error: "Access denied"

---

### 4. Reveal Commitment (Before Reveal Window)

**Steps:**
```bash
# Try to reveal before reveal window opens
midnight-cli tx \
  --contract <contract-address> \
  --method reveal \
  --args commitmentHash=0xabc123...,cid=bafybeig...,nonce=0x789...,signature=0xsig... \
  --from <your-wallet>
```

**Expected Result:**
- Transaction fails with error: "Reveal window not open yet"

---

### 5. Reveal Commitment (After Reveal Window)

**Steps:**
```bash
# Wait for reveal window to open (100 blocks)
# Then reveal

midnight-cli tx \
  --contract <contract-address> \
  --method reveal \
  --args commitmentHash=0xabc123...,cid=bafybeig...,nonce=0x789...,signature=0xsig... \
  --from <your-wallet>
```

**Expected Result:**
- Transaction succeeds
- `CommitmentRevealed` event emitted
- Commitment marked as revealed

**Verification:**
```bash
midnight-cli query contract <contract-address> \
  --method getCommitment \
  --args commitmentHash=0xabc123...

# Should now show:
# {
#   ...
#   revealed: true,
#   revealedCID: "bafybeig...",
#   revealedNonce: "0x789...",
#   ...
# }
```

---

### 6. Reveal Verification (Hash Mismatch)

**Steps:**
```bash
# Try to reveal with incorrect CID that doesn't match commitment
midnight-cli tx \
  --contract <contract-address> \
  --method reveal \
  --args commitmentHash=0xabc123...,cid=bafyWRONG...,nonce=0x789...,signature=0xsig... \
  --from <your-wallet>
```

**Expected Result:**
- Transaction fails with error: "Reveal does not match commitment"

---

### 7. Submit Score with ZK Proof

**Test Data:**
```
commitmentHash: 0xabc123... (previously revealed)
score: 7500 (75.00%)
scoringModuleHash: 0xscoring123...
zkProof: <proof-object>
dpProof: null
```

**Steps:**
```bash
midnight-cli tx \
  --contract <contract-address> \
  --method scoreAndProve \
  --args commitmentHash=0xabc123...,score=7500,scoringModuleHash=0xscoring123...,zkProof=<proof>,dpProof=null \
  --from <authorized-scorer-wallet>
```

**Expected Result:**
- Transaction succeeds
- `ScoreProofSubmitted` event emitted
- Score and proof stored

**Verification:**
```bash
midnight-cli query contract <contract-address> \
  --method getCommitment \
  --args commitmentHash=0xabc123...

# Should show:
# {
#   ...
#   scoreProofId: "0xproof123...",
#   ...
# }
```

---

### 8. Query Participant Commitments

**Steps:**
```bash
midnight-cli query contract <contract-address> \
  --method getParticipantCommitments \
  --args participant=<your-address>
```

**Expected Result:**
- Returns array of commitment hashes
- Includes all commitments created by participant

---

### 9. Query Total Commitments

**Steps:**
```bash
midnight-cli query contract <contract-address> \
  --method getTotalCommitments
```

**Expected Result:**
- Returns total count of commitments
- Should match number of created commitments

---

### 10. Duplicate Commitment

**Steps:**
```bash
# Try to create commitment with same hash
midnight-cli tx \
  --contract <contract-address> \
  --method commit \
  --args commitmentHash=0xabc123...,... \
  --from <your-wallet>
```

**Expected Result:**
- Transaction fails with error: "Commitment already exists"

---

### 11. Double Reveal

**Steps:**
```bash
# Try to reveal already revealed commitment
midnight-cli tx \
  --contract <contract-address> \
  --method reveal \
  --args commitmentHash=0xabc123...,... \
  --from <your-wallet>
```

**Expected Result:**
- Transaction fails with error: "Already revealed"

---

### 12. Unauthorized Reveal

**Steps:**
```bash
# Try to reveal another user's commitment
midnight-cli tx \
  --contract <contract-address> \
  --method reveal \
  --args commitmentHash=<other-user-commitment>... \
  --from <your-wallet>
```

**Expected Result:**
- Transaction fails with error: "Only participant can reveal"

---

## Gas Usage Analysis

Track gas usage for each operation:

| Operation | Expected Gas | Actual Gas | Notes |
|-----------|--------------|------------|-------|
| commit() | ~200k | | |
| reveal() | ~150k | | |
| scoreAndProve() | ~250k | | Includes proof verification |
| getCommitment() | ~10k | | Read-only |
| getParticipantCommitments() | ~20k | | Read-only, varies by count |

---

## Event Verification

Verify all events are emitted correctly:

```bash
# Query contract events
midnight-cli query events \
  --contract <contract-address> \
  --event-type CommitmentCreated \
  --from-block <start> \
  --to-block <end>
```

**Expected Events:**
1. `CommitmentCreated` - When commitment created
2. `CommitmentRevealed` - When revealed
3. `ScoreProofSubmitted` - When score submitted

---

## Edge Cases

### E1: Zero Score
```bash
# Submit score of 0 (0%)
midnight-cli tx --method scoreAndProve --args score=0,...
```
**Expected:** Succeeds

### E2: Maximum Score
```bash
# Submit score of 10000 (100%)
midnight-cli tx --method scoreAndProve --args score=10000,...
```
**Expected:** Succeeds

### E3: Invalid Score
```bash
# Submit score > 10000
midnight-cli tx --method scoreAndProve --args score=10001,...
```
**Expected:** Fails with "Score out of range"

### E4: Score Before Reveal
```bash
# Try to submit score before revealing
midnight-cli tx --method scoreAndProve --args commitmentHash=<unrevealed>,...
```
**Expected:** Fails with "Commitment not revealed yet"

---

## Performance Tests

### P1: Bulk Commitments
Create 100 commitments sequentially and measure:
- Time per commitment
- Gas cost per commitment
- Total storage size

### P2: Concurrent Reveals
Reveal 10 commitments in parallel and measure:
- Success rate
- Average time
- Gas cost variation

---

## Checklist

- [ ] Contract compiles without errors
- [ ] Contract deploys successfully
- [ ] All test cases pass
- [ ] Events emitted correctly
- [ ] Access control enforced
- [ ] Gas usage within acceptable range
- [ ] Edge cases handled correctly
- [ ] No security vulnerabilities
- [ ] Documentation complete

---

## Notes

Record any issues or unexpected behavior:

```
Date: ___________
Tester: ___________

Issues found:
1.
2.
3.

Recommendations:
1.
2.
3.
```

---

## Test Automation Script

```bash
#!/bin/bash
# Run all sanity tests

CONTRACT_ADDRESS=$1

echo "Running Compact Contract Sanity Tests..."

# Test 1: Query initial state
echo "Test 1: Initial state"
midnight-cli query contract $CONTRACT_ADDRESS --method getTotalCommitments

# Test 2: Create commitment
echo "Test 2: Create commitment"
# ... add commands

# Continue for all tests
```

Save as: `tests/run_compact_tests.sh`
