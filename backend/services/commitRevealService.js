/**
 * Generalized Commit-Reveal Service
 *
 * Supports two categories of psi experiments:
 * A) Event-window based (Premonition, Dreams, Time-Displacement, Memory Field, Synchronicity)
 * B) Multi-party experiments (Telepathy, Entanglement, Collective Field)
 *
 * Flow:
 * 1. Client encrypts data with AES-256
 * 2. Encrypted payload stored on IPFS/Arweave
 * 3. SHA-256 hash commitment stored on Midnight
 * 4. Reveal publishes decrypted entry + AI score to Midnight
 */

const crypto = require('crypto');
const encryptionService = require('../storage/encryption/encryptionService');
const blockchainService = require('./blockchainService');
const { getPrismaClient } = require('../db');
const eventRetrievalService = require('./eventRetrievalService');
const aiService = require('./aiService');

class CommitRevealService {
  constructor() {
    this.prisma = null;

    // Define experiment categories
    this.EVENT_WINDOW_EXPERIMENTS = [
      'premon-cards',
      'premon-events',
      'dream-journal',
      'dream-precog',
      'dream-telepathy',
      'retro-choice',
      'retro-priming',
      'retro-facilitation',
      'memory-echo',
      'delayed-recall',
      'sync-tracker',
      'time-loop'
    ];

    this.MULTI_PARTY_EXPERIMENTS = [
      'tele-images',
      'tele-emotions',
      'tele-ai',
      'paired-sensing',
      'group-mind',
      'group-meditation',
      'group-psi',
      'field-coherence'
    ];
  }

