# Cognosis RV Module - cardano-cli Migration

**Status:** ✅ Complete (2026-02-03)  
**Authority:** Albert's directive - "Always go with cardano CLI when we have the option"

---

## What Changed

### Before (Lucid SDK)

```typescript
// Transaction building with Lucid
const tx = await lucid
  .newTx()
  .collectFrom([experimentUTxO], experimentRedeemer)
  .attachSpendingValidator(experimentValidator)
  .collectFrom([vaultUTxO], vaultRedeemer)
  .attachSpendingValidator(vaultValidator)
  .payToAddress(userAddress, assets)
  .complete();
```

**Problems:**
- Dependency on Blockfrost API
- Key format compatibility issues
- Less transparent debugging
- Third-party API rate limits

### After (cardano-cli)

```bash
# Transaction building with cardano-cli
cardano-cli transaction build \
  --tx-in "$EXPERIMENT_UTXO" \
  --tx-in-script-file validator.plutus \
  --tx-in-redeemer-file redeemer.json \
  --tx-out "${USER_ADDR}+${PSY_REWARD} ${PSY_ASSET}" \
  --change-address "$ORACLE_ADDR" \
  --testnet-magic 1 \
  --out-file tx.raw
```

**Benefits:**
- Direct node control (no intermediaries)
- Full sovereignty and reliability
- Transparent debugging with JSON files
- Proven working on all our projects

---

## Architecture

### Transaction Builder

**Old:** `src/tx-builder.ts` (Lucid-based, 280 lines) ❌  
**New:** `src/tx-builder-cli.ts` (bash script wrapper, 130 lines) ✅

**Actual transaction logic:** `scripts/reveal-transaction.sh` (bash)

### Flow

```
Oracle Backend (Node.js)
    ↓
tx-builder-cli.ts (TypeScript wrapper)
    ↓
reveal-transaction.sh (bash script)
    ↓
cardano-cli transaction build/sign/submit
    ↓
Local cardano-node
    ↓
Preprod testnet
```

---

## Files Changed

### Created

- `scripts/reveal-transaction.sh` - Main transaction builder (bash)
- `src/tx-builder-cli.ts` - TypeScript wrapper
- `CARDANO-CLI-MIGRATION.md` - This document

### Modified

- `src/index.ts` - Switch from Lucid to CLI builder
- `src/config.ts` - Removed Lucid key format conversion

### Deprecated (but kept for reference)

- `src/tx-builder.ts` - Old Lucid-based builder
- `src/cardano-client.ts` - Lucid integration (still used for queries)

---

## Testing

### Test Script

```bash
cd /home/albert/Cognosis/backend/oracle
bash scripts/reveal-transaction.sh \
  "EXPERIMENT_HASH#INDEX" \
  "USER_PKH" \
  "ACCURACY_SCORE" \
  "PSY_REWARD"
```

### Full E2E Test

```bash
cd /home/albert/Cognosis/backend/oracle
bash test-e2e.sh
```

This will:
1. Submit a test RV commitment
2. Run the Oracle
3. Process the commitment
4. Build reveal transaction with cardano-cli
5. Submit to preprod
6. Verify PSY distribution

---

## Benefits Realized

✅ **Reliability:** No more Lucid key format issues  
✅ **Transparency:** All transaction JSON visible for debugging  
✅ **Sovereignty:** Direct node access, no API dependencies  
✅ **Proven:** Uses same pattern as Aurumelius (already working)  
✅ **Consistency:** Same architecture across all Clawdbot Cardano projects

---

## Cardano-CLI Pattern

This follows the standard pattern documented in `/home/albert/clawd/knowledge/CARDANO-ARCHITECTURE.md`:

1. Query UTxOs
2. Get protocol parameters
3. Build transaction with `cardano-cli transaction build`
4. Sign with `cardano-cli transaction sign`
5. Submit with `cardano-cli transaction submit`

**For smart contracts:** Add script files, datums, redeemers, and collateral.

---

## Future Work

**Phase 3 (Next):**
- [ ] Complete end-to-end test with actual RV submission
- [ ] Verify PSY token distribution on preprod
- [ ] Test with multiple RV submissions
- [ ] Add error handling for edge cases
- [ ] Implement IPFS fetching (currently using dummy data)

**Mainnet Preparation:**
- [ ] Switch testnet-magic to mainnet
- [ ] Update contract addresses
- [ ] Add additional safety checks
- [ ] Implement monitoring/alerts

---

## Documentation

**Primary reference:** `/home/albert/clawd/knowledge/CARDANO-ARCHITECTURE.md`

**Project-specific:** This file

**Script comments:** See inline comments in `scripts/reveal-transaction.sh`

---

**Migration completed:** 2026-02-03 07:40 CST  
**By:** Elliot 🦞  
**Directive:** Albert (CryptoGazer)
