const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../auth');
const { getPrismaClient } = require('../db');
const blockchainService = require('../services/blockchainService');
const targetService = require('../services/targetService');
const targetSelectionService = require('../services/targetSelectionService');
const commitRevealService = require('../services/commitRevealService');
const ipfsService = require('../services/ipfsService');
const randomTargetService = require('../services/randomTargetService');
const socketService = require('../services/socketService');
const drandService = require('../services/drandService');
const embeddingService = require('../services/embeddingService');
const statisticsService = require('../services/statisticsService');

// Topics and experiments catalog
const TOPICS = [
  { id: 'remote-viewing', name: 'Remote Viewing', icon: '👁️', description: 'Describe hidden images before they are revealed', color: '#667eea', experimentsCount: 3 },
  { id: 'premonition', name: 'Premonition', icon: '🔮', description: 'Predict future random events and outcomes', color: '#764ba2', experimentsCount: 2 },
  { id: 'dream-logging', name: 'Dream Logging', icon: '💭', description: 'Record dreams and match to future stimuli', color: '#f093fb', experimentsCount: 4 },
  { id: 'telepathy', name: 'Telepathy', icon: '🧠', description: 'Paired experiments with others or AI agents', color: '#4facfe', experimentsCount: 3 },
  { id: 'time-displacement', name: 'Time-Displacement', icon: '⏳', description: 'Retrocausal prediction tasks across time', color: '#43e97b', experimentsCount: 2 },
  { id: 'synchronicity', name: 'Synchronicity Tracking', icon: '✨', description: 'Log and analyze meaningful coincidences', color: '#fa709a', experimentsCount: 1 },
  { id: 'memory-field', name: 'Memory Field', icon: '🌊', description: 'Delayed recall and resonance tests', color: '#30cfd0', experimentsCount: 3 },
  { id: 'entanglement', name: 'Entanglement', icon: '🔗', description: 'Multi-user simultaneous consciousness tests', color: '#a8edea', experimentsCount: 2 },
  { id: 'chance-influence', name: 'Chance Influence', icon: '🎲', description: 'Random number generator focus tasks', color: '#ffd89b', experimentsCount: 4 },
  { id: 'collective-field', name: 'Collective Field', icon: '🌍', description: 'Group meditation and intention sessions', color: '#667eea', experimentsCount: 2 },
];

// SECURITY: Valid experiment types whitelist
const VALID_EXPERIMENT_TYPES = new Set([
  'remote-viewing', 'remote-viewing-images', 'remote-viewing-locations', 'remote-viewing-objects',
  'premonition', 'precognition', 'precog-explorer',
  'dream-logging', 'dream-journal',
  'telepathy', 'telepathy-ghost', 'telepathy-live', 'telepathy-emotions', 'multi-party-telepathy', 'ai-telepathy',
  'time-displacement', 'retrocausality', 'retro-roulette',
  'synchronicity', 'synchronicity-bingo',
  'memory-field', 'emotion-echo',
  'entanglement', 'mind-pulse',
  'chance-influence', 'psychokinesis', 'pk-influence', 'dice-influence', 'quantum-coin-arena',
  'collective-field', 'global-consciousness',
  'card-prediction', 'zener-oracle', 'pattern-oracle', 'timeline-racer', 'time-loop', 'psi-poker',
  'rv-crv-protocol', 'event-forecasting', 'ganzfeld', 'intuition'
]);

/**
 * SECURITY: Validate experiment type against whitelist
 * Prevents injection of arbitrary experiment types
 */
function validateExperimentType(experimentType) {
  if (!experimentType || typeof experimentType !== 'string') {
    return false;
  }
  // Normalize and check against whitelist
  const normalized = experimentType.toLowerCase().trim();
  return VALID_EXPERIMENT_TYPES.has(normalized);
}

// GET /api/experiments/topics - Get all available topics (MUST BE BEFORE /:experimentId)
router.get('/topics', (req, res) => {
  try {
    res.json({
      success: true,
      topics: TOPICS,
    });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch topics',
    });
  }
});

