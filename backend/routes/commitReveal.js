const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authMiddleware, optionalAuthMiddleware } = require('../auth');
const { getPrismaClient } = require('../db');
const commitRevealService = require('../services/commitRevealService');
const agentOrchestrator = require('../services/agents/agentOrchestrator');
const statisticsService = require('../services/statisticsService');

/**
 * SECURITY: Generate secure guest ID using crypto
 * Replaces insecure Date.now() + Math.random() pattern
 */
function generateSecureGuestId() {
  return `guest_${crypto.randomUUID()}`;
}

/**
 * POST /api/commit-reveal/commit
 * Create a new commitment (event-window or multi-party)
 */
router.post('/commit', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      userId,            // Wallet address from frontend
      experimentType,
      data,              // Guest mode: encrypted data
      commitmentHash,    // Verified mode: hash of encrypted data
      ipfsCID,          // Verified mode: IPFS CID
      metadata = {},
      sessionId = null,
      verified = false
    } = req.body;

    // Use userId from body (wallet address) or auth middleware, fallback to secure guest ID
    const finalUserId = userId || req.user?.userId || generateSecureGuestId();

    // Validation based on mode
    if (!experimentType) {
      return res.status(400).json({
        success: false,
        error: 'experimentType is required'
      });
    }

    if (verified) {
      // Verified mode: need commitmentHash and ipfsCID
      if (!commitmentHash || !ipfsCID) {
        return res.status(400).json({
          success: false,
          error: 'commitmentHash and ipfsCID are required for verified mode'
        });
      }
    } else {
      // Guest mode: need encrypted data
      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'data is required for guest mode'
        });
      }
    }

    const result = await commitRevealService.commit({
      userId: finalUserId,
      experimentType,
      data,
      commitmentHash,
      ipfsCID,
      metadata,
      sessionId,
      verified
    });

    res.json(result);
  } catch (error) {
    console.error('Commit endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commit-reveal/reveal/event-window
 * Reveal event-window commitment and check accuracy
 */
router.post('/reveal/event-window', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      commitmentId,
      eventWindow = null
    } = req.body;

    const userId = req.user?.userId || generateSecureGuestId();

    if (!commitmentId) {
      return res.status(400).json({
        success: false,
        error: 'commitmentId is required'
      });
    }

    const result = await commitRevealService.revealEventWindow({
      commitmentId,
      userId,
      eventWindow
    });

    res.json(result);
  } catch (error) {
    console.error('Event-window reveal error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commit-reveal/reveal/multi-party
 * Reveal multi-party session (telepathy, entanglement, collective)
 */
router.post('/reveal/multi-party', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      sessionId,
      participantIds
    } = req.body;

    if (!sessionId || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and participantIds array are required'
      });
    }

    const result = await commitRevealService.revealMultiParty({
      sessionId,
      participantIds
    });

    res.json(result);
  } catch (error) {
    console.error('Multi-party reveal error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commit-reveal/status/:commitmentId
 * Get commitment status
 */
router.get('/status/:commitmentId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId } = req.params;

    const status = await commitRevealService.getCommitmentStatus(commitmentId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commit-reveal/experiment-category/:experimentType
 * Get experiment category (event-window or multi-party)
 */
router.get('/experiment-category/:experimentType', (req, res) => {
  try {
    const { experimentType } = req.params;

    const isEventWindow = commitRevealService.isEventWindowExperiment(experimentType);
    const isMultiParty = commitRevealService.isMultiPartyExperiment(experimentType);

    res.json({
      success: true,
      experimentType,
      category: isEventWindow ? 'event-window' :
                isMultiParty ? 'multi-party' :
                'standard',
      requiresCommit: isEventWindow || isMultiParty,
      revealType: isEventWindow ? 'user-initiated' :
                  isMultiParty ? 'group-coordinated' :
                  'immediate'
    });
  } catch (error) {
    console.error('Category check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commit-reveal/reveal-with-ai
 * AI-Enhanced reveal with information retrieval and scoring
 *
 * Flow:
 * 1. Retrieval Agent gathers real-world events
 * 2. Scoring Agent evaluates prediction accuracy
 * 3. Returns complete scoring package
 *
 * Note: This does NOT submit to blockchain - that's a separate step
 * after user reviews and approves the score
 */
router.post('/reveal-with-ai', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      commitmentId,
      prediction,
      metadata = {}
    } = req.body;

    const userId = req.user?.userId || generateSecureGuestId();

    // Validation
    if (!commitmentId) {
      return res.status(400).json({
        success: false,
        error: 'commitmentId is required'
      });
    }

    if (!prediction) {
      return res.status(400).json({
        success: false,
        error: 'prediction is required'
      });
    }

    // Determine experiment type from metadata or commitment
    const experimentType = metadata.type || metadata.experimentType || 'precognition';

    console.log(`[API] AI reveal started for ${experimentType} - ${commitmentId}`);

    // SSE setup for progress updates (optional)
    // If client wants real-time progress, they can implement SSE
    // For now, we'll use a simple callback-based approach

    const progressUpdates = [];
    const progressCallback = (update) => {
      progressUpdates.push({
        ...update,
        timestamp: new Date().toISOString()
      });
      console.log(`[AI Progress] ${update.stage}: ${update.message} (${update.progress}%)`);
    };

    // Run AI-enhanced reveal
    const result = await agentOrchestrator.processReveal({
      commitmentId,
      experimentType,
      prediction,
      metadata,
      progressCallback
    });

    console.log(`[API] AI reveal completed for ${commitmentId}: Score ${result.score}%`);

    // Calculate statistical analysis
    const statistics = statisticsService.calculateScoreStatistics(result.score, experimentType);

    // Update commitment status in database
    const prisma = getPrismaClient();

    // Get the commitment to find the user
    const commitment = await prisma.commitment.findUnique({
      where: { id: commitmentId },
      include: { user: true }
    });

    if (!commitment) {
      throw new Error('Commitment not found');
    }

    // Create or find experiment session
    let session = await prisma.experimentSession.findFirst({
      where: {
        userId: commitment.userId,
        experimentId: commitmentId
      }
    });

    if (!session) {
      session = await prisma.experimentSession.create({
        data: {
          userId: commitment.userId,
          experimentType: experimentType,
          experimentId: commitmentId,
          status: 'completed',
          targetHash: commitment.commitmentHash,
          targetMetadata: metadata,
          completedAt: new Date()
        }
      });
    }

    // Create response record with AI score
    const response = await prisma.response.create({
      data: {
        userId: commitment.userId,
        sessionId: session.id,
        responseType: 'ai-analysis',
        responseData: {
          prediction,
          ...result
        },
        aiScore: result.score,
        aiScoreBreakdown: {
          matches: result.matches || [],
          misses: result.misses || [],
          explanation: result.explanation,
          statistics  // Store statistical analysis
        },
        scoredAt: new Date()
      }
    });

    // Update commitment - mark as revealed and link response
    await prisma.commitment.update({
      where: { id: commitmentId },
      data: {
        revealed: true,
        revealTimestamp: new Date(),
        responseId: response.id
      }
    });


    console.log(`[API] Commitment ${commitmentId} marked as revealed with AI score ${result.score}%`);

    // Return complete scoring package with statistics
    res.json({
      success: true,
      ...result,
      statistics,
      progressLog: progressUpdates
    });
  } catch (error) {
    console.error('AI reveal endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'error'
    });
  }
});

/**
 * POST /api/commit-reveal/submit-score-to-blockchain
 * Submit AI score to blockchain after user approval
 *
 * This is called AFTER reveal-with-ai, when user reviews
 * the score and decides to commit it to the blockchain
 */
router.post('/submit-score-to-blockchain', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      commitmentId,
      score,
      scoreData, // Complete score object from reveal-with-ai
      userSignature // Optional: for verified mode
    } = req.body;

    const userId = req.user?.userId || generateSecureGuestId();

    if (!commitmentId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'commitmentId and score are required'
      });
    }

    console.log(`[API] Submitting score to blockchain for ${commitmentId}`);

    // TODO: Implement actual blockchain submission
    // For now, this is a placeholder that would:
    // 1. Create blockchain transaction with score data
    // 2. Sign with user's wallet (if verified mode)
    // 3. Submit to Midnight Network
    // 4. Wait for confirmation
    // 5. Update commitment status in database

    // Mock blockchain submission
    const txHash = `0x${Buffer.from(commitmentId + Date.now()).toString('hex').substring(0, 64)}`;

    // Update commitment status in database
    const prisma = getPrismaClient();

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: {
        revealed: true,
        revealTimestamp: new Date(),
        revealTxId: txHash
      }
    });


    res.json({
      success: true,
      txHash,
      commitmentId,
      score,
      status: 'submitted',
      timestamp: new Date().toISOString(),
      message: 'Score submitted to blockchain (mock - implement actual Midnight tx)'
    });
  } catch (error) {
    console.error('Blockchain submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commit-reveal/statistics/:userId
 * Get comprehensive statistical analysis for user performance
 * Requires authentication - users can only view their own statistics
 */
router.get('/statistics/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // SECURITY: Users can only access their own statistics
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you can only view your own statistics'
      });
    }

    const stats = await statisticsService.calculateUserPerformance(userId);

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Statistics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
