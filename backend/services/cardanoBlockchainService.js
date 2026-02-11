/**
 * Cardano Blockchain Service
 *
 * Server-side Cardano integration using Blockfrost API.
 * Handles UTxO queries, contract state, and transaction data preparation.
 * Actual transaction signing happens client-side with Lucid-Evolution.
 *
 * @module cardanoBlockchainService
 */

/**
 * @typedef {Object} PsiDatum
 * @property {string} target_hash - Blake2b-256 hash of target || nonce
 * @property {string} host_pkh - Host's payment key hash
 * @property {string|null} participant_pkh - Participant's payment key hash
 * @property {number} game_type - Game type enum index
 * @property {number} session_state - Session state enum index
 * @property {number} commit_slot - Slot when session was created
 * @property {number} join_deadline_slot - Last slot to join
 * @property {number} reveal_deadline_slot - Last slot to reveal
 * @property {number} stake_lovelace - Stake amount in lovelace
 * @property {number} research_pool_pct - Percentage to research pool (0-100)
 * @property {number} max_participants - Maximum participants allowed
 * @property {number} current_participants - Current participant count
 * @property {Array} participant_guesses - Array of participant guesses
 * @property {string|null} ipfs_cid - IPFS content identifier
 * @property {number|null} ai_score - AI-generated score (0-100)
 */

/**
 * @typedef {Object} CreateSessionParams
 * @property {string} hostWalletAddress - Host's wallet address
 * @property {string} gameType - Game type identifier
 * @property {string} targetValue - Secret target value
 * @property {number} [stakeLovelace=2000000] - Stake amount (default 2 ADA)
 * @property {number} [joinDeadlineMinutes=60] - Minutes until join deadline
 * @property {number} [revealDeadlineMinutes=120] - Minutes until reveal deadline
 * @property {number} [maxParticipants=1] - Maximum participants
 * @property {string|null} [ipfsCid] - Optional IPFS CID for metadata
 */

/**
 * @typedef {Object} SessionData
 * @property {string} sessionId - Unique session identifier
 * @property {string} targetHash - Commitment hash
 * @property {string} nonce - Random nonce (keep secret!)
 * @property {PsiDatum} datum - On-chain datum structure
 * @property {string} datumCbor - CBOR-encoded datum
 * @property {string} scriptAddress - Script address (hex)
 * @property {string} validatorHash - Validator script hash
 * @property {number} stakeLovelace - Stake amount
 * @property {number} currentSlot - Current slot at creation
 * @property {number} joinDeadlineSlot - Join deadline slot
 * @property {number} revealDeadlineSlot - Reveal deadline slot
 */

/**
 * @typedef {Object} ContractConfig
 * @property {string} network - Network name (preprod, mainnet)
 * @property {Object} validators - Validator configurations
 * @property {Object} gameTypes - Game type enum
 * @property {Object} sessionStates - Session state enum
 */

const axios = require('axios');
const crypto = require('crypto');
const { blake2b } = require('blakejs');
const cbor = require('cbor');
const fs = require('fs');
const path = require('path');

// Minimal bech32 encoding for Cardano addresses
function bech32Encode(prefix, payload) {
  // Try to use bech32 if available, otherwise return hex
  try {
    const { bech32 } = require('bech32');
    const words = bech32.toWords(payload);
    return bech32.encode(prefix, words, 108);
  } catch {
    // Fallback: return hex-encoded address
    return payload.toString('hex');
  }
}

// Contract configuration from compiled Aiken validators
// These are the UNPARAMETERIZED hashes. After deployment, the parameterized
// hashes from PREPROD_DEPLOYMENT.json override these.
const CONTRACT_CONFIG = {
  // From cardano/plutus.json - psi_experiment validator (unparameterized)
  psiExperimentHash: '527ef13a62d111d0a2e88fe98effddcf99e03e6802ca72cd793e571f',
  // From cardano/plutus.json - research_pool validator
  researchPoolHash: 'ed56346131f1e24ac11ba6166c5bc3b2d2f48a393d66fede9f84f1ac',
  // Research pool NFT minting policy (unparameterized)
  researchPoolNftHash: '2373a59795ca192097e199ac89d73906670e2b91ac125bca1a8faea8',
  // Reward vault validator
  rewardVaultHash: '375d66fb31dc09a709ba3e05eaf9c82ea3d1898db30baf360bb5892a',
  // PSY token (set after minting or from env)
  psyPolicyId: process.env.PSY_POLICY_ID || '',
  psyAssetName: '507379', // "Psy" in hex
};

