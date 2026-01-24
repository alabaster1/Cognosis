/**
 * Midnight Network Service - Testnet Integration
 * Handles balance queries, transaction submission, and network interactions
 * Uses Polkadot API for real blockchain interaction
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';

export interface MidnightBalance {
  tDust: string; // Total tDust balance in smallest units
  tDustFormatted: string; // Human-readable tDust (with decimals)
  nfts: NFTBalance[];
}

export interface NFTBalance {
  policyId: string;
  assetName: string;
  quantity: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata?: Record<string, unknown>;
}

export interface TransactionResult {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockHeight?: number;
  timestamp?: string;
}

class MidnightService {
  // Real Midnight Network Testnet RPC Endpoint
  private readonly TESTNET_RPC_URL = 'wss://rpc.testnet-02.midnight.network';
  private readonly TESTNET_EXPLORER_URL = 'https://explorer.midnight.network';
  private network: 'testnet' | 'mainnet' = 'testnet';

  private api: ApiPromise | null = null;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<ApiPromise> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.network = (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    }
  }

  /**
   * Initialize connection to Midnight Network via Polkadot API
   * Uses singleton pattern to reuse connection
   */
  private async connect(): Promise<ApiPromise> {
    // Return existing connection if available
    if (this.api && this.api.isConnected) {
      return this.api;
    }

    // Wait for existing connection attempt
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection
    this.isConnecting = true;
    this.connectionPromise = (async () => {
      try {
        console.log('[MidnightService] Connecting to Midnight Network:', this.TESTNET_RPC_URL);

        const wsProvider = new WsProvider(this.TESTNET_RPC_URL);
        const api = await ApiPromise.create({ provider: wsProvider });

        // Wait for API to be ready
        await api.isReady;

        console.log('[MidnightService] Connected to Midnight Network');
        this.api = api;
        this.isConnecting = false;

        return api;
      } catch (error: unknown) {
        console.error('[MidnightService] Connection failed:', error);
        this.isConnecting = false;
        this.connectionPromise = null;
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to Midnight Network: ${message}`);
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Disconnect from Midnight Network
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      this.connectionPromise = null;
    }
  }

  /**
   * Get wallet balance from Midnight testnet using Polkadot API
   * Queries both tDust (native token) and NFTs
   */
  async getBalance(address: string): Promise<MidnightBalance> {
    try {
      console.log('[MidnightService] Fetching balance for:', address);

      // Try to connect to real Midnight Network
      try {
        const api = await this.connect();

        // Query account balance using Polkadot API
        const account = await api.query.system.account(address);
        const accountData = (account as any).data as Record<string, unknown>;

        // Get free balance (available balance)
        const freeBalance = accountData.free?.toString() || '0';
        const tDustFormatted = this.formatTDust(freeBalance);

        console.log('[MidnightService] Balance retrieved:', { freeBalance, tDustFormatted });

        // Query NFTs/assets (if available on Midnight)
        // Note: Midnight may use different asset system - adjust as needed
        const nfts: NFTBalance[] = [];

        // Try to get assets if the chain supports it
        if (api.query.assets) {
          try {
            // Query user's assets
            const assets = await api.query.assets.account.entries(address);

            for (const [key, value] of assets) {
              const assetId = key.args[0].toString();
              const assetData = value.toJSON() as Record<string, unknown>;

              if (assetData && assetData.balance) {
                nfts.push({
                  policyId: assetId,
                  assetName: `Asset ${assetId}`,
                  quantity: assetData.balance.toString(),
                  metadata: assetData
                });
              }
            }
          } catch (assetError) {
            console.warn('[MidnightService] Asset query not available:', assetError);
          }
        }

        return {
          tDust: freeBalance,
          tDustFormatted,
          nfts
        };

      } catch (rpcError: unknown) {
        const message = rpcError instanceof Error ? rpcError.message : 'Unknown error';
        console.warn('[MidnightService] RPC connection failed, checking Lace wallet:', message);

        // Fallback to Lace wallet if available
        if (typeof window !== 'undefined' && (window as any).midnight) {
          try {
            const midnight = (window as any).midnight as { enable: () => Promise<unknown> };
            const wallet = (await midnight.enable()) as { state: () => Promise<{ balance: string }>, getAssets: () => Promise<unknown>, submitTx: (tx: string) => Promise<string>, getTx: (hash: string) => Promise<{ confirmations: number, block?: { height: number }, timestamp?: string }> };
            const state = await wallet.state();

            const tDustLovelace = state.balance || '0';
            const tDustFormatted = this.formatTDust(tDustLovelace);
            const nfts = await this.getNFTs(wallet);

            return {
              tDust: tDustLovelace,
              tDustFormatted,
              nfts
            };
          } catch (laceError) {
            console.warn('[MidnightService] Lace wallet failed:', laceError);
          }
        }

        // Final fallback: Return zero balance
        console.warn('[MidnightService] All balance queries failed, returning zero');
        return {
          tDust: '0',
          tDustFormatted: '0.00',
          nfts: []
        };
      }

    } catch (error: unknown) {
      console.error('[MidnightService] Balance fetch error:', error);
      return {
        tDust: '0',
        tDustFormatted: '0.00',
        nfts: []
      };
    }
  }

  /**
   * Get NFTs from wallet
   */
  private async getNFTs(wallet: unknown): Promise<NFTBalance[]> {
    try {
      const walletWithAssets = wallet as { getAssets: () => Promise<Record<string, unknown>[]> };
      const assets = await walletWithAssets.getAssets();

      return assets
        .filter((asset: Record<string, unknown>) => asset.unit !== 'lovelace') // Filter out native token
        .map((asset: Record<string, unknown>) => ({
          policyId: (asset.policyId as string) || '0x',
          assetName: (asset.assetName as string) || 'Unknown',
          quantity: (asset.quantity as string) || '0',
          metadata: asset.metadata as Record<string, unknown> | undefined
        }));
    } catch (error: unknown) {
      console.warn('[MidnightService] NFT fetch failed:', error);
      return [];
    }
  }

  /**
   * Format tDust from lovelace to human-readable
   * 1 tDust = 1,000,000 lovelace
   */
  private formatTDust(lovelace: string): string {
    try {
      const amount = BigInt(lovelace);
      const tDust = Number(amount) / 1_000_000;
      return tDust.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    } catch {
      return '0.00';
    }
  }

  /**
   * Submit a transaction to Midnight testnet using Polkadot API
   *
   * @param signedTx - Signed transaction hex or SubmittableExtrinsic
   * @param metadata - Optional transaction metadata
   * @returns Transaction result with hash and status
   */
  async submitTransaction(
    signedTx: string | SubmittableExtrinsic<'promise'>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata?: {
      experimentId?: string;
      score?: number;
      commitmentHash?: string;
    }
  ): Promise<TransactionResult> {
    try {
      console.log('[MidnightService] Submitting transaction to Midnight testnet...');

      // Try to submit via Polkadot API
      try {
        const api = await this.connect();

        let txHash: string;

        // If it's a SubmittableExtrinsic, send it directly
        if (typeof signedTx !== 'string') {
          const result = await signedTx.send();
          txHash = result.toString();
        } else {
          // If it's a hex string, use RPC submission
          const result = await api.rpc.author.submitExtrinsic(signedTx);
          txHash = result.toString();
        }

        console.log('[MidnightService] Transaction submitted via RPC:', txHash);

        return {
          txHash,
          status: 'pending',
          timestamp: new Date().toISOString()
        };

      } catch (rpcError: unknown) {
        const message = rpcError instanceof Error ? rpcError.message : 'Unknown error';
        console.warn('[MidnightService] RPC submission failed, trying Lace wallet:', message);

        // Fallback to Lace wallet if available
        if (typeof window !== 'undefined' && (window as any).midnight) {
          try {
            const midnight = (window as any).midnight as { enable: () => Promise<unknown> };
            const wallet = (await midnight.enable()) as { state: () => Promise<{ balance: string }>, getAssets: () => Promise<unknown>, submitTx: (tx: string) => Promise<string>, getTx: (hash: string) => Promise<{ confirmations: number, block?: { height: number }, timestamp?: string }> };

            // Submit transaction through Lace
            const txHash = await wallet.submitTx(typeof signedTx === 'string' ? signedTx : signedTx.toHex());

            console.log('[MidnightService] Transaction submitted via Lace:', txHash);

            return {
              txHash,
              status: 'pending',
              timestamp: new Date().toISOString()
            };
          } catch (laceError: unknown) {
            console.error('[MidnightService] Lace submission failed:', laceError);
            const message = laceError instanceof Error ? laceError.message : 'Unknown error';
            throw new Error(`Transaction submission failed: ${message}`);
          }
        }

        throw new Error('No available method to submit transaction');
      }

    } catch (error: unknown) {
      console.error('[MidnightService] Transaction submission error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to submit transaction: ${message}`);
    }
  }

  /**
   * Get transaction status from Midnight testnet using Polkadot API
   *
   * @param txHash - Transaction hash to query
   * @returns Transaction result with status
   */
  async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    try {
      console.log('[MidnightService] Fetching transaction status:', txHash);

      // Try to query via Polkadot API
      try {
        const api = await this.connect();

        // Get block hash from tx hash (if available)
        const block = await api.rpc.chain.getBlock(txHash);

        if (block) {
          const blockNumber = block.block.header.number.toNumber();

          return {
            txHash,
            status: 'confirmed',
            blockHeight: blockNumber,
            timestamp: new Date().toISOString()
          };
        }

        // If block not found, transaction might still be pending
        return {
          txHash,
          status: 'pending',
          timestamp: new Date().toISOString()
        };

      } catch (rpcError: unknown) {
        const message = rpcError instanceof Error ? rpcError.message : 'Unknown error';
        console.warn('[MidnightService] RPC query failed, trying Lace wallet:', message);

        // Fallback to Lace wallet if available
        if (typeof window !== 'undefined' && (window as any).midnight) {
          try {
            const midnight = (window as any).midnight as { enable: () => Promise<unknown> };
            const wallet = (await midnight.enable()) as { state: () => Promise<{ balance: string }>, getAssets: () => Promise<unknown>, submitTx: (tx: string) => Promise<string>, getTx: (hash: string) => Promise<{ confirmations: number, block?: { height: number }, timestamp?: string }> };

            // Query transaction status
            const tx = await wallet.getTx(txHash);

            return {
              txHash,
              status: tx.confirmations > 0 ? 'confirmed' : 'pending',
              blockHeight: tx.block?.height,
              timestamp: tx.timestamp
            };
          } catch (laceError) {
            console.warn('[MidnightService] Lace query failed:', laceError);
          }
        }

        // If we can't query, assume pending
        return {
          txHash,
          status: 'pending',
          timestamp: new Date().toISOString()
        };
      }

    } catch (error: unknown) {
      console.error('[MidnightService] Transaction status error:', error);
      return {
        txHash,
        status: 'failed'
      };
    }
  }

  /**
   * Get explorer URL for transaction
   * Uses Polkadot.js Apps with Midnight testnet RPC
   */
  getExplorerUrl(txHash: string): string {
    const rpcParam = encodeURIComponent(this.TESTNET_RPC_URL);
    return `https://polkadot.js.org/apps/?rpc=${rpcParam}#/explorer/query/${txHash}`;
  }

  /**
   * Get explorer URL for address
   * Uses Polkadot.js Apps with Midnight testnet RPC
   */
  getAddressExplorerUrl(): string {
    const rpcParam = encodeURIComponent(this.TESTNET_RPC_URL);
    return `https://polkadot.js.org/apps/?rpc=${rpcParam}#/accounts`;
  }

  /**
   * Get explorer URL for specific address details
   * Direct link to account page with address pre-filled
   */
  getAccountDetailsUrl(): string {
    const rpcParam = encodeURIComponent(this.TESTNET_RPC_URL);
    // Polkadot.js Apps doesn't support direct address query in URL,
    // so we'll open the accounts page where user can search
    return `https://polkadot.js.org/apps/?rpc=${rpcParam}#/accounts`;
  }

  /**
   * Estimate transaction fee
   *
   * @param txType - Type of transaction (transfer, contract, etc.)
   * @returns Estimated fee in lovelace
   */
  async estimateFee(txType: 'transfer' | 'contract' = 'transfer'): Promise<string> {
    // Base fees for different transaction types
    // These are estimates and will be replaced with actual fee calculation
    const baseFees = {
      transfer: '170000', // 0.17 tDust
      contract: '350000'  // 0.35 tDust
    };

    return baseFees[txType];
  }

  /**
   * Check if address is valid Midnight address
   */
  isValidAddress(address: string): boolean {
    // Testnet addresses start with 'mid_test1'
    // Mainnet addresses start with 'mid1'
    if (this.network === 'testnet') {
      return address.startsWith('mid_test1');
    } else {
      return address.startsWith('mid1');
    }
  }

  /**
   * Get current network info
   */
  getNetworkInfo(): { network: string; explorerUrl: string } {
    return {
      network: this.network,
      explorerUrl: this.TESTNET_EXPLORER_URL
    };
  }
}

export default new MidnightService();
