/**
 * Midnight Network Client
 * Real SDK integration for testnet/mainnet deployment
 *
 * This module provides abstraction over Midnight SDK,
 * allowing easy switching between mock and real implementations
 */

const { WalletBuilder } = require('@midnight-ntwrk/wallet');
const { WalletAPI } = require('@midnight-ntwrk/wallet-api');

class MidnightClient {
  constructor(config = {}) {
    this.network = config.network || process.env.MIDNIGHT_NETWORK || 'testnet-02';
    this.nodeUrl = config.nodeUrl || process.env.MIDNIGHT_NODE_URL;
    this.indexerUrl = config.indexerUrl || process.env.MIDNIGHT_INDEXER_URL;
    this.provingServerUrl = config.provingServerUrl || process.env.MIDNIGHT_PROVING_SERVER_URL;
    this.contractAddress = config.contractAddress || process.env.MIDNIGHT_CONTRACT_ADDRESS;
    this.walletSeed = config.walletSeed || process.env.MIDNIGHT_WALLET_SEED;

    this.useMockMode = !this.contractAddress || this.contractAddress === '';
    this.wallet = null;
    this.initialized = false;

    // In-memory storage for mock mode
    this.mockStorage = {
      commitments: new Map(),
    };
  }

  /**
   * Initialize Midnight wallet and connection
   */
  async initialize() {
    try {
      if (this.useMockMode) {
        console.log('⚠ Midnight Client in MOCK MODE');
        console.log(`  Network: ${this.network}`);
        console.log(`  Reason: No contract address configured`);
        this.initialized = true;
        return true;
      }

      // Real Midnight SDK initialization
      console.log('Initializing Midnight Client...');
      console.log(`  Network: ${this.network}`);
      console.log(`  Node URL: ${this.nodeUrl}`);
      console.log(`  Indexer URL: ${this.indexerUrl}`);
      console.log(`  Contract: ${this.contractAddress}`);

      // Create wallet using Midnight Wallet SDK
      const walletBuilder = new WalletBuilder();

      this.wallet = await walletBuilder
        .setNodeUrl(this.nodeUrl)
        .setIndexerUrl(this.indexerUrl)
        .setProvingServerUrl(this.provingServerUrl)
        .setSeed(this.walletSeed)
        .build();

      await this.wallet.initialize();

      const address = await this.wallet.getAddress();
      console.log(`✓ Wallet initialized: ${address.substring(0, 20)}...`);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Midnight Client initialization error:', error);
      console.log('⚠ Falling back to MOCK MODE');
      this.useMockMode = true;
      this.initialized = true;
      return false;
    }
  }

