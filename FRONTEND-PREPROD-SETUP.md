# Cognosis Frontend - Preprod Setup Guide

**Status:** Ready for testing  
**Network:** Cardano Preprod Testnet

---

## Quick Start

### 1. Install Wallet (if not installed)

**Recommended:** Eternl or Nami wallet

**Eternl:**
- Install: https://eternl.io/
- Create new wallet or restore existing
- **Switch to Preprod network** in wallet settings

**Nami:**
- Install: https://namiwallet.io/
- Create wallet
- Switch to Preprod (Settings → Network → Preprod)

### 2. Get Test ADA

Visit Cardano Preprod Faucet:
- https://docs.cardano.org/cardano-testnet/tools/faucet/

Enter your preprod address (starts with `addr_test1...`)  
Receive 10,000 tADA (test ADA)

### 3. Run Cognosis Frontend

```bash
cd /home/albert/Cognosis
npm run dev
```

Open: http://localhost:3000

### 4. Connect Wallet

1. Click "Connect Wallet"
2. Select your wallet (Eternl/Nami)
3. Approve connection
4. **Verify:** Address should start with `addr_test1...` (preprod)

### 5. Submit RV Test

1. Navigate to Remote Viewing page
2. Enter prediction (describe what you "see")
3. Click Submit
4. Approve transaction (5 ADA will be locked)
5. Wait for confirmation (~30 seconds)

### 6. Oracle Processes

The Oracle backend (running separately) will:
1. Detect your commitment on-chain
2. Score your prediction with GPT-4
3. Submit reveal transaction
4. Send PSY tokens to your wallet

---

## Configuration

### Environment Variables

Create `.env.local` (if not exists):

```bash
# Blockfrost Preprod API Key
NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL

# Optional: Oracle backend URL (for status checks)
NEXT_PUBLIC_ORACLE_URL=http://localhost:3001
```

### Contract Addresses (Preprod)

Already configured in code:

```typescript
// src/services/rvCardanoService.ts
const EXPERIMENT_CONTRACT = "addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7";
const VAULT_CONTRACT = "addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj";
const LOTTERY_CONTRACT = "addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4";
```

---

## Testing Checklist

### ✅ Pre-Flight

- [ ] Wallet installed and configured for Preprod
- [ ] Test ADA in wallet (at least 10 tADA)
- [ ] Blockfrost API key set in `.env.local`
- [ ] Frontend running (`npm run dev`)
- [ ] Oracle backend running (separate terminal)

### ✅ RV Submission Flow

- [ ] Connect wallet successfully
- [ ] Wallet shows preprod network (addr_test1...)
- [ ] Submit RV prediction
- [ ] Transaction appears in wallet for approval
- [ ] Transaction confirms (check CardanoScan preprod)
- [ ] Experiment UTxO appears at experiment contract

**Check on-chain:**
```bash
export CARDANO_NODE_SOCKET_PATH=~/cardano-preprod/socket/node.socket
cardano-cli query utxo \
  --address addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7 \
  --testnet-magic 1
```

### ✅ Oracle Processing

- [ ] Oracle detects commitment (check backend logs)
- [ ] AI scoring completes (GPT-4)
- [ ] Reveal transaction submitted
- [ ] PSY tokens received in wallet

**Check wallet for PSY:**
```bash
cardano-cli query utxo \
  --address $(cat ~/cardano-preprod/wallet/payment.addr) \
  --testnet-magic 1
```

Look for tokens with policy ID: `52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e`

---

## Common Issues

### Wallet Won't Connect

**Issue:** "Wallet not found" error  
**Fix:** 
1. Refresh page
2. Check wallet extension is enabled
3. Try different wallet (Eternl vs Nami)

### Wrong Network

**Issue:** Address starts with `addr1...` (mainnet)  
**Fix:** Switch wallet to Preprod network in settings

### Transaction Fails

**Issue:** "Insufficient funds" or "Min UTxO" error  
**Fix:**
1. Ensure at least 10 tADA in wallet
2. Try requesting more from faucet
3. Check wallet is on Preprod (not mainnet)

### Oracle Not Processing

**Issue:** Commitment submitted but no reveal  
**Fix:**
1. Check Oracle backend is running:
   ```bash
   cd /home/albert/Cognosis/backend/oracle
   npm start
   ```
2. Check Oracle logs for errors
3. Verify experiment UTxO exists on-chain (see command above)

---

## Links

**CardanoScan Preprod Explorer:**
- https://preprod.cardanoscan.io/

**Check your transactions:**
- https://preprod.cardanoscan.io/address/YOUR_ADDRESS

**Check contracts:**
- Experiment: https://preprod.cardanoscan.io/address/addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
- Vault: https://preprod.cardanoscan.io/address/addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj

---

## Next Steps After Testing

Once preprod testing is complete:

1. **Mainnet Deployment:**
   - Deploy contracts to mainnet
   - Update contract addresses in code
   - Switch Blockfrost to mainnet API
   - Change network from "Preprod" to "Mainnet"

2. **UI Polish:**
   - Add transaction status indicators
   - Show PSY rewards in UI
   - Display scoring results
   - Add transaction history

3. **Production Readiness:**
   - Error handling
   - Loading states
   - Transaction confirmations
   - Help/FAQ section

---

**Ready to test!** 🚀