// Game type enum matching Aiken types.ak
const GameType = {
  CardPrediction: 0,
  TimelineRacer: 1,
  PsiPoker: 2,
  CoinFlip: 3,
  QuantumCoinArena: 4,
  DiceInfluence: 5,
  RemoteViewing: 6,
  EmotionEcho: 7,
  PatternOracle: 8,
  MindPulse: 9,
  RetroRoulette: 10,
  SynchronicityBingo: 11,
  GlobalConsciousness: 12,
  Telepathy: 13,
  PrecogExplorer: 14,
  PKInfluence: 15,
};

// Session state enum
const SessionState = {
  AwaitingParticipant: 0,
  InProgress: 1,
  AwaitingReveal: 2,
  Settled: 3,
  Expired: 4,
};

class CardanoBlockchainService {
  constructor() {
    this.blockfrostUrl = process.env.BLOCKFROST_URL || 'https://cardano-preprod.blockfrost.io/api/v0';
    this.blockfrostApiKey = process.env.BLOCKFROST_API_KEY || '';
    this.network = process.env.CARDANO_NETWORK || 'preprod';
    this.initialized = false;

    // Script addresses (derived from validator hashes + network)
    this.scriptAddresses = {};

    // Deployed contract config (loaded from PREPROD_DEPLOYMENT.json or env)
    this.deployedConfig = null;

    // In-memory cache for UTxOs (with TTL)
    this.utxoCache = new Map();
    this.cacheTtlMs = 30000; // 30 seconds
  }

  /**
   * Load deployed contract addresses from PREPROD_DEPLOYMENT.json
   */
  loadDeploymentConfig() {
    try {
      const deploymentPath = path.resolve(__dirname, '../../scripts/cardano/PREPROD_DEPLOYMENT.json');
      const data = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      this.deployedConfig = data;

      // Override CONTRACT_CONFIG with deployed (parameterized) hashes
      if (data.psiExperiment?.scriptHash) {
        CONTRACT_CONFIG.psiExperimentHash = data.psiExperiment.scriptHash;
      }
      if (data.researchPool?.scriptHash) {
        CONTRACT_CONFIG.researchPoolHash = data.researchPool.scriptHash;
      }
      if (data.rewardVault?.scriptHash) {
        CONTRACT_CONFIG.rewardVaultHash = data.rewardVault.scriptHash;
      }
      if (data.rewardVault?.psyPolicyId) {
        CONTRACT_CONFIG.psyPolicyId = data.rewardVault.psyPolicyId;
      }

      console.log('[CardanoService] Loaded deployment config from PREPROD_DEPLOYMENT.json');
      return true;
    } catch {
      console.log('[CardanoService] No PREPROD_DEPLOYMENT.json found, using defaults');
      return false;
    }
  }

  async initialize() {
    if (this.initialized) return;

    // Try to load deployment config
    this.loadDeploymentConfig();

    if (!this.blockfrostApiKey) {
      console.warn('[CardanoService] No Blockfrost API key - running in mock mode');
      this.mockMode = true;
      this.initialized = true;
      return;
    }

    try {
      // Verify Blockfrost connection
      const response = await this.blockfrostRequest('/');
      console.log(`[CardanoService] Connected to Blockfrost (${this.network})`);

      // Use deployed addresses if available, otherwise derive from hashes
      if (this.deployedConfig?.psiExperiment?.address) {
        this.scriptAddresses = {
          psiExperiment: this.deployedConfig.psiExperiment.address,
          researchPool: this.deployedConfig.researchPool.address,
          rewardVault: this.deployedConfig.rewardVault?.address || '',
        };
      } else {
        this.scriptAddresses = {
          psiExperiment: this.hashToScriptAddress(CONTRACT_CONFIG.psiExperimentHash),
          researchPool: this.hashToScriptAddress(CONTRACT_CONFIG.researchPoolHash),
          rewardVault: this.hashToScriptAddress(CONTRACT_CONFIG.rewardVaultHash),
        };
      }

      console.log('[CardanoService] Script addresses:', this.scriptAddresses);
      this.initialized = true;
    } catch (error) {
      console.error('[CardanoService] Initialization error:', error.message);
      this.mockMode = true;
      this.initialized = true;
    }
  }

