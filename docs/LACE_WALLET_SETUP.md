# Lace Wallet Setup Guide for Cognosis

This guide will help you set up the Lace wallet for Midnight testnet-02 and mainnet.

## Prerequisites

- Chrome, Firefox, or Brave browser (for browser extension)
- Email address (for account creation)

## Step 1: Install Lace Wallet

### Browser Extension

1. Visit the Lace Wallet website: https://www.lace.io/
2. Click "Download" or "Get Lace"
3. Select your browser (Chrome, Firefox, or Brave)
4. Click "Add to [Browser]" to install the extension
5. Click on the Lace icon in your browser toolbar

### Mobile App (if available)

1. Visit the App Store (iOS) or Google Play Store (Android)
2. Search for "Lace Wallet"
3. Download and install the app

## Step 2: Create a New Wallet

1. Open the Lace wallet extension/app
2. Click **"Create a new wallet"**
3. Choose a secure password (minimum 10 characters)
4. Confirm your password
5. Click "Create"

## Step 3: Backup Your Recovery Phrase

⚠️ **CRITICAL: Write down your recovery phrase and store it securely!**

1. You'll be shown a **24-word recovery phrase**
2. Write these words down in order on paper
3. Store the paper in a safe place (NOT on your computer)
4. **Never share your recovery phrase with anyone!**
5. Click "I have written down my recovery phrase"
6. Verify the recovery phrase by selecting the words in order
7. Click "Confirm"

## Step 4: Switch to Midnight Testnet-02

1. Open Lace wallet
2. Click on **Settings** (gear icon)
3. Click on **Network**
4. Select **"Midnight Testnet-02"** from the network dropdown
5. Confirm the network switch

Your wallet will now be connected to Midnight testnet-02!

## Step 5: Get Testnet tDUST Tokens

To use Midnight testnet, you need tDUST tokens (testnet currency):

### Option 1: Midnight Faucet

1. Copy your wallet address from Lace (click the address at the top)
2. Visit the Midnight testnet faucet: https://faucet.testnet.midnight.network
3. Paste your Bech32m wallet address
4. Complete any verification (captcha, etc.)
5. Click "Request tDUST"
6. Wait 1-2 minutes for tokens to arrive

### Option 2: Glacier Drop Portal (if available)

1. Visit https://glacier.midnight.network
2. Connect your Lace wallet
3. Follow the instructions to claim testnet tokens

## Step 6: Verify Your Setup

1. Open Lace wallet
2. You should see:
   - Network: "Midnight Testnet-02"
   - Balance: tDUST amount (e.g., "100 tDUST")
   - Address format: Starts with "mid_test" (Bech32m format)

Example address: `mid_test1qp2fg32qkv6x3r...`

## Step 7: Connect to Cognosis DApp

1. Open the Cognosis mobile app or web interface
2. Click "Connect Wallet"
3. Select "Lace Wallet"
4. Lace will prompt you to approve the connection
5. Review the requested permissions
6. Click "Connect"

You're now ready to use Cognosis!

---

## For Mainnet Deployment (Future)

When Midnight mainnet launches:

1. Open Lace wallet
2. Go to Settings → Network
3. Select **"Midnight Mainnet"**
4. **Use a different wallet or create a new one for mainnet!**
5. Purchase DUST tokens (mainnet currency) from a supported exchange
6. Send DUST to your mainnet Lace wallet address

⚠️ **NEVER use testnet wallets or seeds on mainnet!**

---

## Security Best Practices

### ✅ DO:
- Keep your recovery phrase offline and secure
- Use a strong, unique password
- Enable browser extension protection
- Verify websites before connecting wallet
- Use hardware wallet for large amounts (when supported)
- Create separate wallets for testnet and mainnet

### ❌ DON'T:
- Share your recovery phrase with ANYONE
- Store recovery phrase digitally (screenshots, notes apps, etc.)
- Use the same wallet on multiple devices
- Connect to unknown DApps
- Ignore transaction prompts (always read carefully)
- Use testnet wallets on mainnet

---

## Troubleshooting

### "Insufficient Balance" Error
- Check that you received tDUST from the faucet
- Wait a few minutes and refresh
- Try requesting from faucet again

### "Wrong Network" Error
- Verify you're on Midnight Testnet-02
- Go to Settings → Network
- Switch to the correct network

### "Connection Failed" Error
- Refresh the DApp page
- Disconnect and reconnect wallet
- Clear browser cache
- Try a different browser

### "Transaction Failed" Error
- Check that you have enough tDUST for gas fees
- Verify the transaction details
- Check testnet status at https://status.midnight.network

---

## Getting Help

- **Midnight Discord**: https://discord.gg/midnight
- **Lace Support**: https://www.lace.io/support
- **Cognosis Issues**: https://github.com/yourusername/Cognosis/issues

---

## Technical Details

### Wallet Specifications
- **Address Format**: Bech32m encoding
- **Supported Networks**: Midnight Testnet-02, Midnight Mainnet (when available)
- **SDK Version**: Wallet SDK 5.0+
- **API Version**: Wallet API 5.0+

### For Developers

Add wallet connection in your DApp:

```javascript
// Import Midnight wallet connector
import { WalletConnector } from '@midnight-ntwrk/dapp-connector-api';

// Initialize connector
const connector = new WalletConnector({
  network: process.env.MIDNIGHT_NETWORK,
});

// Request wallet connection
const wallet = await connector.connect();

// Get wallet address (Bech32m format)
const address = await wallet.getAddress();
console.log('Connected:', address);

// Sign transaction
const signedTx = await wallet.signTransaction(transaction);
```

---

**Last Updated**: January 2025
**Lace Version**: 5.0+
**Midnight Network**: Testnet-02
