/**
 * CIP-30 Wallet API Type Definitions
 * Based on: https://github.com/cardano-foundation/CIPs/tree/master/CIP-0030
 */

export interface CIP30WalletApi {
  /** Get wallet's network ID (0 = testnet, 1 = mainnet) */
  getNetworkId(): Promise<number>;

  /** Get used addresses in hex-encoded CBOR format */
  getUsedAddresses(paginate?: Paginate): Promise<string[]>;

  /** Get unused addresses in hex-encoded CBOR format */
  getUnusedAddresses(): Promise<string[]>;

  /** Get change address in hex-encoded CBOR format */
  getChangeAddress(): Promise<string>;

  /** Get reward addresses in hex-encoded CBOR format */
  getRewardAddresses(): Promise<string[]>;

  /** Get all UTxOs in hex-encoded CBOR format */
  getUtxos(amount?: string, paginate?: Paginate): Promise<string[] | null>;

  /** Get collateral UTxOs for smart contract execution */
  getCollateral(params?: { amount: string }): Promise<string[] | null>;

  /** Get wallet's total balance in hex-encoded CBOR */
  getBalance(): Promise<string>;

  /** Sign a transaction (returns witness set in CBOR) */
  signTx(tx: string, partialSign?: boolean): Promise<string>;

  /** Sign arbitrary data (CIP-8) */
  signData(address: string, payload: string): Promise<{
    signature: string;
    key: string;
  }>;

  /** Submit a signed transaction */
  submitTx(tx: string): Promise<string>;

  /** Experimental: Get extensions supported by wallet */
  experimental?: {
    getCollateral?(): Promise<string[] | null>;
  };
}

export interface Paginate {
  page: number;
  limit: number;
}

export interface CardanoProvider {
  name: string;
  icon: string;
  version: string;
  enable(): Promise<CIP30WalletApi>;
  isEnabled(): Promise<boolean>;
  apiVersion: string;
}

/** Window.cardano interface */
export interface CardanoWindow {
  eternl?: CardanoProvider;
  nufi?: CardanoProvider;
  lace?: CardanoProvider;
  vespr?: CardanoProvider;
  typhon?: CardanoProvider;
  okxwallet?: CardanoProvider;
  begin?: CardanoProvider;
  nami?: CardanoProvider;
  flint?: CardanoProvider;
  yoroi?: CardanoProvider;
  [key: string]: CardanoProvider | undefined;
}

// Window.cardano is already declared by @lucid-evolution/core-types.
// Use our CardanoWindow type via assertion when needed:
//   const cardano = window.cardano as unknown as CardanoWindow;