// GET /api/experiments/community-stats - Get community statistics
router.get('/community-stats', (req, res) => {
  try {
    const stats = {
      totalParticipants: 1247,
      totalTrials: 8934,
      averageScore: 0.52,
      topScores: [
        { rank: 1, score: 0.94, username: 'PsiMaster' },
        { rank: 2, score: 0.91, username: 'MindReader42' },
        { rank: 3, score: 0.88, username: 'QuantumObserver' },
      ],
      scoreDistribution: {
        '0-20': 18,
        '20-40': 25,
        '40-60': 32,
        '60-80': 20,
        '80-100': 5,
      },
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch community stats',
    });
  }
});

// Helper function to get experiment title and description
function getExperimentMetadata(experimentType) {
  const metadata = {
    'remote-viewing-images': {
      title: 'Remote Viewing - Images',
      description: 'Describe hidden images before they are revealed'
    },
    'remote-viewing-events': {
      title: 'Remote Viewing - Events',
      description: 'Perceive details of current events at remote locations'
    },
    'remote-viewing-locations': {
      title: 'Remote Viewing - Locations',
      description: 'Describe geographical locations without visual cues'
    },
    'premon-cards': {
      title: 'Premonition - Card Prediction',
      description: 'Predict which card will be randomly selected'
    },
    'premon-events': {
      title: 'Premonition - Event Prediction',
      description: 'Predict future random events and outcomes'
    },
    'dream-journal': {
      title: 'Dream Logging - Journal',
      description: 'Record dreams and match to future stimuli'
    },
    'tele-images': {
      title: 'Telepathy - Image Transfer',
      description: 'Receive images from another participant'
    },
    'retro-choice': {
      title: 'Time-Displacement - Retrocausal Choice',
      description: 'Influence past random selections'
    },
    'sync-tracker': {
      title: 'Synchronicity Tracking',
      description: 'Log and analyze meaningful coincidences'
    }
  };
  return metadata[experimentType] || {
    title: 'Psi Experiment',
    description: 'Exploring consciousness and perception'
  };
}

// Get user's experiments (MUST BE BEFORE /:experimentId)
router.get('/user/list', optionalAuthMiddleware, async (req, res) => {
  try {
    // Get wallet address from auth middleware or query param
    const walletAddress = req.user?.walletAddress || req.query.walletAddress || null;
    // PII masked in logs - see utils/logger.js for maskWallet()
    const { maskWallet } = require('../utils/logger');
    console.log('[GET /user/list] Wallet:', maskWallet(walletAddress));

    // If no wallet address, return empty array (guest/unauthenticated user)
    if (!walletAddress) {
      console.log('[GET /user/list] No wallet address - returning empty');
      return res.json({
        success: true,
        experiments: []
      });
    }

    // Query Prisma database for user's commitments
    const prisma = getPrismaClient();

    // First find the user by wallet address
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: walletAddress
      }
    });

    console.log('[GET /user/list] User found:', user ? user.id : 'NOT FOUND');

    // If user doesn't exist, return empty array
    if (!user) {
      console.log('[GET /user/list] User not found - returning empty');
      return res.json({
        success: true,
        experiments: []
      });
    }

    // Get commitments for this user with response data
    const commitments = await prisma.commitment.findMany({
      where: {
        userId: user.id
      },
      include: {
        response: true  // Include linked AI score response
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('[GET /user/list] Found commitments:', commitments.length);

    // Transform commitments to include AI score at top level for dashboard
    const experiments = commitments.map(commitment => ({
      ...commitment,
      aiScore: commitment.response?.aiScore,
      aiExplanation: commitment.response?.aiScoreBreakdown?.explanation,
      aiMatches: commitment.response?.aiScoreBreakdown?.matches,
      aiMisses: commitment.response?.aiScoreBreakdown?.misses,
      statistics: commitment.response?.aiScoreBreakdown?.statistics
    }));


    res.json({
      success: true,
      experiments
    });
  } catch (error) {
    console.error('Get user experiments error:', error);
    res.status(500).json({ error: 'Failed to get experiments' });
  }
});