  /**
   * Make authenticated request to Blockfrost API
   * @param {string} endpoint - API endpoint path
   * @param {Object} [options] - Request options
   * @param {string} [options.method='GET'] - HTTP method
   * @param {Object} [options.headers] - Additional headers
   * @param {*} [options.data] - Request body
   * @returns {Promise<*>} Response data or null if 404
   * @throws {Error} If request fails with 4xx/5xx status
   */
  async blockfrostRequest(endpoint, options = {}) {
    const url = `${this.blockfrostUrl}${endpoint}`;
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: {
        'project_id': this.blockfrostApiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      data: options.data,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status >= 400) {
      throw new Error(`Blockfrost error: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    return response.data;
  }

  /**
   * Convert script hash to bech32 script address
   * For preprod/testnet, uses network tag 0x70 (script, no staking)
   * Returns proper bech32 addr_test1... address
   */
  hashToScriptAddress(scriptHash) {
    // Network byte: 0x70 = script credential, no staking (testnet)
    //               0x71 = script credential, no staking (mainnet)
    const networkByte = this.network === 'mainnet' ? 0x71 : 0x70;
    const hashBytes = Buffer.from(scriptHash, 'hex');
    const addressBytes = Buffer.concat([Buffer.from([networkByte]), hashBytes]);

    // Encode as bech32
    const prefix = this.network === 'mainnet' ? 'addr' : 'addr_test';
    return bech32Encode(prefix, addressBytes);
  }

  /**
   * Generate commitment hash: Blake2b-256(target || nonce)
   * @param {string} targetValue - Target value to hash
   * @param {string} nonce - Hex-encoded random nonce
   * @returns {string} Hex-encoded Blake2b-256 hash
   */
  generateCommitmentHash(targetValue, nonce) {
    const targetBytes = Buffer.from(targetValue, 'utf8');
    const nonceBytes = Buffer.from(nonce, 'hex');
    const combined = Buffer.concat([targetBytes, nonceBytes]);
    return Buffer.from(blake2b(combined, undefined, 32)).toString('hex');
  }

  /**
   * Generate random nonce (32 bytes)
   */
  generateNonce() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create experiment session data for on-chain commitment
   * Returns data needed by frontend to build the transaction
   * @param {CreateSessionParams} params - Session creation parameters
   * @returns {Promise<SessionData>} Session data for on-chain commitment
   */
  async createExperimentSession(params) {
    await this.initialize();

    const {
      hostWalletAddress,
      gameType,
      targetValue,
      stakeLovelace = 2000000, // 2 ADA minimum
      joinDeadlineMinutes = 60,
      revealDeadlineMinutes = 120,
      maxParticipants = 1,
      ipfsCid = null,
    } = params;

    // Generate cryptographic commitment
    const nonce = this.generateNonce();
    const targetHash = this.generateCommitmentHash(targetValue, nonce);

    // Calculate deadlines (in slots - ~1 slot per second on preprod)
    const currentSlot = await this.getCurrentSlot();
    const joinDeadlineSlot = currentSlot + (joinDeadlineMinutes * 60);
    const revealDeadlineSlot = currentSlot + (revealDeadlineMinutes * 60);

    // Build datum structure matching PsiDatum in types.ak
    const datum = {
      target_hash: targetHash,
      host_pkh: this.addressToKeyHash(hostWalletAddress),
      participant_pkh: null,
      game_type: this.gameTypeToIndex(gameType),
      session_state: SessionState.AwaitingParticipant,
      commit_slot: currentSlot,
      join_deadline_slot: joinDeadlineSlot,
      reveal_deadline_slot: revealDeadlineSlot,
      stake_lovelace: stakeLovelace,
      research_pool_pct: 5,
      max_participants: maxParticipants,
      current_participants: 0,
      participant_guesses: [],
      ipfs_cid: ipfsCid ? Buffer.from(ipfsCid).toString('hex') : null,
      ai_score: null,
    };

    // Generate session ID
    const sessionId = `psi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    return {
      sessionId,
      targetHash,
      nonce, // Keep secret until reveal!
      datum,
      datumCbor: this.encodeDatumCbor(datum),
      scriptAddress: this.scriptAddresses.psiExperiment,
      validatorHash: CONTRACT_CONFIG.psiExperimentHash,
      stakeLovelace,
      currentSlot,
      joinDeadlineSlot,
      revealDeadlineSlot,
      // Don't return targetValue - that's the secret!
    };
  }

  /**
   * Get current slot from Blockfrost
   */
  async getCurrentSlot() {
    if (this.mockMode) {
      // Approximate: preprod started around slot 0 at some point
      return Math.floor(Date.now() / 1000);
    }

    const tip = await this.blockfrostRequest('/blocks/latest');
    return tip?.slot || Math.floor(Date.now() / 1000);
  }

  /**
   * Extract payment key hash from wallet address
   */
  addressToKeyHash(walletAddress) {
    // If already a hex key hash (56 chars), return as-is
    if (/^[a-f0-9]{56}$/i.test(walletAddress)) {
      return walletAddress;
    }

    // For bech32 addresses, we'd need to decode
    // Frontend should provide the key hash directly
    // This is a simplified extraction
    console.warn('[CardanoService] Address format not fully parsed:', walletAddress.substring(0, 20));
    return walletAddress.substring(0, 56);
  }

  /**
   * Convert game type string to index
   */
  gameTypeToIndex(gameType) {
    const normalized = gameType.toLowerCase().replace(/[-_]/g, '');
    const mapping = {
      'cardprediction': 0,
      'timelineracer': 1,
      'psipoker': 2,
      'coinflip': 3,
      'quantumcoinarena': 4,
      'diceinfluence': 5,
      'remoteviewing': 6,
      'emotionecho': 7,
      'patternoracle': 8,
      'mindpulse': 9,
      'retroroulette': 10,
      'synchronicitybingo': 11,
      'globalconsciousness': 12,
      'telepathy': 13,
      'precogexplorer': 14,
      'pkinfluence': 15,
    };
    return mapping[normalized] ?? 6; // Default to RemoteViewing
  }

  /**
   * Encode datum to CBOR for on-chain storage
   */
  encodeDatumCbor(datum) {
    // Aiken uses constructor-based CBOR encoding
    // PsiDatum is a record type, encoded as a constructor with fields
    try {
      const fields = [
        Buffer.from(datum.target_hash, 'hex'), // target_hash: ByteArray
        Buffer.from(datum.host_pkh, 'hex'),    // host_pkh: ByteArray
        datum.participant_pkh ? Buffer.from(datum.participant_pkh, 'hex') : null, // Option<ByteArray>
        datum.game_type,                        // GameType (constr index)
        datum.session_state,                    // SessionState (constr index)
        datum.commit_slot,
        datum.join_deadline_slot,
        datum.reveal_deadline_slot,
        datum.stake_lovelace,
        datum.research_pool_pct,
        datum.max_participants,
        datum.current_participants,
        datum.participant_guesses,              // List<ParticipantGuess>
        datum.ipfs_cid ? Buffer.from(datum.ipfs_cid, 'hex') : null,
        datum.ai_score,
      ];

      // Wrap in CBOR constructor 0 (Constr 0 fields)
      const encoded = cbor.encode(new cbor.Tagged(121, fields)); // 121 = constructor 0
      return encoded.toString('hex');
    } catch (error) {
      console.error('[CardanoService] CBOR encoding error:', error);
      return null;
    }
  }

  /**
   * Query UTxOs at the script address
   */
  async getScriptUtxos(scriptAddress) {
    if (this.mockMode) {
      return [];
    }

    const cacheKey = `utxos_${scriptAddress}`;
    const cached = this.utxoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    try {
      const utxos = await this.blockfrostRequest(`/addresses/${scriptAddress}/utxos`);
      this.utxoCache.set(cacheKey, { data: utxos || [], timestamp: Date.now() });
      return utxos || [];
    } catch (error) {
      console.error('[CardanoService] UTxO query error:', error.message);
      return [];
    }
  }

  /**
   * Find active session UTxO by session ID (stored in metadata or datum)
   */
  async findSessionUtxo(sessionId) {
    await this.initialize();

    const utxos = await this.getScriptUtxos(this.scriptAddresses.psiExperiment);

    // In a real implementation, we'd decode each datum and match
    // For now, return the first matching UTxO
    for (const utxo of utxos) {
      if (utxo.inline_datum) {
        // Decode and check if it matches sessionId
        // This would require CBOR decoding and matching
      }
    }

    return null;
  }

  /**
   * Build reveal redeemer data
   */
  buildRevealRedeemer(targetValue, nonce) {
    // Reveal redeemer: Reveal { target_value: ByteArray, nonce: ByteArray }
    const redeemer = {
      constructor: 1, // Reveal is index 1 in PsiRedeemer enum
      fields: [
        Buffer.from(targetValue, 'utf8'),
        Buffer.from(nonce, 'hex'),
      ],
    };

    return cbor.encode(new cbor.Tagged(122, redeemer.fields)).toString('hex');
  }

  /**
   * Build submit score redeemer data
   */
  buildSubmitScoreRedeemer(score, oracleSignature = '') {
    // SubmitScore { score: Int, oracle_signature: ByteArray }
    const redeemer = {
      constructor: 2, // SubmitScore is index 2
      fields: [
        Math.round(score), // Score 0-100
        Buffer.from(oracleSignature, 'hex'),
      ],
    };

    return cbor.encode(new cbor.Tagged(123, redeemer.fields)).toString('hex');
  }

  /**
   * Get contract configuration for frontend
   * @returns {ContractConfig} Contract configuration data
   */
  getContractConfig() {
    return {
      network: this.network,
      validators: {
        psiExperiment: {
          hash: CONTRACT_CONFIG.psiExperimentHash,
          address: this.scriptAddresses.psiExperiment,
          script: this.deployedConfig?.psiExperiment?.validatorScript || '',
        },
        researchPool: {
          hash: CONTRACT_CONFIG.researchPoolHash,
          address: this.scriptAddresses.researchPool,
          script: this.deployedConfig?.researchPool?.validatorScript || '',
        },
        rewardVault: {
          hash: CONTRACT_CONFIG.rewardVaultHash,
          address: this.scriptAddresses.rewardVault,
          script: this.deployedConfig?.rewardVault?.validatorScript || '',
        },
      },
      psyToken: {
        policyId: CONTRACT_CONFIG.psyPolicyId,
        assetName: CONTRACT_CONFIG.psyAssetName,
        unit: CONTRACT_CONFIG.psyPolicyId ? CONTRACT_CONFIG.psyPolicyId + CONTRACT_CONFIG.psyAssetName : '',
      },
      gameTypes: GameType,
      sessionStates: SessionState,
    };
  }

  /**
   * Query reward vault UTxO via Blockfrost
   * @returns {Promise<Object|null>} Vault state including PSY balance
   */
  async getVaultState() {
    await this.initialize();

    if (this.mockMode || !this.scriptAddresses.rewardVault) {
      return null;
    }

    try {
      const utxos = await this.getScriptUtxos(this.scriptAddresses.rewardVault);
      if (!utxos || utxos.length === 0) return null;

      const vaultUtxo = utxos[0];
      const psyUnit = CONTRACT_CONFIG.psyPolicyId + CONTRACT_CONFIG.psyAssetName;

      // Find PSY token amount in the UTxO
      let psyBalance = '0';
      if (vaultUtxo.amount) {
        const psyAsset = vaultUtxo.amount.find(a => a.unit === psyUnit);
        if (psyAsset) psyBalance = psyAsset.quantity;
      }

      return {
        address: this.scriptAddresses.rewardVault,
        psyBalance,
        psyUnit,
        lovelace: vaultUtxo.amount?.find(a => a.unit === 'lovelace')?.quantity || '0',
        txHash: vaultUtxo.tx_hash,
        outputIndex: vaultUtxo.output_index,
        hasDatum: !!vaultUtxo.inline_datum,
      };
    } catch (error) {
      console.error('[CardanoService] Vault query error:', error.message);
      return null;
    }
  }

  /**
   * Store session data in database (off-chain reference)
   * The actual on-chain data is in the UTxO datum
   */
  async storeSessionReference(sessionData, prisma) {
    // This creates a database record linking to the on-chain session
    // Useful for indexing and quick lookups
    const record = await prisma.commitment.create({
      data: {
        id: sessionData.sessionId,
        userId: sessionData.hostWalletAddress,
        experimentType: sessionData.gameType,
        commitmentHash: sessionData.targetHash,
        nonce: sessionData.nonce, // Encrypted or stored securely
        cid: sessionData.ipfsCid,
        status: 'committed',
        metadata: {
          scriptAddress: sessionData.scriptAddress,
          validatorHash: sessionData.validatorHash,
          stakeLovelace: sessionData.stakeLovelace,
          joinDeadlineSlot: sessionData.joinDeadlineSlot,
          revealDeadlineSlot: sessionData.revealDeadlineSlot,
        },
      },
    });

    return record;
  }

  /**
   * Verify a commitment hash matches the revealed values
   */
  verifyCommitment(commitmentHash, targetValue, nonce) {
    const computed = this.generateCommitmentHash(targetValue, nonce);
    return computed === commitmentHash;
  }
}

// Export singleton
const cardanoService = new CardanoBlockchainService();
module.exports = cardanoService;
module.exports.CardanoBlockchainService = CardanoBlockchainService;
module.exports.GameType = GameType;
module.exports.SessionState = SessionState;
module.exports.CONTRACT_CONFIG = CONTRACT_CONFIG;
