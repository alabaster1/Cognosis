/**
 * Cardano Service - Lucid Evolution integration for Cognosis
 * Handles wallet connection, transactions, and on-chain RNG
 */

import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  UTxO,
  type LucidEvolution,
} from "@lucid-evolution/lucid";

// ============================================================================
// CONFIGURATION
// ============================================================================

const BLOCKFROST_URL = "https://cardano-preprod.blockfrost.io/api/v0";
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "";
const GAME_FEE_LOVELACE = 200000n; // 0.2 ADA

// Zener symbols
export const ZENER_SYMBOLS = [
  { id: 1, name: "Circle", emoji: "⭕" },
  { id: 2, name: "Cross", emoji: "✚" },
  { id: 3, name: "Square", emoji: "⬜" },
  { id: 4, name: "Star", emoji: "⭐" },
  { id: 5, name: "Waves", emoji: "〰️" },
] as const;

// ============================================================================
// TYPES
// ============================================================================

export interface StatsDatum {
  totalGuesses: bigint;
  totalHits: bigint;
  lastUpdateSlot: bigint;
}

export interface GameResult {
  guess: number;
  reveal: number;
  hit: boolean;
  txHash: string;
  timestamp: Date;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: bigint;
  walletName: string | null;
}

// ============================================================================
// CARDANO SERVICE CLASS
// ============================================================================

class CardanoService {
  private lucid: LucidEvolution | null = null;
  private statsAddress: string | null = null;

  /**
   * Initialize Lucid with Blockfrost
   */
  async initialize(): Promise<void> {
    if (!BLOCKFROST_API_KEY) {
      console.warn("Blockfrost API key not set - running in mock mode");
      return;
    }

    this.lucid = await Lucid(
      new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY),
      "Preprod"
    );
  }

  /**
   * Connect to a CIP-30 wallet (Nami, Eternl, etc.)
   */
  async connectWallet(walletName: string): Promise<WalletState> {
    if (!this.lucid) {
      await this.initialize();
    }

    if (!this.lucid) {
      throw new Error("Lucid not initialized");
    }

    // Get wallet API from window
    const walletApi = await (window as any).cardano?.[walletName.toLowerCase()]?.enable();

    if (!walletApi) {
      throw new Error(`${walletName} wallet not found`);
    }

    this.lucid.selectWallet.fromAPI(walletApi);

    const address = await this.lucid.wallet().address();
    const utxos = await this.lucid.wallet().getUtxos();
    const balance = utxos.reduce((sum: bigint, utxo: UTxO) => sum + utxo.assets.lovelace, 0n);

    return {
      connected: true,
      address,
      balance,
      walletName,
    };
  }

  /**
   * Disconnect wallet
   */
  disconnect(): WalletState {
    return {
      connected: false,
      address: null,
      balance: 0n,
      walletName: null,
    };
  }

  /**
   * Compute RNG from transaction hash (1-5)
   * Deterministic - same tx hash always produces same result
   */
  computeRNG(txHash: string): number {
    const firstByte = parseInt(txHash.slice(0, 2), 16);
    return (firstByte % 5) + 1;
  }

  /**
   * Play Zener Oracle game
   * @param guess - Player's guess (1-5)
   * @returns Game result with reveal and hit status
   */
  async playGame(guess: number): Promise<GameResult> {
    if (!this.lucid) {
      throw new Error("Lucid not initialized");
    }

    if (guess < 1 || guess > 5) {
      throw new Error("Guess must be 1-5");
    }

    // Build transaction
    const tx = await this.lucid
      .newTx()
      .pay.ToAddress(await this.lucid.wallet().address(), {
        lovelace: GAME_FEE_LOVELACE,
      })
      .complete();

    // Get tx hash for RNG before signing
    const txHash = tx.toHash();
    const reveal = this.computeRNG(txHash);
    const hit = guess === reveal;

    // Sign and submit
    const signedTx = await tx.sign.withWallet().complete();
    const submittedTxHash = await signedTx.submit();

    // Wait for confirmation (optional - can be async)
    await this.lucid.awaitTx(submittedTxHash);

    return {
      guess,
      reveal,
      hit,
      txHash: submittedTxHash,
      timestamp: new Date(),
    };
  }

  /**
   * Get global stats from chain
   */
  async getStats(): Promise<StatsDatum | null> {
    if (!this.lucid || !this.statsAddress) {
      return null;
    }

    const utxos = await this.lucid.utxosAt(this.statsAddress);

    if (utxos.length === 0) {
      return null;
    }

    // Parse datum from first UTXO
    const datum = utxos[0].datum;
    if (!datum) {
      return null;
    }

    // Decode datum (Constr 0 [totalGuesses, totalHits, lastSlot])
    try {
      const decoded = Data.from(datum) as Constr<Data>;
      return {
        totalGuesses: decoded.fields[0] as bigint,
        totalHits: decoded.fields[1] as bigint,
        lastUpdateSlot: decoded.fields[2] as bigint,
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate accuracy percentage
   */
  calculateAccuracy(stats: StatsDatum): number {
    if (stats.totalGuesses === 0n) {
      return 0;
    }
    return Number((stats.totalHits * 10000n) / stats.totalGuesses) / 100;
  }

  /**
   * Set stats contract address
   */
  setStatsAddress(address: string): void {
    this.statsAddress = address;
  }

  /**
   * Check if wallet is available
   */
  isWalletAvailable(walletName: string): boolean {
    return !!(window as any).cardano?.[walletName.toLowerCase()];
  }

  /**
   * Get available wallets
   */
  getAvailableWallets(): string[] {
    const wallets: string[] = [];
    const cardano = (window as any).cardano;

    if (!cardano) return wallets;

    if (cardano.nami) wallets.push("Nami");
    if (cardano.eternl) wallets.push("Eternl");
    if (cardano.flint) wallets.push("Flint");
    if (cardano.lace) wallets.push("Lace");
    if (cardano.yoroi) wallets.push("Yoroi");

    return wallets;
  }
}

// Export singleton instance
export const cardanoService = new CardanoService();
export default cardanoService;