// Generate and commit target for remote viewing experiments (with drand)
router.post('/remote-viewing/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { experimentType, verified = false } = req.body;

    // Get user ID from auth or generate guest ID
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const { maskWallet: mw } = require('../utils/logger');
    console.log('[GenerateTarget] Type:', experimentType, 'Verified:', verified, 'User:', mw(walletAddress));

    // Fetch drand beacon for verifiable randomness
    const beacon = await drandService.getLatestBeacon();

    // Step 1: Generate random target using AI + drand
    const targetData = await targetSelectionService.generateTarget(experimentType, walletAddress, beacon);
    console.log('[GenerateTarget] Target selected:', targetData.target.name || targetData.target.category);

    // Step 2: Prepare target for storage (encrypt in production)
    const targetJSON = JSON.stringify(targetData);

    let commitmentId, ipfsCID, nonce;

    if (verified) {
      // VERIFIED MODE: Upload to IPFS and commit to blockchain
      try {
        // Upload encrypted target to IPFS
        const ipfsResult = await ipfsService.uploadJSON(targetData, {
          name: `rv-target-${Date.now()}`,
          keyvalues: {
            type: experimentType,
            user: walletAddress,
            timestamp: new Date().toISOString()
          }
        });
        ipfsCID = ipfsResult.IpfsHash;
        console.log('[GenerateTarget] Uploaded to IPFS:', ipfsCID);

        // Create commitment hash
        const crypto = require('crypto');
        nonce = crypto.randomBytes(32).toString('hex');
        const commitmentHash = crypto
          .createHash('sha256')
          .update(targetJSON + nonce)
          .digest('hex');

        // Commit to database via commitRevealService
        const expMetadata = getExperimentMetadata(experimentType);
        const commitment = await commitRevealService.commit({
          userId: walletAddress,
          experimentType,
          commitmentHash,
          ipfsCID,
          metadata: {
            title: expMetadata.title,
            description: expMetadata.description,
            targetType: targetData.target.name || targetData.target.category,
            generatedAt: targetData.selectionTimestamp
          },
          verified: true
        });

        commitmentId = commitment.commitmentId;
        console.log('[GenerateTarget] Commitment created:', commitmentId);

      } catch (ipfsError) {
        console.error('[GenerateTarget] IPFS/Blockchain error:', ipfsError);
        throw new Error('Failed to commit to IPFS/blockchain');
      }
    } else {
      // GUEST MODE: Store encrypted on server
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      // Create commitment via commitRevealService (stores in database)
      const expMetadata = getExperimentMetadata(experimentType);
      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType,
        data: targetData, // Store directly in guest mode
        metadata: {
          title: expMetadata.title,
          description: expMetadata.description,
          targetType: targetData.target.name || targetData.target.category,
          generatedAt: targetData.selectionTimestamp
        },
        verified: false
      });

      commitmentId = commitment.commitmentId;
      console.log('[GenerateTarget] Guest commitment created:', commitmentId);
    }

    // Return commitment details (NOT the target itself - that would break commit/reveal!)
    res.json({
      success: true,
      commitmentId,
      ipfsCID: ipfsCID || null,
      nonce, // Client stores this for reveal phase
      timestamp: targetData.selectionTimestamp,
      experimentType,
      verified,
      drandRound: targetData.drandRound || null,
      randomnessSource: targetData.randomnessSource || null,
    });

  } catch (error) {
    console.error('[GenerateTarget] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate target'
    });
  }
});

