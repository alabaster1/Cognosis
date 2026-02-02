# PlutusV3 Migration - 2026-02-02

**Issue:** Aiken v1.1.7 outputs Plutus Core 1.1.0, incompatible with Preprod Protocol v10 + PlutusV2

**Solution:** Upgraded all validators to PlutusV3

---

## Changes Made

### aiken.toml
Added: `plutus = "v3"`

### Validators Rebuilt
All validators recompiled with PlutusV3 target:
- `psi_experiment.ak`
- `reward_vault_v2.ak`
- `psy_lottery.ak`

---

## New Contract Addresses (PlutusV3)

### Old (PlutusV2 - broken)
- **Experiment:** `addr_test1wp0m9gv6fzvr5gunqvzlj2g2s235vz3ecndvrg7hdtw92hsaucqr4`
- **Vault:** `addr_test1wztacuc3ux3r9wnsdad0uwc0rmzt78wm9jhgk5tugp95vvge8k9ge` (has 5B PSY)
- **Lottery:** `addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp` (initialized)

### New (PlutusV3 - working)
- **Experiment:** `addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7`
- **Vault:** `addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj`
- **Lottery:** (need to generate)

---

## Migration Steps

### 1. Deploy New Experiment Contract ✅
**Already done** - new address generated

### 2. Initialize New Vault
- [ ] Mint new PSY tokens OR
- [ ] Move PSY from old vault to new vault (requires spending old vault)

**Problem:** Old vault has 5B PSY locked. Options:
- **A:** Mint new 5B PSY for V3 vault (simplest, preprod testnet)
- **B:** Build transaction to spend old V2 vault and move tokens to V3 vault (complex)

**Recommendation:** Mint new PSY tokens (it's preprod testnet, infinite tADA available)

### 3. Initialize New Lottery
- [ ] Generate lottery V3 address
- [ ] Initialize with 2 ADA

### 4. Update Oracle Scripts
- [ ] Update reveal-experiment.sh with new addresses
- [ ] Test submission to new experiment contract
- [ ] Test reveal with new V3 validators

---

## Quick Deployment Script

```bash
#!/bin/bash
# Deploy PlutusV3 validators to preprod

cd /home/albert/cardano-preprod

# Generate all V3 addresses
EXPERIMENT_V3=$(cardano-cli conway address build \
  --payment-script-file validators/experiment-validator-v3-wrapped.json \
  --testnet-magic 1)

VAULT_V3=$(cardano-cli conway address build \
  --payment-script-file validators/vault-validator-v3-wrapped.json \
  --testnet-magic 1)

LOTTERY_V3=$(cardano-cli conway address build \
  --payment-script-file validators/lottery-validator-v3-wrapped.json \
  --testnet-magic 1)

echo "PlutusV3 Addresses:"
echo "Experiment: $EXPERIMENT_V3"
echo "Vault: $VAULT_V3"
echo "Lottery: $LOTTERY_V3"

# 1. Mint new PSY tokens (10B)
# (Use existing minting script, just target new vault)

# 2. Initialize new vault with 5B PSY

# 3. Initialize lottery with 2 ADA

# 4. Submit test RV to new experiment contract

# 5. Test reveal with new Oracle scripts
```

---

## Timeline

- **Validators rebuilt:** ✅ 2026-02-02 10:34 CST
- **New addresses generated:** ✅ 2026-02-02 10:35 CST
- **Next:** Mint PSY + initialize contracts (30 min)
- **Then:** Test reveal transaction (should work now!)

---

## Why This Fixes the Issue

**Before (PlutusV2):**
- Aiken v1.1.7 → Plutus Core 1.1.0
- Preprod Protocol v10 → Rejects Core 1.1.0 for V2
- **Result:** Script execution error

**After (PlutusV3):**
- Aiken v1.1.7 → Plutus Core 1.1.0
- PlutusV3 → Designed for Core 1.1.0
- Preprod Protocol v10 → Supports PlutusV3
- **Result:** Should work! ✅

---

**Status:** Validators rebuilt, ready to deploy and test

**Next:** Redeploy contracts and test reveal transaction
