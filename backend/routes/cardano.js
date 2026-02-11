/**
 * Cardano Blockchain Routes
 * /api/cardano/*
 *
 * Provides contract configuration and session management for
 * Cardano-based psi experiments using Aiken smart contracts.
 */

const express = require('express');
const router = express.Router();
const cardanoService = require('../services/cardanoBlockchainService');
const { authMiddleware, optionalAuthMiddleware } = require('../auth');
const { getPrismaClient } = require('../db');

/**
 * GET /api/cardano/config
 * Get contract configuration for frontend Lucid integration
 */
router.get('/config', async (req, res) => {
  try {
    await cardanoService.initialize();
    const config = cardanoService.getContractConfig();

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[Cardano] Config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract configuration',
    });
  }
});

/**
 * POST /api/cardano/sessions/create
 * Create a new experiment session with on-chain commitment
 * Returns data needed by frontend to build and sign the transaction
 */
router.post('/sessions/create', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      walletAddress,
      gameType,
      targetValue,
      stakeLovelace,
      joinDeadlineMinutes,
      revealDeadlineMinutes,
      maxParticipants,
      ipfsCid,
    } = req.body;

    if (!walletAddress || !gameType || !targetValue) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress, gameType, and targetValue are required',
      });
    }

    // Create session data
    const sessionData = await cardanoService.createExperimentSession({
      hostWalletAddress: walletAddress,
      gameType,
      targetValue,
      stakeLovelace: stakeLovelace || 2000000,
      joinDeadlineMinutes: joinDeadlineMinutes || 60,
      revealDeadlineMinutes: revealDeadlineMinutes || 120,
      maxParticipants: maxParticipants || 1,
      ipfsCid,
    });

    // Store reference in database
    const prisma = getPrismaClient();
    try {
      await prisma.commitment.create({
        data: {
          id: sessionData.sessionId,
          experimentType: gameType,
          commitmentHash: sessionData.targetHash,
          nonce: sessionData.nonce,
          cid: ipfsCid || null,
          status: 'pending_tx',
          createdAt: new Date(),
          revealAt: new Date(Date.now() + (revealDeadlineMinutes || 120) * 60 * 1000),
          userId: req.user?.userId || null,
          walletAddress: walletAddress,
          metadata: {
            scriptAddress: sessionData.scriptAddress,
            validatorHash: sessionData.validatorHash,
            stakeLovelace: sessionData.stakeLovelace,
            joinDeadlineSlot: sessionData.joinDeadlineSlot,
            revealDeadlineSlot: sessionData.revealDeadlineSlot,
            datumCbor: sessionData.datumCbor,
          },
        },
      });
    } catch (dbError) {
      console.warn('[Cardano] Database storage warning:', dbError.message);
      // Continue even if DB fails - session data is returned
    }

    // Return session data for frontend to build transaction
    // IMPORTANT: nonce is returned here but should be stored securely client-side
    res.json({
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        targetHash: sessionData.targetHash,
        nonce: sessionData.nonce, // Client must store this securely for reveal
        scriptAddress: sessionData.scriptAddress,
        validatorHash: sessionData.validatorHash,
        datumCbor: sessionData.datumCbor,
        stakeLovelace: sessionData.stakeLovelace,
        currentSlot: sessionData.currentSlot,
        joinDeadlineSlot: sessionData.joinDeadlineSlot,
        revealDeadlineSlot: sessionData.revealDeadlineSlot,
      },
    });
  } catch (error) {
    console.error('[Cardano] Create session error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/cardano/sessions/:sessionId/confirm
 * Confirm transaction was submitted successfully
 */
router.post('/sessions/:sessionId/confirm', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { txHash, blockHeight } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: 'txHash is required',
      });
    }

    const prisma = getPrismaClient();
    await prisma.commitment.update({
      where: { id: sessionId },
      data: {
        status: 'committed',
        blockchainTxHash: txHash,
        metadata: {
          update: {
            txHash,
            blockHeight,
            confirmedAt: new Date().toISOString(),
          },
        },
      },
    });

    res.json({
      success: true,
      sessionId,
      txHash,
    });
  } catch (error) {
    console.error('[Cardano] Confirm session error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/cardano/sessions/:sessionId/reveal
 * Get reveal redeemer data for revealing target
 */
router.post('/sessions/:sessionId/reveal', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { targetValue, nonce } = req.body;

    if (!targetValue || !nonce) {
      return res.status(400).json({
        success: false,
        error: 'targetValue and nonce are required',
      });
    }

    // Get session from database
    const prisma = getPrismaClient();
    const session = await prisma.commitment.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Verify commitment matches
    const isValid = cardanoService.verifyCommitment(
      session.commitmentHash,
      targetValue,
      nonce
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Commitment verification failed - values do not match',
      });
    }

    // Build reveal redeemer
    const redeemerCbor = cardanoService.buildRevealRedeemer(targetValue, nonce);

    res.json({
      success: true,
      sessionId,
      redeemerCbor,
      targetHash: session.commitmentHash,
      scriptAddress: session.metadata?.scriptAddress,
    });
  } catch (error) {
    console.error('[Cardano] Reveal error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/cardano/sessions/:sessionId/score
 * Submit AI score for scored experiments (RemoteViewing, etc.)
 */
router.post('/sessions/:sessionId/score', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { score } = req.body;

    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        error: 'score must be between 0 and 100',
      });
    }

    // Build submit score redeemer
    const redeemerCbor = cardanoService.buildSubmitScoreRedeemer(score);

    // Get session for script address
    const prisma = getPrismaClient();
    const session = await prisma.commitment.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Update session with score
    await prisma.commitment.update({
      where: { id: sessionId },
      data: {
        score: score,
        scoredAt: new Date(),
      },
    });

    res.json({
      success: true,
      sessionId,
      score,
      redeemerCbor,
      scriptAddress: session.metadata?.scriptAddress,
    });
  } catch (error) {
    console.error('[Cardano] Score submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/cardano/sessions/:sessionId
 * Get session details
 */
router.get('/sessions/:sessionId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = getPrismaClient();
    const session = await prisma.commitment.findUnique({
      where: { id: sessionId },
      include: {
        experiment: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Don't expose nonce until after reveal
    const safeSession = {
      sessionId: session.id,
      status: session.status,
      commitmentHash: session.commitmentHash,
      experimentType: session.experimentType,
      txHash: session.blockchainTxHash,
      score: session.score,
      createdAt: session.createdAt,
      revealAt: session.revealAt,
      scriptAddress: session.metadata?.scriptAddress,
      stakeLovelace: session.metadata?.stakeLovelace,
    };

    // Only include nonce if session is revealed and user is the owner
    if (session.status === 'revealed' && req.user?.userId === session.userId) {
      safeSession.nonce = session.nonce;
    }

    res.json({
      success: true,
      session: safeSession,
    });
  } catch (error) {
    console.error('[Cardano] Get session error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/cardano/sessions
 * List sessions for current user
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const sessions = await prisma.commitment.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        experimentType: true,
        commitmentHash: true,
        blockchainTxHash: true,
        score: true,
        createdAt: true,
        revealAt: true,
      },
    });

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('[Cardano] List sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/cardano/slot
 * Get current slot number
 */
router.get('/slot', async (req, res) => {
  try {
    await cardanoService.initialize();
    const slot = await cardanoService.getCurrentSlot();

    res.json({
      success: true,
      slot,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Cardano] Get slot error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// RV-SPECIFIC CARDANO ENDPOINTS
// ============================================================================

/**
 * POST /api/cardano/rv/start
 * Server generates target + hash, returns datum for client to build commit tx
 */
router.post('/rv/start', optionalAuthMiddleware, async (req, res) => {
  try {
    const { walletAddress, stakeLovelace } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required',
      });
    }

    // Create session with RemoteViewing game type
    const sessionData = await cardanoService.createExperimentSession({
      hostWalletAddress: walletAddress,
      gameType: 'remote-viewing',
      targetValue: `rv_target_${Date.now()}_${require('crypto').randomBytes(8).toString('hex')}`,
      stakeLovelace: stakeLovelace || 2000000,
      joinDeadlineMinutes: 120,    // 2 hours for RV
      revealDeadlineMinutes: 1440, // 24 hours for scoring
      maxParticipants: 1,
    });

    // Store in database
    const prisma = getPrismaClient();
    try {
      await prisma.commitment.create({
        data: {
          id: sessionData.sessionId,
          experimentType: 'remote-viewing',
          commitmentHash: sessionData.targetHash,
          nonce: sessionData.nonce,
          status: 'pending_tx',
          userId: req.user?.userId || 'guest',
          walletAddress,
          revealAt: new Date(Date.now() + 1440 * 60 * 1000),
          cardanoSessionId: sessionData.sessionId,
          scriptAddress: sessionData.scriptAddress || null,
          stakeLovelace: stakeLovelace ? BigInt(stakeLovelace) : 2000000n,
          metadataHash: '',
          metadata: {
            scriptAddress: sessionData.scriptAddress,
            validatorHash: sessionData.validatorHash,
            stakeLovelace: sessionData.stakeLovelace,
            joinDeadlineSlot: sessionData.joinDeadlineSlot,
            revealDeadlineSlot: sessionData.revealDeadlineSlot,
            datumCbor: sessionData.datumCbor,
          },
        },
      });
    } catch (dbError) {
      console.warn('[Cardano/RV] Database storage warning:', dbError.message);
    }

    res.json({
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        targetHash: sessionData.targetHash,
        nonce: sessionData.nonce,
        scriptAddress: sessionData.scriptAddress,
        validatorHash: sessionData.validatorHash,
        datumCbor: sessionData.datumCbor,
        stakeLovelace: sessionData.stakeLovelace,
        currentSlot: sessionData.currentSlot,
        joinDeadlineSlot: sessionData.joinDeadlineSlot,
        revealDeadlineSlot: sessionData.revealDeadlineSlot,
      },
    });
  } catch (error) {
    console.error('[Cardano/RV] Start error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cardano/rv/confirm-commit
 * Client sends txHash after signing, backend stores it
 */
router.post('/rv/confirm-commit', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId, txHash } = req.body;

    if (!sessionId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and txHash are required',
      });
    }

    const prisma = getPrismaClient();
    await prisma.commitment.update({
      where: { id: sessionId },
      data: {
        status: 'committed',
        blockchainTxHash: txHash,
      },
    });

    res.json({
      success: true,
      sessionId,
      txHash,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });
  } catch (error) {
    console.error('[Cardano/RV] Confirm commit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cardano/rv/score
 * Client submits impressions, backend scores with AI, returns score + redeemer data
 */
router.post('/rv/score', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId, impressions } = req.body;

    if (!sessionId || !impressions) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and impressions are required',
      });
    }

    const prisma = getPrismaClient();
    const session = await prisma.commitment.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // TODO: Call AI scoring service here
    // For now, generate a score based on impressions length as placeholder
    const score = Math.min(100, Math.max(0, Math.floor(Math.random() * 60 + 20)));

    // Build the SubmitScore redeemer for the on-chain settlement
    const redeemerCbor = cardanoService.buildSubmitScoreRedeemer(score, '');

    // Calculate PSY reward using exponential curve
    // reward = base + (max - base) * (score/100)^2.5
    const baseReward = 100;
    const maxReward = 400;
    const normScore = score / 100;
    const psyReward = Math.floor(baseReward + (maxReward - baseReward) * Math.pow(normScore, 2.5));

    // Update session with score
    await prisma.commitment.update({
      where: { id: sessionId },
      data: {
        score,
        scoredAt: new Date(),
        status: 'scored',
      },
    });

    res.json({
      success: true,
      sessionId,
      score,
      psyReward,
      redeemerCbor,
      scriptAddress: session.metadata?.scriptAddress || session.scriptAddress,
    });
  } catch (error) {
    console.error('[Cardano/RV] Score error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cardano/rv/confirm-settle
 * Client sends settle txHash after signing, backend records reward
 */
router.post('/rv/confirm-settle', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId, txHash, psyRewardAmount } = req.body;

    if (!sessionId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and txHash are required',
      });
    }

    const prisma = getPrismaClient();
    await prisma.commitment.update({
      where: { id: sessionId },
      data: {
        status: 'settled',
        rewardTxHash: txHash,
        psyRewardAmount: psyRewardAmount ? BigInt(psyRewardAmount) : null,
      },
    });

    res.json({
      success: true,
      sessionId,
      txHash,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });
  } catch (error) {
    console.error('[Cardano/RV] Confirm settle error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/cardano/rv/vault
 * Returns current vault state (PSY balance, next reward amount)
 */
router.get('/rv/vault', async (req, res) => {
  try {
    await cardanoService.initialize();
    const vaultState = await cardanoService.getVaultState();

    if (!vaultState) {
      return res.json({
        success: true,
        vault: null,
        message: 'Vault not deployed or not queryable in current mode',
      });
    }

    res.json({
      success: true,
      vault: vaultState,
    });
  } catch (error) {
    console.error('[Cardano/RV] Vault query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/cardano/vault
 * General vault query endpoint
 */
router.get('/vault', async (req, res) => {
  try {
    await cardanoService.initialize();
    const vaultState = await cardanoService.getVaultState();

    res.json({
      success: true,
      vault: vaultState,
    });
  } catch (error) {
    console.error('[Cardano] Vault query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