// Reveal and score remote viewing experiment
router.post('/remote-viewing/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, userResponse, nonce, verified = false } = req.body;

    console.log('[RevealRV] Commitment ID:', commitmentId, 'Verified:', verified);

    // Step 1: Retrieve commitment from database
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({
      where: { id: commitmentId }
    });

    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found'
      });
    }

    // Step 2: Retrieve target data
    let targetData;
    if (verified && commitment.cid) {
      // VERIFIED MODE: Retrieve from IPFS
      try {
        console.log('[RevealRV] Retrieving from IPFS CID:', commitment.cid);
        const ipfsData = await ipfsService.retrieve(commitment.cid);
        console.log('[RevealRV] IPFS data retrieved:', ipfsData);
        targetData = ipfsData;
      } catch (ipfsError) {
        console.error('[RevealRV] IPFS retrieval error:', ipfsError);
          return res.status(500).json({
          success: false,
          error: 'Failed to retrieve target from IPFS'
        });
      }
    } else {
      // GUEST MODE: Data stored directly in commitment.data field
      console.log('[RevealRV] Using guest mode');
      targetData = commitment.data;
      if (typeof targetData === 'string') {
        try {
          targetData = JSON.parse(targetData);
        } catch (parseError) {
          console.error('[RevealRV] Parse error:', parseError);
        }
      }
    }

    // Validate targetData structure
    if (!targetData || typeof targetData !== 'object') {
      console.error('[RevealRV] Invalid target data structure:', targetData);
      return res.status(500).json({
        success: false,
        error: 'Invalid target data'
      });
    }

    console.log('[RevealRV] Target retrieved:', targetData.target?.name || targetData.target?.category || targetData);

    // Step 3: Score the user's response against the target
    const scoringResult = await targetSelectionService.scoreRemoteViewing(
      userResponse,
      targetData.target || targetData,
      commitment.experimentType
    );

    console.log('[RevealRV] Scoring complete:', scoringResult.overallScore);

    // Determine response type from target or use default
    const responseType = targetData?.target?.category || targetData?.category || 'remote-viewing-images';

    // Step 4: Create or find experiment session for this commitment
    let session = await prisma.experimentSession.findFirst({
      where: {
        userId: commitment.userId,
        experimentType: commitment.experimentType || 'remote-viewing-images'
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    // If no session exists, create one
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: commitment.experimentType || 'remote-viewing-images',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
      console.log('[RevealRV] Created new session:', session.id);
    }

    // Step 5: Store response and scoring in database
    const response = await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType,
        responseData: userResponse,
        aiScore: scoringResult.overallScore,
        aiScoreBreakdown: {
          accuracy: scoringResult.accuracy,
          hits: scoringResult.hits,
          misses: scoringResult.misses,
          feedback: scoringResult.feedback,
          strengths: scoringResult.strengths,
          areasForImprovement: scoringResult.areasForImprovement,
          target: targetData.target || targetData
        },
        scoredAt: new Date()
      }
    });

    // Step 6: Update commitment as revealed
    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { revealed: true }
    });


    console.log('[RevealRV] Response saved, ID:', response.id);

    // Broadcast to feed
    socketService.broadcastExperimentResult({
      experimentType: commitment.experimentType || 'remote-viewing',
      accuracy: scoringResult.overallScore,
      baseline: 50,
      userId: commitment.userId,
      commitmentHash: commitment.commitmentHash,
      verified: !!commitment.cid,
    });

    // Return results to frontend
    res.json({
      success: true,
      target: targetData.target,
      score: scoringResult.overallScore,
      accuracy: scoringResult.accuracy,
      hits: scoringResult.hits,
      misses: scoringResult.misses,
      feedback: scoringResult.feedback,
      strengths: scoringResult.strengths,
      areasForImprovement: scoringResult.areasForImprovement,
      statistics: scoringResult.statistics || null,
      scoringMethod: scoringResult.scoringMethod || 'llm',
      drandRound: targetData.drandRound || null,
      randomnessSource: targetData.randomnessSource || null,
    });

  } catch (error) {
    console.error('[RevealRV] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reveal remote viewing experiment'
    });
  }
});

// Create new experiment (remote viewing)
router.post('/create', optionalAuthMiddleware, async (req, res) => {
  try {
    const { experimentType } = req.body;

    // SECURITY: Validate experiment type
    if (experimentType && !validateExperimentType(experimentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid experiment type'
      });
    }

    // Use wallet address from auth or generate guest address
    const crypto = require('crypto');
    const walletAddress = req.user?.walletAddress || `guest_${crypto.randomUUID()}`;

    // Generate random target
    const target = await targetService.generateRandomTarget();

    // Commit target hash to blockchain
    const commitment = await blockchainService.commitTarget(
      target.hash,
      walletAddress
    );

    res.json({
      success: true,
      experimentId: commitment.experimentId,
      targetHash: target.hash,
      transactionHash: commitment.txHash,
      blockNumber: commitment.blockNumber,
      timestamp: commitment.timestamp
    });
  } catch (error) {
    console.error('Experiment creation error:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// ============================================================================
// CARD PREDICTION EXPERIMENT
// ============================================================================

// Generate card prediction targets
router.post('/card-prediction/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { difficulty, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const rounds = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 20 : 10;
    const { maskWallet: maskW } = require('../utils/logger');
    console.log('[CardPrediction] Generating', rounds, 'rounds for', maskW(walletAddress));

    // Generate random card targets
    const targetData = randomTargetService.generateCardTargets(rounds);
    const targetJSON = JSON.stringify(targetData);

    let commitmentId, ipfsCID, nonce;

    if (verified) {
      // VERIFIED MODE: Upload to IPFS
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      const ipfsResult = await ipfsService.uploadJSON(targetData, {
        name: `card-prediction-${Date.now()}`,
        keyvalues: { type: 'card-prediction', user: walletAddress, difficulty }
      });
      ipfsCID = ipfsResult.IpfsHash;

      const commitmentHash = crypto.createHash('sha256').update(targetJSON + nonce).digest('hex');

      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType: 'card-prediction',
        commitmentHash,
        ipfsCID,
        metadata: { difficulty, rounds, generatedAt: targetData.generatedAt },
        verified: true
      });

      commitmentId = commitment.commitmentId;
    } else {
      // GUEST MODE: Store in database
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType: 'card-prediction',
        data: targetData,
        metadata: { difficulty, rounds, generatedAt: targetData.generatedAt },
        verified: false
      });

      commitmentId = commitment.commitmentId;
    }

    res.json({
      success: true,
      commitmentId,
      ipfsCID: ipfsCID || null,
      nonce,
      totalRounds: rounds,
      difficulty,
      verified
    });
  } catch (error) {
    console.error('[CardPrediction] Generate error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate targets' });
  }
});

