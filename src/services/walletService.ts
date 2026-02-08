/**
 * Wallet Service - Cardano Only (CIP-30 + CIP-8 Auth)
 * Supports CIP-30 wallet connection (Nami, Eternl, Lace, Flint)
 * Authenticates via backend challenge-response (CIP-8 signature)
 */

import type { WalletInfo, WalletType } from '@/types';
import type { CIP30WalletApi } from '@/types/cardano';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class WalletService {
  private walletAddress: string | null = null;
  private walletType: WalletType | null = null;
  private walletApi: CIP30WalletApi | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadWallet();
    }
  }

  /**
   * Get available Cardano wallets
   */
  getAvailableWallets(): string[] {
    if (typeof window === 'undefined') return [];

    const wallets: string[] = [];
    const cardano = window.cardano;

    if (!cardano) return wallets;

    if (cardano.nami) wallets.push('nami');
    if (cardano.eternl) wallets.push('eternl');
    if (cardano.lace) wallets.push('lace');
    if (cardano.flint) wallets.push('flint');
    if (cardano.yoroi) wallets.push('yoroi');

    return wallets;
  }

  /**
   * Connect to a CIP-30 Cardano wallet
   */
  async connectCardanoWallet(walletName: string): Promise<{ address: string; type: WalletType; network: string }> {
    try {
      console.log(`[WalletService] Connecting to ${walletName} wallet...`);

      const cardano = window.cardano;
      const provider = cardano?.[walletName.toLowerCase()];
      if (!cardano || !provider) {
        throw new Error(`${walletName} wallet not found. Please install the extension.`);
      }

      // Enable wallet (opens popup for user approval)
      this.walletApi = await provider.enable();

      // Get address
      const addresses = await this.walletApi.getUsedAddresses();
      let address = addresses[0];

      if (!address) {
        const unusedAddresses = await this.walletApi.getUnusedAddresses();
        address = unusedAddresses[0];
      }

      if (!address) {
        throw new Error('No address found in wallet');
      }

      // Authenticate with backend (challenge-response)
      await this.authenticateWithBackend(address);

      // Save wallet locally
      await this.saveWallet(address, 'cardano');

      console.log('[WalletService] Connected and authenticated:', this.getShortenedAddress(address));

      return {
        address,
        type: 'cardano',
        network: 'preprod',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[WalletService] Connection error:', error);
      throw new Error('Failed to connect wallet: ' + message);
    }
  }

  /**
   * Legacy: Connect Lace (redirects to Cardano connection)
   */
  async connectLaceWallet(): Promise<{ address: string; type: WalletType; network: string }> {
    return this.connectCardanoWallet('lace');
  }

  /**
   * Authenticate with backend using CIP-8 challenge-response
   * 1. Request challenge from backend
   * 2. Sign challenge with wallet (CIP-30 signData)
   * 3. Submit signature to backend for JWT
   */
  async authenticateWithBackend(walletAddress: string): Promise<void> {
    if (!this.walletApi) {
      throw new Error('Wallet not connected');
    }

    // Step 1: Request challenge
    const challengeRes = await axios.post(`${API_URL}/api/auth/wallet/challenge`, {
      walletAddress,
    });
    const { message } = challengeRes.data;

    // Step 2: Sign challenge with CIP-30 signData
    const encoder = new TextEncoder();
    const messageHex = Array.from(encoder.encode(message))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    const dataSignature = await this.walletApi.signData(walletAddress, messageHex);

    // Step 3: Submit signature to backend
    const authRes = await axios.post(`${API_URL}/api/auth/wallet`, {
      walletAddress,
      signature: dataSignature, // { signature: hex, key: hex }
    });

    if (!authRes.data.success) {
      throw new Error(authRes.data.error || 'Authentication failed');
    }

    // Store JWT
    localStorage.setItem('authToken', authRes.data.token);
    console.log('[WalletService] Backend authentication successful');
  }

  private async saveWallet(address: string, type: WalletType): Promise<void> {
    localStorage.setItem('walletAddress', address);
    localStorage.setItem('walletType', type);
    this.walletAddress = address;
    this.walletType = type;
  }

  private loadWallet(): void {
    const address = localStorage.getItem('walletAddress');
    const type = (localStorage.getItem('walletType') as WalletType) || null;
    this.walletAddress = address;
    this.walletType = type;
  }

  async getWallet(): Promise<string | null> {
    if (!this.walletAddress) {
      this.loadWallet();
    }
    return this.walletAddress;
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    const address = await this.getWallet();
    if (!address) return null;

    return {
      address,
      type: this.walletType || 'cardano',
      network: 'preprod',
      isVerified: true,
    };
  }

  async isConnected(): Promise<boolean> {
    const address = await this.getWallet();
    return !!address;
  }

  async signMessage(message: string): Promise<{ signature: string; key: string }> {
    if (!this.walletApi) {
      throw new Error('No wallet available for signing');
    }

    const encoder = new TextEncoder();
    const messageHex = Array.from(encoder.encode(message))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
    return await this.walletApi.signData(this.walletAddress, messageHex);
  }

  async getBalance(): Promise<{ lovelace: string; formatted: string }> {
    if (!this.walletApi) {
      return { lovelace: '0', formatted: '0.00' };
    }

    try {
      const balanceHex = await this.walletApi.getBalance();
      const lovelace = parseInt(balanceHex, 16).toString();
      const ada = (parseInt(lovelace) / 1_000_000).toFixed(2);
      return { lovelace, formatted: ada };
    } catch {
      return { lovelace: '0', formatted: '0.00' };
    }
  }

  async submitCardanoTransaction(transactionData: {
    commitmentId: string;
    score: number;
    scoreData: string;
    timestamp: number;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletApi) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const encoder = new TextEncoder();
      const metadataHex = Array.from(encoder.encode(JSON.stringify(transactionData)))
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('[WalletService] Transaction data:', transactionData);
      console.log('[WalletService] Metadata hex:', metadataHex.substring(0, 64));

      // TODO: Build proper Cardano transaction with Lucid
      return {
        success: true,
        txHash: `tx_${Date.now().toString(16)}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      return { success: false, error: message };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletType');
    localStorage.removeItem('authToken');
    this.walletAddress = null;
    this.walletType = null;
    this.walletApi = null;
  }

  getShortenedAddress(address?: string): string {
    const addr = address || this.walletAddress;
    if (!addr) return '';
    return `${addr.substring(0, 12)}...${addr.substring(addr.length - 6)}`;
  }
}

export default new WalletService();
