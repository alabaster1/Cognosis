/**
 * RV Session Management Routes
 * Handles target commitment and session lifecycle
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../db');
const targetService = require('../services/targetService');

/**
 * POST /api/rv/sessions/start
 * Initializes RV session with committed target
 * Returns sessionId but NOT the target (blind protocol)
 */
router.post('/start', async (req, res) => {
  try {
    const { userId, protocol = 'CRV' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('[RV Session] Starting new session for user:', userId);

    // 1. Fetch random target from APIs
    const targetData = await targetService.getRandomTarget();
    console.log('[RV Session] Selected target from:', targetData.source);

    // 2. Create cryptographic commitment
    const targetJson = JSON.stringify(targetData);
    const nonce = crypto.randomBytes(16).toString('hex');
    const commitmentHash = crypto
      .createHash('sha256')
      .update(targetJson + nonce)
      .digest('hex');

    // 3. Generate session ID
    const sessionId = `rv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // 4. Store session in database (with committed target)
    try {
      await prisma.experimentSession.create({
        data: {
          id: sessionId,
          userId,
          experimentType: 'remote_viewing',
          protocol,
          status: 'active',
          targetData, // Encrypted/committed target
          metadata: {
            nonce,
            startedAt: new Date().toISOString(),
            targetSource: targetData.source
          },
          commitment: {
            create: {
              commitmentHash,
              revealedData: null, // Not revealed yet
              revealedAt: null
            }
          }
        },
        include: {
          commitment: true
        }
      });

      console.log('[RV Session] Session created in database:', sessionId);
    } catch (dbError) {
      console.warn('[RV Session] Database unavailable, storing in memory:', dbError.message);
      // Store in memory for testing without DB
      global.rvSessions = global.rvSessions || {};
      global.rvSessions[sessionId] = {
        userId,
        protocol,
        targetData,
        nonce,
        commitmentHash,
        startedAt: new Date().toISOString()
      };
    }

    // 5. Trigger RV-Expert session start webhook
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/rv/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          protocol
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        console.log('[RV Session] RV-Expert session started');

        // Return session info WITHOUT target data (blind protocol)
        return res.json({
          sessionId,
          protocol,
          currentStage: 1,
          commitmentHash, // Proof that target is committed
          message: aiData.message,
          stage_info: aiData.stage_info,
          startedAt: new Date().toISOString()
        });
      }
    } catch (aiError) {
      console.warn('[RV Session] AI service unavailable:', aiError.message);
    }

    // Return basic session info even if AI unavailable
    res.json({
      sessionId,
      protocol,
      currentStage: 1,
      commitmentHash,
      message: 'Session started. Begin with Stage 1: Ideogram Detection.',
      startedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[RV Session] Start error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to start RV session'
    });
  }
});

/**
 * GET /api/rv/sessions/:sessionId
 * Retrieves session info (without revealing target until complete)
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    let session;
    try {
      session = await prisma.experimentSession.findUnique({
        where: { id: sessionId },
        include: { commitment: true }
      });
    } catch (dbError) {
      // Check in-memory storage
      session = global.rvSessions?.[sessionId];
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Return session info without target data (unless completed)
    res.json({
      sessionId: session.id || sessionId,
      userId: session.userId,
      protocol: session.protocol,
      status: session.status || 'active',
      commitmentHash: session.commitment?.commitmentHash || session.commitmentHash,
      startedAt: session.metadata?.startedAt || session.startedAt,
      // Only include target if session is completed
      ...(session.status === 'completed' && {
        targetData: session.targetData,
        score: session.score
      })
    });

  } catch (error) {
    console.error('[RV Session] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rv/sessions/:sessionId/target
 * Reveals the target for a completed session
 */
router.get('/:sessionId/target', async (req, res) => {
  try {
    const { sessionId } = req.params;

    let session;
    try {
      session = await prisma.experimentSession.findUnique({
        where: { id: sessionId }
      });
    } catch (dbError) {
      session = global.rvSessions?.[sessionId];
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'completed') {
      return res.status(403).json({
        error: 'Target cannot be revealed until session is completed'
      });
    }

    res.json({
      sessionId,
      targetData: session.targetData,
      commitmentHash: session.commitment?.commitmentHash || session.commitmentHash,
      revealedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[RV Session] Reveal error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
