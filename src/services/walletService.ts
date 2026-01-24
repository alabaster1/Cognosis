/**
 * Wallet Service - Cardano Version
 * Supports CIP-30 wallet connection (Nami, Eternl, Lace, Flint)
 */

import type { WalletInfo, WalletType } from '@/types';

class WalletService {
  private walletAddress: string | null = null;
  private walletType: WalletType | null = null;
  private walletApi: any = null;

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
    const cardano = (window as any).cardano;

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

      const cardano = (window as any).cardano;
      if (!cardano || !cardano[walletName.toLowerCase()]) {
        throw new Error(`${walletName} wallet not found. Please install the extension.`);
      }

      // Enable wallet (opens popup for user approval)
      this.walletApi = await cardano[walletName.toLowerCase()].enable();

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

      // Save wallet
      await this.saveWallet(address, 'cardano');

      console.log('[WalletService] Connected:', this.getShortenedAddress(address));

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

  async continueAsGuest(): Promise<{ address: string; type: WalletType; network: string }> {
    try {
      console.log('[WalletService] Continuing as guest...');

      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      localStorage.setItem('walletAddress', guestId);
      localStorage.setItem('walletType', 'guest');

      this.walletAddress = guestId;
      this.walletType = 'guest';

      return {
        address: guestId,
        type: 'guest',
        network: 'local',
      };
    } catch (error) {
      console.error('[WalletService] Guest mode error:', error);
      throw error;
    }
  }

  private async saveWallet(address: string, type: WalletType): Promise<void> {
    localStorage.setItem('walletAddress', address);
    localStorage.setItem('walletType', type);
    this.walletAddress = address;
    this.walletType = type;
  }

  private loadWallet(): void {
    const address = localStorage.getItem('walletAddress');
    const type = (localStorage.getItem('walletType') as WalletType) || 'guest';
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

    const type = this.walletType || 'guest';

    return {
      address,
      type,
      network: type === 'guest' ? 'local' : 'preprod',
      isVerified: type !== 'guest',
    };
  }

  async isVerified(): Promise<boolean> {
    const info = await this.getWalletInfo();
    return info ? info.type !== 'guest' : false;
  }

  async isConnected(): Promise<boolean> {
    const address = await this.getWallet();
    return !!address;
  }

  async signMessage(message: string): Promise<string> {
    if (this.walletType === 'guest') {
      // Guest mode: mock signature
      const encoder = new TextEncoder();
      const data = encoder.encode(`${message}:${this.walletAddress}:${Date.now()}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as Uint8Array<ArrayBuffer>);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (this.walletApi) {
      // Use CIP-30 signData
      const encoder = new TextEncoder();
      const messageHex = Array.from(encoder.encode(message))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return await this.walletApi.signData(this.walletAddress, messageHex);
    }

    throw new Error('No wallet available for signing');
  }

  async getBalance(): Promise<{ lovelace: string; formatted: string }> {
    if (!this.walletApi) {
      return { lovelace: '0', formatted: '0.00' };
    }

    try {
      const balanceHex = await this.walletApi.getBalance();
      // Parse CBOR-encoded balance (simplified)
      const lovelace = parseInt(balanceHex, 16).toString();
      const ada = (parseInt(lovelace) / 1_000_000).toFixed(2);
      return { lovelace, formatted: ada };
    } catch {
      return { lovelace: '0', formatted: '0.00' };
    }
  }

  async submitMidnightTransaction(transactionData: {
    commitmentId: string;
    score: number;
    scoreData: string;
    timestamp: number;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletApi) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Build metadata with score data
      const encoder = new TextEncoder();
      const metadataHex = Array.from(encoder.encode(JSON.stringify(transactionData)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // For now, log the transaction intent
      // Full Cardano tx building requires Lucid or cardano-serialization-lib
      console.log('[WalletService] Transaction data:', transactionData);
      console.log('[WalletService] Metadata hex:', metadataHex.substring(0, 64));

      // TODO: Build proper Cardano transaction with Lucid
      // For MVP, return a mock success
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
    this.walletAddress = null;
    this.walletType = null;
    this.walletApi = null;
  }

  getShortenedAddress(address?: string): string {
    const addr = address || this.walletAddress;
    if (!addr) return '';
    if (addr.startsWith('guest_')) return 'Guest';
    return `${addr.substring(0, 12)}...${addr.substring(addr.length - 6)}`;
  }
}

export default new WalletService();