  /**
   * Submit commitment to blockchain with retry logic and gas estimation
   */
  async submitCommit({ commitment, metadataHash, revealWindow, accessPolicy, callerPubKey }) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useMockMode) {
      return this._mockSubmitCommit({ commitment, metadataHash, revealWindow, accessPolicy, callerPubKey });
    }

    return this._retryOperation(async () => {
      // Estimate gas for the transaction
      const gasEstimate = await this._estimateGas({
        contractAddress: this.contractAddress,
        method: 'commit',
        args: {
          commitmentHash: commitment,
          metadataHash: metadataHash,
          revealWindow: BigInt(revealWindow),
          accessPolicy: accessPolicy,
        },
      });

      const tx = await this.wallet.submitTransaction({
        contractAddress: this.contractAddress,
        method: 'commit',
        args: {
          commitmentHash: commitment,
          metadataHash: metadataHash,
          revealWindow: BigInt(revealWindow),
          accessPolicy: accessPolicy,
        },
        gasLimit: gasEstimate.gasLimit,
        maxFeePerGas: gasEstimate.maxFeePerGas,
      });

      const receipt = await tx.wait();

      return {
        success: true,
        commitTxId: `midnight:${receipt.transactionHash}`,
        blockHeight: receipt.blockNumber,
        timestamp: new Date(receipt.timestamp * 1000).toISOString(),
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, 'submitCommit');
  }

  /**
   * Submit reveal to blockchain with gas estimation
   */
  async submitReveal({ commitmentHash, cid, nonce, deviceSig, devicePubKey }) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useMockMode) {
      return this._mockSubmitReveal({ commitmentHash, cid, nonce, deviceSig, devicePubKey });
    }

    return this._retryOperation(async () => {
      // Estimate gas for the transaction
      const gasEstimate = await this._estimateGas({
        contractAddress: this.contractAddress,
        method: 'reveal',
        args: {
          commitmentHash: commitmentHash,
          cid: cid,
          nonce: nonce,
          deviceSignature: deviceSig,
          devicePublicKey: devicePubKey,
        },
      });

      const tx = await this.wallet.submitTransaction({
        contractAddress: this.contractAddress,
        method: 'reveal',
        args: {
          commitmentHash: commitmentHash,
          cid: cid,
          nonce: nonce,
          deviceSignature: deviceSig,
          devicePublicKey: devicePubKey,
        },
        gasLimit: gasEstimate.gasLimit,
        maxFeePerGas: gasEstimate.maxFeePerGas,
      });

      const receipt = await tx.wait();

      return {
        success: true,
        revealTxId: `midnight:${receipt.transactionHash}`,
        blockHeight: receipt.blockNumber,
        timestamp: new Date(receipt.timestamp * 1000).toISOString(),
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, 'submitReveal');
  }

  /**
   * Query commitment status from blockchain
   */
  async getCommitment(commitmentHash) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useMockMode) {
      return this._mockGetCommitment(commitmentHash);
    }

    try {
      // Real Midnight contract query
      const result = await this.wallet.queryContract({
        contractAddress: this.contractAddress,
        method: 'getCommitmentRecord',
        args: {
          commitmentHash: commitmentHash,
        },
      });

      return {
        success: true,
        commitment: result,
      };
    } catch (error) {
      console.error('Get commitment error:', error);
      throw error;
    }
  }

  /**
   * Convert Bech32m address format
   */
  parseBech32mAddress(address) {
    // Midnight uses Bech32m format: mid_test1... or mid1...
    if (address.startsWith('mid_test1')) {
      return {
        network: 'testnet',
        address: address,
      };
    } else if (address.startsWith('mid1')) {
      return {
        network: 'mainnet',
        address: address,
      };
    }
    throw new Error('Invalid Bech32m address format');
  }

  /**
   * Estimate gas for transaction with safety margin
   */
  async _estimateGas(txParams) {
    try {
      if (this.useMockMode) {
        // Return mock gas estimate
        return {
          gasLimit: BigInt(200000),
          maxFeePerGas: BigInt(1000000000), // 1 gwei
          baseFee: BigInt(800000000),
        };
      }

      // Real gas estimation via Midnight SDK
      const estimate = await this.wallet.estimateGas({
        contractAddress: txParams.contractAddress,
        method: txParams.method,
        args: txParams.args,
      });

      // Add 20% safety margin to gas limit
      const gasLimit = (estimate.gasLimit * BigInt(120)) / BigInt(100);

      // Get current network gas price and add 10% buffer
      const baseFee = await this._getBaseFee();
      const maxFeePerGas = (baseFee * BigInt(110)) / BigInt(100);

      console.log(`[GAS] Estimated: ${estimate.gasLimit}, With margin: ${gasLimit}, Max fee: ${maxFeePerGas}`);

      return {
        gasLimit,
        maxFeePerGas,
        baseFee,
        originalEstimate: estimate.gasLimit,
      };
    } catch (error) {
      console.warn('[GAS] Estimation failed, using defaults:', error.message);
      // Fallback to safe defaults
      return {
        gasLimit: BigInt(300000),
        maxFeePerGas: BigInt(2000000000), // 2 gwei
        baseFee: BigInt(1500000000),
      };
    }
  }

  /**
   * Get current base fee from network
   */
  async _getBaseFee() {
    try {
      if (this.useMockMode) {
        return BigInt(1000000000); // 1 gwei
      }

      const block = await this.wallet.getLatestBlock();
      return block.baseFeePerGas || BigInt(1000000000);
    } catch (error) {
      console.warn('[GAS] Failed to get base fee:', error.message);
      return BigInt(1000000000); // Default 1 gwei
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async _retryOperation(operation, operationName, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(`${operationName} attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`${operationName} failed after ${maxRetries} attempts`);
    throw lastError;
  }

  // ============ MOCK MODE IMPLEMENTATIONS ============

  _mockSubmitCommit({ commitment, metadataHash, revealWindow, accessPolicy, callerPubKey }) {
    const mockTxId = `midnight:${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();

    this.mockStorage.commitments.set(commitment, {
      commitmentHash: commitment,
      metadataHash: metadataHash,
      participant: callerPubKey || 'mock-pubkey',
      revealWindow: revealWindow,
      accessPolicy: accessPolicy,
      timestamp: now,
      revealed: false,
      cid: null,
      nonce: null,
    });

    return {
      success: true,
      commitTxId: mockTxId,
      blockHeight: Math.floor(now / 1000),
      timestamp: new Date(now).toISOString(),
    };
  }

  _mockSubmitReveal({ commitmentHash, cid, nonce, deviceSig, devicePubKey }) {
    const commitment = this.mockStorage.commitments.get(commitmentHash);

    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.revealed) {
      throw new Error('Already revealed');
    }

    const mockTxId = `midnight:${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();

    commitment.revealed = true;
    commitment.cid = cid;
    commitment.nonce = nonce;
    commitment.revealTimestamp = now;

    return {
      success: true,
      revealTxId: mockTxId,
      blockHeight: Math.floor(now / 1000),
      timestamp: new Date(now).toISOString(),
    };
  }

  _mockGetCommitment(commitmentHash) {
    const commitment = this.mockStorage.commitments.get(commitmentHash);

    if (!commitment) {
      return {
        success: false,
        error: 'Commitment not found',
      };
    }

    return {
      success: true,
      commitment: commitment,
    };
  }
}

// Export singleton instance
let midnightClient = null;

function getMidnightClient(config) {
  if (!midnightClient) {
    midnightClient = new MidnightClient(config);
  }
  return midnightClient;
}

module.exports = {
  MidnightClient,
  getMidnightClient,
};