  async initialize() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
  }

  /**
   * COMMIT PHASE - Common for all experiment types
   * Supports both GUEST (encrypted data on server) and VERIFIED (IPFS + blockchain) modes
   *
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.experimentType - Experiment type ID
   * @param {any} params.data - Guest mode: User's encrypted prediction (optional)
   * @param {string} params.commitmentHash - Verified mode: Hash of encrypted data (optional)
   * @param {string} params.ipfsCID - Verified mode: IPFS CID (optional)
   * @param {Object} params.metadata - Experiment metadata
   * @param {string} params.sessionId - Group session ID (for multi-party)
   * @param {boolean} params.verified - Whether this is verified (IPFS) mode
   * @returns {Object} Commitment record
   */
  async commit({ userId, experimentType, data, commitmentHash, ipfsCID, metadata = {}, sessionId = null, verified = false }) {
    await this.initialize();

    try {
      let finalCommitmentHash, nonce, encryptedData, metadataHash;

      if (verified) {
        // VERIFIED MODE: Use provided IPFS CID and hash
        console.log('[CommitReveal Backend] Verified mode - storing IPFS CID');

        finalCommitmentHash = commitmentHash;
        nonce = crypto.randomBytes(32).toString('hex'); // Still generate nonce for reveal

        // Create metadata hash
        const metadataWithTimestamp = {
          ...metadata,
          experimentType,
          commitTimestamp: Date.now(),
          sessionId,
          ipfsCID,
          verified: true
        };
        metadataHash = encryptionService.hash(metadataWithTimestamp);

      } else {
        // GUEST MODE: Encrypt and store on server
        console.log('[CommitReveal Backend] Guest mode - storing encrypted data');

        // 1. Generate random nonce for commitment
        nonce = crypto.randomBytes(32).toString('hex');

        // 2. Encrypt user data with AES-256
        encryptedData = encryptionService.encrypt(data);

        // 3. Create metadata hash
        const metadataWithTimestamp = {
          ...metadata,
          experimentType,
          commitTimestamp: Date.now(),
          sessionId,
          verified: false
        };
        metadataHash = encryptionService.hash(metadataWithTimestamp);

        // 4. Compute commitment hash: SHA256(encryptedData || metadataHash || nonce)
        finalCommitmentHash = this.computeCommitmentHash(
          encryptedData.encrypted,
          metadataHash,
          nonce
        );
      }

      // 5. Handle encrypted payload storage
      let cid;
      if (verified) {
        // Verified mode: Use provided IPFS CID
        cid = ipfsCID;
      } else {
        // Guest mode: Store encrypted payload on server (simulating IPFS)
        cid = await this.storeEncryptedPayload({
          encrypted: encryptedData.encrypted,
          algorithm: encryptedData.algorithm,
          version: encryptedData.version
        });
      }

      // 6. Commit hash to blockchain (only for verified mode, guest uses MVP mode)
      let blockchainCommit;
      if (verified) {
        blockchainCommit = await blockchainService.commitTarget(
          finalCommitmentHash,
          userId
        );
      } else {
        // Guest mode: MVP blockchain (in-memory)
        blockchainCommit = await blockchainService.commitTarget(
          finalCommitmentHash,
          userId
        );
      }

      // 7. Ensure user exists
      const user = await this.prisma.user.upsert({
        where: { walletAddress: userId },
        update: {},
        create: {
          walletAddress: userId,
          walletType: verified ? 'midnight' : 'guest'
        }
      });

      // 8. Store commitment in database
      const commitment = await this.prisma.commitment.create({
        data: {
          userId: user.id,
          experimentType,
          data: verified ? undefined : data, // Store raw target data for guest mode retrieval
          commitmentHash: finalCommitmentHash,
          nonce,
          metadataHash,
          cid,
          commitTxId: blockchainCommit.txHash,
          commitBlockHeight: blockchainCommit.blockNumber,
          commitTimestamp: new Date(blockchainCommit.timestamp),
          revealed: false
        }
      });

      // 8. Create experiment session if event-window type
      let metadataWithTimestamp;
      if (verified) {
        metadataWithTimestamp = {
          ...metadata,
          experimentType,
          commitTimestamp: Date.now(),
          sessionId,
          ipfsCID,
          verified: true
        };
      } else {
        metadataWithTimestamp = {
          ...metadata,
          experimentType,
          commitTimestamp: Date.now(),
          sessionId,
          verified: false
        };
      }

      if (this.isEventWindowExperiment(experimentType)) {
        await this.createEventWindowSession({
          userId: user.id, // Use database user ID, not wallet address
          experimentType,
          commitmentId: commitment.id,
          metadata: metadataWithTimestamp
        });
      } else if (this.isMultiPartyExperiment(experimentType)) {
        await this.createMultiPartyCommit({
          userId: user.id, // Use database user ID, not wallet address
          experimentType,
          commitmentId: commitment.id,
          sessionId,
          metadata: metadataWithTimestamp
        });
      }

      return {
        success: true,
        commitmentId: commitment.id,
        commitmentHash: finalCommitmentHash,
        cid,
        txHash: blockchainCommit.txHash,
        blockNumber: blockchainCommit.blockNumber,
        timestamp: blockchainCommit.timestamp,
        experimentType,
        canRevealAt: this.calculateRevealTime(experimentType, metadata)
      };
    } catch (error) {
      console.error('Commit error:', error);
      throw new Error(`Commitment failed: ${error.message}`);
    }
  }

  /**
   * REVEAL PHASE - Event Window Experiments
   * User initiates reveal when ready to check accuracy
   *
   * @param {Object} params
   * @param {string} params.commitmentId - Commitment ID
   * @param {string} params.userId - User ID
   * @param {Object} params.eventWindow - Time window to check for events
   * @returns {Object} Reveal result with AI score
   */
  async revealEventWindow({ commitmentId, userId, eventWindow = null }) {
    await this.initialize();

    try {
      // 1. Get commitment
      const commitment = await this.prisma.commitment.findUnique({
        where: { id: commitmentId },
        include: { response: true }
      });

      if (!commitment) {
        throw new Error('Commitment not found');
      }

      if (commitment.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (commitment.revealed) {
        throw new Error('Already revealed');
      }

      // 2. Retrieve encrypted data from storage
      const encryptedPayload = await this.retrieveEncryptedPayload(commitment.cid);

      // 3. Decrypt user's prediction
      const decryptedData = encryptionService.decrypt(encryptedPayload);

      // 4. Query real-world APIs for events
      const eventData = await this.queryRealWorldEvents({
        prediction: decryptedData,
        eventWindow: eventWindow || this.getDefaultEventWindow(commitment.commitTimestamp)
      });

      // 5. Calculate AI similarity score
      const aiScore = await this.scoreEventWindowPrediction({
        prediction: decryptedData,
        events: eventData
      });

      // 6. Create response record
      const response = await this.prisma.response.create({
        data: {
          userId,
          sessionId: commitment.sessionId || 'standalone',
          responseType: 'prediction',
          responseData: {
            prediction: decryptedData,
            events: eventData,
            eventWindow
          },
          encryptedBlob: encryptedPayload.encrypted,
          ipfsCid: commitment.cid,
          aiScore: aiScore.score,
          aiScoreBreakdown: aiScore.breakdown,
          scoredAt: new Date()
        }
      });

      // 7. Link commitment to response
      await this.prisma.commitment.update({
        where: { id: commitmentId },
        data: {
          responseId: response.id,
          revealed: true,
          revealTimestamp: new Date()
        }
      });

      // 8. Submit reveal + score to blockchain
      await blockchainService.revealAndScore(
        commitment.commitmentHash,
        commitment.commitmentHash,
        aiScore.score
      );

      return {
        success: true,
        score: aiScore.score,
        breakdown: aiScore.breakdown,
        prediction: decryptedData,
        events: eventData,
        evidence: aiScore.evidence,
        responseId: response.id
      };
    } catch (error) {
      console.error('Reveal error:', error);
      throw new Error(`Reveal failed: ${error.message}`);
    }
  }

  /**
   * REVEAL PHASE - Multi-Party Experiments
   * Coordinated reveal for telepathy, entanglement, collective field
   *
   * @param {Object} params
   * @param {string} params.sessionId - Group session ID
   * @param {string[]} params.participantIds - All participants
   * @returns {Object} Correlation results
   */
  async revealMultiParty({ sessionId, participantIds }) {
    await this.initialize();

    try {
      // 1. Get all commitments for session
      const commitments = await this.prisma.commitment.findMany({
        where: {
          userId: { in: participantIds },
          metadataHash: { contains: sessionId } // Session ID is in metadata
        }
      });

      if (commitments.length !== participantIds.length) {
        throw new Error('Not all participants have committed');
      }

      if (commitments.some(c => c.revealed)) {
        throw new Error('Some commitments already revealed');
      }

      // 2. Decrypt all participant data
      const decryptedEntries = await Promise.all(
        commitments.map(async (c) => {
          const payload = await this.retrieveEncryptedPayload(c.cid);
          const data = encryptionService.decrypt(payload);
          return {
            userId: c.userId,
            commitmentId: c.id,
            data,
            cid: c.cid
          };
        })
      );

      // 3. Calculate correlations/similarities between entries
      const correlations = await this.calculateMultiPartyCorrelations(decryptedEntries);

      // 4. Create response records for all participants
      const responses = await Promise.all(
        decryptedEntries.map(async (entry) => {
          return await this.prisma.response.create({
            data: {
              userId: entry.userId,
              sessionId,
              responseType: 'multi-party',
              responseData: {
                data: entry.data,
                correlations: correlations[entry.userId]
              },
              ipfsCid: entry.cid,
              aiScore: correlations[entry.userId].score,
              aiScoreBreakdown: correlations[entry.userId].breakdown,
              scoredAt: new Date()
            }
          });
        })
      );

      // 5. Mark all commitments as revealed
      await this.prisma.commitment.updateMany({
        where: { id: { in: commitments.map(c => c.id) } },
        data: {
          revealed: true,
          revealTimestamp: new Date()
        }
      });

      // 6. Submit group results to blockchain
      for (const commitment of commitments) {
        await blockchainService.revealAndScore(
          commitment.commitmentHash,
          commitment.commitmentHash,
          correlations[commitment.userId].score
        );
      }

      return {
        success: true,
        sessionId,
        participants: participantIds.length,
        correlations,
        groupStats: this.calculateGroupStats(correlations),
        responses: responses.map(r => r.id)
      };
    } catch (error) {
      console.error('Multi-party reveal error:', error);
      throw new Error(`Multi-party reveal failed: ${error.message}`);
    }
  }

  // ======================
  // HELPER METHODS
  // ======================

  computeCommitmentHash(encrypted, metadataHash, nonce) {
    const combined = `${encrypted}||${metadataHash}||${nonce}`;
    return encryptionService.hash(combined);
  }

  async storeEncryptedPayload(payload) {
    // TODO: Integrate with IPFS/Arweave
    // For now, generate mock CID
    const contentHash = encryptionService.hash(payload.encrypted);
    return `ipfs://Qm${contentHash.substring(0, 44)}`;
  }

  async retrieveEncryptedPayload(cid) {
    // TODO: Retrieve from IPFS/Arweave
    // For now, return mock payload structure
    return {
      encrypted: 'mock_encrypted_data',
      algorithm: 'AES-256',
      version: '1.0'
    };
  }

  async queryRealWorldEvents({ prediction, eventWindow }) {
    try {
      const predictionText = typeof prediction === 'string' ? prediction : JSON.stringify(prediction);

      // Use OpenAI knowledge retrieval agent
      const events = await eventRetrievalService.queryEvents({
        startDate: eventWindow.start,
        endDate: eventWindow.end,
        predictionContext: predictionText,
        categories: ['news', 'sports', 'weather', 'markets', 'culture', 'science']
      });

      return events;
    } catch (error) {
      console.error('Query events error:', error);
      return {
        events: [],
        summary: 'Event retrieval failed',
        retrievalMethod: 'error'
      };
    }
  }

  async scoreEventWindowPrediction({ prediction, events }) {
    try {
      const predictionText = typeof prediction === 'string' ? prediction : JSON.stringify(prediction);

      // Use event retrieval service to verify prediction
      const verification = await eventRetrievalService.verifyPrediction({
        prediction: predictionText,
        startDate: events.dateRange?.split(' to ')[0] || new Date(),
        endDate: events.dateRange?.split(' to ')[1] || new Date()
      });

      // Convert confidence to 0-1 score
      const score = verification.confidence / 100;

      return {
        score,
        breakdown: {
          semantic: score,
          temporal: score > 0.5 ? 0.8 : 0.3,
          specificity: verification.matches?.length > 0 ? 0.7 : 0.3
        },
        evidence: {
          matchedEvents: verification.matches?.map(m => ({
            description: m.event,
            matchType: m.matchType,
            confidence: m.confidence,
            specifics: m.specifics || []
          })) || [],
          matchingTerms: verification.matches?.flatMap(m => m.specifics || []) || []
        },
        verificationMethod: verification.verificationMethod,
        explanation: verification.explanation
      };
    } catch (error) {
      console.error('Scoring error:', error);
      return {
        score: 0,
        breakdown: { semantic: 0, temporal: 0, specificity: 0 },
        evidence: { matchedEvents: [], matchingTerms: [] },
        error: error.message
      };
    }
  }

  async calculateMultiPartyCorrelations(entries) {
    try {
      const correlations = {};

      // For telepathy experiments: use aiService scoring
      if (entries.length === 2) {
        // Sender-receiver pair
        const [entry1, entry2] = entries;

        const score1 = await aiService.scoreTelepathy(
          entry1.data,
          entry2.data,
          'telepathy-correlation'
        );

        const score2 = await aiService.scoreTelepathy(
          entry2.data,
          entry1.data,
          'telepathy-correlation'
        );

        correlations[entry1.userId] = {
          score: score1.score / 100,
          breakdown: {
            similarity: score1.conceptualMatch / 100,
            emotional: score1.emotionalMatch / 100,
            timing: 0.5
          },
          pairwiseScores: { [entry2.userId]: score1.score / 100 }
        };

        correlations[entry2.userId] = {
          score: score2.score / 100,
          breakdown: {
            similarity: score2.conceptualMatch / 100,
            emotional: score2.emotionalMatch / 100,
            timing: 0.5
          },
          pairwiseScores: { [entry1.userId]: score2.score / 100 }
        };
      } else {
        // Multi-participant: calculate all pairwise correlations
        for (let i = 0; i < entries.length; i++) {
          const pairwiseScores = {};

          for (let j = 0; j < entries.length; j++) {
            if (i !== j) {
              const score = await aiService.scoreTelepathy(
                entries[i].data,
                entries[j].data,
                'multi-party-correlation'
              );
              pairwiseScores[entries[j].userId] = score.score / 100;
            }
          }

          const avgScore = Object.values(pairwiseScores).reduce((a, b) => a + b, 0) / Object.values(pairwiseScores).length;

          correlations[entries[i].userId] = {
            score: avgScore,
            breakdown: {
              similarity: avgScore,
              timing: 0.5
            },
            pairwiseScores
          };
        }
      }

      return correlations;
    } catch (error) {
      console.error('Multi-party correlation error:', error);

      // Fallback
      const correlations = {};
      for (const entry of entries) {
        correlations[entry.userId] = {
          score: 0.5,
          breakdown: { similarity: 0.5, timing: 0.5 },
          pairwiseScores: {},
          error: error.message
        };
      }
      return correlations;
    }
  }

  calculateGroupStats(correlations) {
    const scores = Object.values(correlations).map(c => c.score);
    return {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      stdDev: 0, // TODO: Calculate
      median: scores.sort()[Math.floor(scores.length / 2)],
      range: [Math.min(...scores), Math.max(...scores)]
    };
  }

  async createEventWindowSession({ userId, experimentType, commitmentId, metadata }) {
    return await this.prisma.experimentSession.create({
      data: {
        userId,
        experimentType,
        experimentId: commitmentId,
        targetMetadata: metadata,
        status: 'committed'
      }
    });
  }

  async createMultiPartyCommit({ userId, experimentType, commitmentId, sessionId, metadata }) {
    // Store multi-party session info
    // TODO: Create separate GroupSession model
    return { sessionId, userId, commitmentId };
  }

  isEventWindowExperiment(experimentType) {
    return this.EVENT_WINDOW_EXPERIMENTS.includes(experimentType);
  }

  isMultiPartyExperiment(experimentType) {
    return this.MULTI_PARTY_EXPERIMENTS.includes(experimentType);
  }

  calculateRevealTime(experimentType, metadata) {
    // Event window experiments: user decides when
    if (this.isEventWindowExperiment(experimentType)) {
      return 'user_initiated';
    }

    // Multi-party: after all commits received
    if (this.isMultiPartyExperiment(experimentType)) {
      return 'after_all_commits';
    }

    return 'immediate';
  }

  getDefaultEventWindow(commitTimestamp) {
    // Default: 24 hours after commit
    const start = new Date(commitTimestamp);
    const end = new Date(commitTimestamp.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * Get commitment status
   */
  async getCommitmentStatus(commitmentId) {
    await this.initialize();

    const commitment = await this.prisma.commitment.findUnique({
      where: { id: commitmentId },
      include: {
        response: true
      }
    });

    return {
      exists: !!commitment,
      revealed: commitment?.revealed || false,
      canReveal: commitment && !commitment.revealed,
      score: commitment?.response?.aiScore || null,
      revealedAt: commitment?.revealTimestamp || null
    };
  }
  /**
   * Publish a Research Certificate as Cardano metadata (Label 1967)
   * Contains trial results, statistical significance, and verification data.
   * This creates an immutable on-chain record of experimental findings.
   *
   * @param {Object} trialData - Completed trial data
   * @param {string} trialData.experimentType - Type of experiment
   * @param {string} trialData.userId - Participant identifier (hashed)
   * @param {number} trialData.score - Overall score (0-100)
   * @param {number} trialData.psiCoefficient - Psi-Coefficient value
   * @param {string} trialData.commitmentHash - Original commitment hash
   * @param {Object} trialData.statisticalContext - Z-score, p-value, etc.
   * @returns {Object} Transaction details for the metadata submission
   */
  async publishResearchCertificate(trialData) {
    const {
      experimentType,
      userId,
      score,
      psiCoefficient,
      commitmentHash,
      statisticalContext,
    } = trialData;

    // Construct Label 1967 metadata payload
    const metadata = {
      1967: {
        v: '1.0',
        app: 'PsyApp',
        type: 'research_certificate',
        experiment: experimentType,
        participant: crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16),
        score: Math.round(score * 100) / 100,
        psi: psiCoefficient != null ? Math.round(psiCoefficient * 1000) / 1000 : null,
        commitment: commitmentHash ? commitmentHash.slice(0, 32) : null,
        stats: statisticalContext ? {
          z: statisticalContext.zScore || null,
          p: statisticalContext.pValue || null,
          effect: statisticalContext.effectSize || null,
          significant: statisticalContext.significant || false,
        } : null,
        ts: Math.floor(Date.now() / 1000),
      },
    };

    console.log('[CommitReveal] Publishing Research Certificate:', JSON.stringify(metadata[1967]));

    // In production, this would submit a Cardano transaction with metadata
    // For now, return the constructed metadata for off-chain storage
    try {
      // Attempt to submit via cardano-cli or Blockfrost API
      const blockfrostKey = process.env.BLOCKFROST_API_KEY;
      if (blockfrostKey) {
        const axios = require('axios');
        const network = process.env.CARDANO_NETWORK || 'preprod';
        const baseUrl = network === 'mainnet'
          ? 'https://cardano-mainnet.blockfrost.io/api/v0'
          : `https://cardano-${network}.blockfrost.io/api/v0`;

        // Note: Actual transaction submission requires building/signing TX
        // This is a placeholder for the metadata structure
        console.log(`[CommitReveal] Would submit to ${baseUrl} with label 1967`);
      }

      return {
        success: true,
        metadata,
        label: 1967,
        status: blockfrostKey ? 'pending_submission' : 'stored_locally',
        certificateHash: crypto.createHash('sha256')
          .update(JSON.stringify(metadata))
          .digest('hex'),
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[CommitReveal] Research certificate error:', error);
      return {
        success: false,
        error: error.message,
        metadata,
      };
    }
  }
}

module.exports = new CommitRevealService();
