/**
 * Remote Viewing Cardano Service
 * Direct blockchain commitment submission (no backend database)
 */

import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  toHex,
  fromText,
} from "@lucid-evolution/lucid";

// ============================================================================
// CONFIGURATION - PREPROD TESTNET
// ============================================================================

const BLOCKFROST_URL = "https://cardano-preprod.blockfrost.io/api/v0";
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "";

// PlutusV3 contract addresses (preprod)
const EXPERIMENT_CONTRACT = "addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7";

// ============================================================================
// TYPES
// ============================================================================

export interface RVCommitment {
  userPkh: string;
  ipfsHash: string;
  timestamp: number;
  experimentType: string;
  targetDescription: string;
}

// ============================================================================
// RV CARDANO SERVICE
// ============================================================================

class RVCardanoService {
  private lucid: any = null;

  /**
   * Initialize Lucid with Blockfrost
   */
  async initialize(): Promise<void> {
    if (!BLOCKFROST_API_KEY) {
      throw new Error("Blockfrost API key not configured");
    }

    this.lucid = await Lucid(
      new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY),
      "Preprod"
    );
  }

  /**
   * Connect wallet
   */
  async connectWallet(walletName: string): Promise<void> {
    if (!this.lucid) {
      await this.initialize();
    }

    const walletApi = await (window as any).cardano?.[walletName.toLowerCase()]?.enable();

    if (!walletApi) {
      throw new Error(`${walletName} wallet not found`);
    }

    this.lucid.selectWallet.fromAPI(walletApi);
  }

  /**
   * Get user's public key hash
   */
  async getUserPkh(): Promise<string> {
    if (!this.lucid) {
      throw new Error("Lucid not initialized");
    }

    const address = await this.lucid.wallet.address();
    const details = this.lucid.utils.getAddressDetails(address);
    
    return details.paymentCredential?.hash || "";
  }

  /**
   * Submit RV commitment to blockchain
   */
  async submitCommitment(params: {
    ipfsHash: string;
    targetDescription: string;
  }): Promise<string> {
    if (!this.lucid) {
      await this.initialize();
    }

    const { ipfsHash, targetDescription } = params;

    // Get user PKH
    const userPkh = await this.getUserPkh();

    // Build datum
    const datum = Data.to(
      new Constr(0, [
        userPkh, // user_pkh
        fromText(ipfsHash), // ipfs_hash
        BigInt(Math.floor(Date.now() / 1000)), // timestamp
        fromText("RV"), // experiment_type
        fromText(targetDescription), // target_description
      ])
    );

    // Build transaction
    const tx = await this.lucid
      .newTx()
      .pay.ToContract(
        EXPERIMENT_CONTRACT,
        { inline: datum },
        { lovelace: 5000000n } // 5 ADA
      )
      .complete();

    // Sign transaction
    const signedTx = await tx.sign.withWallet().complete();

    // Submit transaction
    const txHash = await signedTx.submit();

    console.log("[RVCardanoService] Commitment submitted:", txHash);
    
    return txHash;
  }

  /**
   * Check wallet connection
   */
  async isWalletConnected(): Promise<boolean> {
    if (!this.lucid) {
      return false;
    }

    try {
      const address = await this.lucid.wallet.address();
      return !!address;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet address
   */
  async getWalletAddress(): Promise<string | null> {
    if (!this.lucid) {
      return null;
    }

    try {
      return await this.lucid.wallet.address();
    } catch {
      return null;
    }
  }
}

// Export singleton
const rvCardanoService = new RVCardanoService();
export default rvCardanoService;