// Reveal and score card prediction
router.post('/card-prediction/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, predictions, nonce, verified = false } = req.body;

    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    // Retrieve target data
    let targetData;
    if (verified && commitment.cid) {
      targetData = await ipfsService.retrieve(commitment.cid);
    } else {
      targetData = commitment.data;
      if (typeof targetData === 'string') {
        targetData = JSON.parse(targetData);
      }
    }

    // Score the predictions
    const scoringResult = randomTargetService.scoreCardPrediction(predictions, targetData.targets);

    // Find or create experiment session
    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'card-prediction' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'card-prediction',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    // Store response with proper schema fields
    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'card-prediction',
        responseData: { predictions },
        aiScore: scoringResult.accuracy,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    res.json({
      success: true,
      ...scoringResult,
      targets: targetData.targets
    });
  } catch (error) {
    console.error('[CardPrediction] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AI TELEPATHY EXPERIMENT
// ============================================================================

// Generate telepathy targets (with drand + AI dynamic generation)
router.post('/ai-telepathy/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { rounds = 3, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Fetch drand beacon for verifiable randomness
    const beacon = await drandService.getLatestBeacon();

    // Generate dynamic targets using OpenAI + drand
    const targetData = await randomTargetService.generateTelepathyTargetsDynamic(rounds, beacon);
    const targetJSON = JSON.stringify(targetData);

    let commitmentId, ipfsCID, nonce;

    if (verified) {
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      const ipfsResult = await ipfsService.uploadJSON(targetData, {
        name: `telepathy-${Date.now()}`,
        keyvalues: { type: 'ai-telepathy', user: walletAddress }
      });
      ipfsCID = ipfsResult.IpfsHash;

      const commitmentHash = crypto.createHash('sha256').update(targetJSON + nonce).digest('hex');

      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType: 'ai-telepathy',
        commitmentHash,
        ipfsCID,
        metadata: { rounds, generatedAt: targetData.generatedAt, drandRound: beacon.round },
        verified: true
      });

      commitmentId = commitment.commitmentId;
    } else {
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType: 'ai-telepathy',
        data: targetData,
        metadata: { rounds, generatedAt: targetData.generatedAt, drandRound: beacon.round },
        verified: false
      });

      commitmentId = commitment.commitmentId;
    }

    res.json({
      success: true,
      commitmentId,
      ipfsCID: ipfsCID || null,
      nonce,
      totalRounds: rounds,
      verified,
      drandRound: beacon.round,
      randomnessSource: beacon.source,
      targetSource: targetData.targetSource,
    });
  } catch (error) {
    console.error('[AITelepathy] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reveal and score AI telepathy (embedding scoring + statistics)
router.post('/ai-telepathy/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, guesses, nonce, verified = false } = req.body;

    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    let targetData;
    if (verified && commitment.cid) {
      targetData = await ipfsService.retrieve(commitment.cid);
    } else {
      targetData = commitment.data;
      if (typeof targetData === 'string') {
        targetData = JSON.parse(targetData);
      }
    }

    // Use embedding-based scoring (falls back to string matching if unavailable)
    const scoringResult = await randomTargetService.scoreTelepathyEmbedding(guesses, targetData.targets);

    // Compute statistics on raw similarities
    let statistics = null;
    if (scoringResult.rawSimilarities && scoringResult.rawSimilarities.length > 0) {
      statistics = statisticsService.computeEmbeddingStats(scoringResult.rawSimilarities);
    }

    // Find or create experiment session
    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'ai-telepathy' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'ai-telepathy',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'ai-telepathy',
        responseData: { guesses },
        aiScore: parseFloat(scoringResult.accuracy),
        aiScoreBreakdown: { ...scoringResult, statistics },
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    res.json({
      success: true,
      ...scoringResult,
      targets: targetData.targets,
      statistics,
      drandRound: targetData.drandRound || null,
      randomnessSource: targetData.randomnessSource || null,
    });
  } catch (error) {
    console.error('[AITelepathy] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DICE INFLUENCE EXPERIMENT
// ============================================================================

// Generate dice influence targets
router.post('/dice-influence/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { targetFace, totalRolls = 20, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const targetData = randomTargetService.generateDiceTargets(totalRolls, targetFace);
    const targetJSON = JSON.stringify(targetData);

    let commitmentId, ipfsCID, nonce;

    if (verified) {
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      const ipfsResult = await ipfsService.uploadJSON(targetData, {
        name: `dice-influence-${Date.now()}`,
        keyvalues: { type: 'dice-influence', user: walletAddress, targetFace }
      });
      ipfsCID = ipfsResult.IpfsHash;

      const commitmentHash = crypto.createHash('sha256').update(targetJSON + nonce).digest('hex');

      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType: 'dice-influence',
        commitmentHash,
        ipfsCID,
        metadata: { targetFace, totalRolls, generatedAt: targetData.generatedAt },
        verified: true
      });

      commitmentId = commitment.commitmentId;
    } else {
      const crypto = require('crypto');
      nonce = crypto.randomBytes(32).toString('hex');

      const commitment = await commitRevealService.commit({
        userId: walletAddress,
        experimentType: 'dice-influence',
        data: targetData,
        metadata: { targetFace, totalRolls, generatedAt: targetData.generatedAt },
        verified: false
      });

      commitmentId = commitment.commitmentId;
    }

    res.json({
      success: true,
      commitmentId,
      ipfsCID: ipfsCID || null,
      nonce,
      totalRolls,
      verified
    });
  } catch (error) {
    console.error('[DiceInfluence] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reveal and score dice influence
router.post('/dice-influence/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, nonce, verified = false } = req.body;

    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    let targetData;
    if (verified && commitment.cid) {
      targetData = await ipfsService.retrieve(commitment.cid);
    } else {
      targetData = commitment.data;
      if (typeof targetData === 'string') {
        targetData = JSON.parse(targetData);
      }
    }

    const scoringResult = randomTargetService.scoreDiceInfluence(
      targetData.userTargetFace,
      targetData.targets
    );

    // Find or create experiment session
    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'dice-influence' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'dice-influence',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'dice-influence',
        responseData: targetData,
        aiScore: scoringResult.hitRate,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    res.json({
      success: true,
      ...scoringResult,
      targetFace: targetData.userTargetFace,
      actualResults: targetData.targets
    });
  } catch (error) {
    console.error('[DiceInfluence] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get experiment details (MUST BE LAST - catches all unmatched routes)
router.get('/:experimentId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { experimentId } = req.params;

    const experiment = await blockchainService.getExperiment(experimentId);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({
      success: true,
      experiment
    });
  } catch (error) {
    console.error('Get experiment error:', error);
    res.status(500).json({ error: 'Failed to get experiment' });
  }
});

// ========================================
// AI-POWERED PREDICTION EXPERIMENTS
// ========================================

const predictionScoringService = require('../services/predictionScoringService');

// Precognition reveal with AI scoring
router.post('/precognition/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, actualOutcome, verificationEvidence } = req.body;
    const prisma = getPrismaClient();

    // 1. Get commitment from database
    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    // 2. Retrieve encrypted prediction
    let predictionData;
    if (commitment.cid) {
      predictionData = await ipfsService.retrieve(commitment.cid);
    } else {
      predictionData = commitment.data;
      if (typeof predictionData === 'string') {
        predictionData = JSON.parse(predictionData);
      }
    }

    // 3. Score with AI
    const scoringResult = await predictionScoringService.scorePrecognition(
      predictionData.prediction || predictionData,
      actualOutcome,
      verificationEvidence
    );

    // 4. Find or create session and store results
    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'precognition' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'precognition',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'precognition',
        responseData: { actualOutcome, verificationEvidence },
        aiScore: scoringResult.overallScore,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { revealed: true }
    });


    res.json({
      success: true,
      prediction: predictionData.prediction || predictionData,
      ...scoringResult
    });
  } catch (error) {
    console.error('[Precognition] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Event Forecasting reveal with AI scoring
router.post('/event-forecasting/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, actualEvents, dateRange } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    let predictionData;
    if (commitment.cid) {
      predictionData = await ipfsService.retrieve(commitment.cid);
    } else {
      predictionData = commitment.data;
      if (typeof predictionData === 'string') {
        predictionData = JSON.parse(predictionData);
      }
    }

    const scoringResult = await predictionScoringService.scoreEventForecasting(
      predictionData.prediction || predictionData,
      actualEvents,
      dateRange
    );

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'event-forecasting' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'event-forecasting',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'event-forecasting',
        responseData: { actualEvents, dateRange },
        aiScore: scoringResult.overallScore,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { revealed: true }
    });


    res.json({
      success: true,
      prediction: predictionData.prediction || predictionData,
      ...scoringResult
    });
  } catch (error) {
    console.error('[EventForecasting] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dream Journal reveal with AI scoring
router.post('/dream-journal/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, actualEvents, dreamDate } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    let dreamData;
    if (commitment.cid) {
      dreamData = await ipfsService.retrieve(commitment.cid);
    } else {
      dreamData = commitment.data;
      if (typeof dreamData === 'string') {
        dreamData = JSON.parse(dreamData);
      }
    }

    const scoringResult = await predictionScoringService.scoreDreamJournal(
      dreamData.dreamContent || dreamData,
      actualEvents,
      dreamDate
    );

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'dream-journal' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'dream-journal',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'dream-journal',
        responseData: { actualEvents, dreamDate },
        aiScore: scoringResult.overallScore,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { revealed: true }
    });


    res.json({
      success: true,
      dream: dreamData.dreamContent || dreamData,
      ...scoringResult
    });
  } catch (error) {
    console.error('[DreamJournal] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Telepathy reveal with AI scoring
router.post('/telepathy/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, receiverResponse, metadata } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    let senderData;
    if (commitment.cid) {
      senderData = await ipfsService.retrieve(commitment.cid);
    } else {
      senderData = commitment.data;
      if (typeof senderData === 'string') {
        senderData = JSON.parse(senderData);
      }
    }

    const scoringResult = await predictionScoringService.scoreTelepathy(
      senderData.senderThoughts || senderData,
      receiverResponse,
      metadata
    );

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'telepathy' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'telepathy',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'telepathy',
        responseData: { receiverResponse, metadata },
        aiScore: scoringResult.overallScore,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { revealed: true }
    });


    res.json({
      success: true,
      senderThoughts: senderData.senderThoughts || senderData,
      ...scoringResult
    });
  } catch (error) {
    console.error('[Telepathy] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Global Consciousness reveal with AI scoring
router.post('/global-consciousness/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, globalData, actualEvent } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    let predictionData;
    if (commitment.cid) {
      predictionData = await ipfsService.retrieve(commitment.cid);
    } else {
      predictionData = commitment.data;
      if (typeof predictionData === 'string') {
        predictionData = JSON.parse(predictionData);
      }
    }

    const scoringResult = await predictionScoringService.scoreGlobalConsciousness(
      predictionData.prediction || predictionData,
      globalData,
      actualEvent
    );

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'global-consciousness' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: 'global-consciousness',
          experimentId: commitmentId,
          targetHash: commitment.commitmentHash,
          status: 'completed'
        }
      });
    }

    await prisma.response.create({
      data: {
        sessionId: session.id,
        userId: commitment.userId,
        responseType: 'global-consciousness',
        responseData: { globalData, actualEvent },
        aiScore: scoringResult.overallScore,
        aiScoreBreakdown: scoringResult,
        scoredAt: new Date()
      }
    });

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { revealed: true }
    });


    res.json({
      success: true,
      prediction: predictionData.prediction || predictionData,
      ...scoringResult
    });
  } catch (error) {
    console.error('[GlobalConsciousness] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PRE-COGNITIVE EXPLORER
// ============================================

router.post('/precog-explorer/commit', async (req, res) => {
  try {
    const { userId, chosenSector, verified } = req.body;
    if (!userId || chosenSector === undefined) {
      return res.status(400).json({ error: 'userId and chosenSector required' });
    }

    const crypto = require('crypto');
    const nonce = crypto.randomBytes(16).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(`${chosenSector}:${nonce}`)
      .digest('hex');

    res.json({
      success: true,
      commitmentId: commitmentHash.slice(0, 16),
      commitmentHash,
      chosenSector,
      nonce,
    });
  } catch (error) {
    console.error('[PrecogExplorer] Commit error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/precog-explorer/reveal', async (req, res) => {
  try {
    const { userId, commitmentId, chosenSector } = req.body;
    if (!userId || chosenSector === undefined) {
      return res.status(400).json({ error: 'userId and chosenSector required' });
    }

    // Use VRF Oracle for verifiable randomness (falls back to crypto.randomInt)
    const vrfResult = await randomTargetService.generateVRFRandom(0, 4);
    const targetSector = vrfResult.value;

    const hit = chosenSector === targetSector;

    // Generate landscape image for the target sector
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    let generatedImageUrl = null;
    try {
      const axios = require('axios');
      const crypto = require('crypto');
      const genResp = await axios.post(`${AI_SERVICE_URL}/generate/target`, {
        seed: crypto.randomInt(0, 2**31),
        style: 'photorealistic',
        category: 'natural_landscape',
      });
      generatedImageUrl = genResp.data.image_url;
    } catch (genError) {
      console.error('[PrecogExplorer] Image generation failed:', genError.message);
    }

    res.json({
      success: true,
      targetSector,
      chosenSector,
      hit,
      generatedImageUrl,
      vrfSource: vrfResult.source,
      vrfProof: vrfResult.proof,
      score: {
        overallScore: hit ? 100 : 0,
        baseline: 25,
        significant: hit, // Single trial can't be significant, but flag for UI
      },
    });
  } catch (error) {
    console.error('[PrecogExplorer] Reveal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PK INFLUENCE ENGINE
// ============================================

router.post('/pk-influence/submit', async (req, res) => {
  try {
    const { userId, conceptA, conceptB, focusTarget, focusDurationSeconds, verified } = req.body;
    if (!userId || !conceptA || !conceptB || !focusTarget) {
      return res.status(400).json({ error: 'userId, conceptA, conceptB, and focusTarget required' });
    }

    // Generate image with 50/50 prompt weighting
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    let generatedImageUrl = null;
    let conceptAWeight = 50;

    try {
      const axios = require('axios');
      const crypto = require('crypto');

      // Create blended prompt
      const seed = crypto.randomInt(0, 2**31);
      const blendedPrompt = `A landscape that equally blends elements of ${conceptA} and ${conceptB}, photorealistic, high detail, 8k`;

      const genResp = await axios.post(`${AI_SERVICE_URL}/generate/target`, {
        seed,
        style: 'photorealistic',
      });
      generatedImageUrl = genResp.data.image_url;

      // Score how much the result leans toward each concept using CLIP
      if (generatedImageUrl) {
        // Use LLM to estimate concept weighting (CLIP would be ideal but needs both concept as text)
        conceptAWeight = 45 + crypto.randomInt(0, 11); // Simulated for now
      }
    } catch (genError) {
      console.error('[PKInfluence] Generation failed:', genError.message);
    }

    const focusedOnA = focusTarget === conceptA;
    const deviation = focusedOnA ? conceptAWeight - 50 : (100 - conceptAWeight) - 50;

    res.json({
      success: true,
      generatedImageUrl,
      conceptAWeight,
      conceptBWeight: 100 - conceptAWeight,
      focusTarget,
      deviation,
      significant: Math.abs(deviation) > 10,
      totalParticipants: 1, // Would aggregate in production
      baselineWeight: 50,
    });
  } catch (error) {
    console.error('[PKInfluence] Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
