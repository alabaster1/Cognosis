/**
 * AI Agent Webhook Routes
 * Event-driven coordination between AI agents and experiment workflows
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../db');
const targetService = require('../services/targetService');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * SECURITY: Verify webhook signature
 * Uses HMAC-SHA256 to verify the request came from our AI service
 */
function verifyWebhookSignature(req, res, next) {
  // Skip verification if no secret is configured (dev mode)
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] SECURITY WARNING: WEBHOOK_SECRET not configured - skipping signature verification');
    return next();
  }

  const signature = req.headers['x-webhook-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // Compute expected signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    console.warn('[Webhook] SECURITY: Invalid webhook signature rejected');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

// Apply signature verification to all webhook routes
router.use(verifyWebhookSignature);

/**
 * POST /api/webhooks/rv/target-committed
 * Called when target is committed to blockchain
 * Notifies RV-Expert that session can begin
 */
router.post('/rv/target-committed', async (req, res) => {
  try {
    const { sessionId, targetHash, metadata } = req.body;

    console.log('[Webhook] Target committed for session:', sessionId);

    // Notify RV-Expert that session can begin
    const response = await fetch(`${AI_SERVICE_URL}/rv/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: metadata.userId,
        protocol: metadata.protocol || 'CRV',
        context: metadata
      })
    });

    if (!response.ok) {
      throw new Error(`RV-Expert API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Store interaction in database
    await prisma.agentInteraction.create({
      data: {
        sessionId,
        agentId: 'rv_expert',
        userId: metadata.userId,
        messageType: 'session_start',
        role: 'assistant',
        content: JSON.stringify(result.message),
        successful: true,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0
      }
    });

    console.log('[Webhook] RV session started successfully');
    res.json({
      success: true,
      message: result.message,
      stage_info: result.stage_info
    });

  } catch (error) {
    console.error('[Webhook] Target committed error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to start RV session'
    });
  }
});

/**
 * POST /api/webhooks/rv/session-complete
 * Called when participant completes RV session
 * Triggers PsiScoreAI to score the session
 */
router.post('/rv/session-complete', async (req, res) => {
  try {
    const { sessionId, userId, impressions } = req.body;

    console.log('[Webhook] Session complete for:', sessionId);

    // Retrieve committed target from session
    let targetData = null;
    let targetHash = 'unknown';

    // Try database first
    try {
      const session = await prisma.experimentSession.findUnique({
        where: { id: sessionId },
        include: {
          commitment: true
        }
      });

      if (session) {
        targetData = session.targetData; // Get committed target
        targetHash = session.commitment?.commitmentHash || 'unknown';

        // Mark session as completed
        await prisma.experimentSession.update({
          where: { id: sessionId },
          data: { status: 'completed' }
        });

        console.log('[Webhook] Retrieved committed target from database');
      }
    } catch (dbError) {
      console.warn('[Webhook] Database not available, checking memory storage');
    }

    // Try in-memory storage if DB unavailable
    if (!targetData && global.rvSessions?.[sessionId]) {
      targetData = global.rvSessions[sessionId].targetData;
      targetHash = global.rvSessions[sessionId].commitmentHash;
      global.rvSessions[sessionId].status = 'completed';
      console.log('[Webhook] Retrieved committed target from memory');
    }

    // Fallback: fetch new target if no committed target found
    if (!targetData) {
      console.warn('[Webhook] No committed target found, fetching new random target');
      targetData = await targetService.getRandomTarget();
      console.log('[Webhook] Using fallback target from', targetData.source);
    }

    // Call PsiScoreAI to score the session
    const scoreResponse = await fetch(`${AI_SERVICE_URL}/rv/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        impressions,
        target_data: targetData,
        target_hash: targetHash
      })
    });

    if (!scoreResponse.ok) {
      throw new Error(`PsiScoreAI API error: ${scoreResponse.statusText}`);
    }

    const scoring = await scoreResponse.json();

    // Update session with scoring results (skip if DB unavailable)
    try {
      await prisma.experimentSession.update({
        where: { id: sessionId },
        data: {
          score: scoring.scores.overall_score,
          metadata: {
            impressions,
            scoring,
            completedAt: new Date().toISOString()
          },
          status: 'completed'
        }
      });

      // Store scoring interaction
      await prisma.agentInteraction.create({
        data: {
          sessionId,
          agentId: 'psi_score_ai',
          userId,
          messageType: 'scoring',
          role: 'assistant',
          content: JSON.stringify(scoring.detailed_analysis),
          successful: true,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: scoring.duration_ms || 0
        }
      });
    } catch (dbError) {
      console.warn('[Webhook] Could not save to database:', dbError.message);
    }

    console.log('[Webhook] Session scored successfully');

    // Trigger feedback generation
    const feedbackResponse = await fetch(`${req.protocol}://${req.get('host')}/api/webhooks/rv/scoring-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId,
        scoring,
        impressions
      })
    });

    res.json({
      success: true,
      scoring: {
        ...scoring,
        target_data: targetData // Include target data so user can see what they were viewing
      },
      message: 'Session scored successfully'
    });

  } catch (error) {
    console.error('[Webhook] Session complete error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to score RV session'
    });
  }
});

/**
 * POST /api/webhooks/rv/scoring-complete
 * Called when PsiScoreAI completes scoring
 * Generates personalized feedback via RV-Expert
 */
router.post('/rv/scoring-complete', async (req, res) => {
  try {
    const { sessionId, userId, scoring, impressions } = req.body;

    console.log('[Webhook] Scoring complete, generating feedback for:', sessionId);

    // Generate personalized feedback via RV-Expert
    const feedbackResponse = await fetch(`${AI_SERVICE_URL}/rv/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        scoring_results: scoring,
        impressions
      })
    });

    if (!feedbackResponse.ok) {
      throw new Error(`RV-Expert feedback API error: ${feedbackResponse.statusText}`);
    }

    const feedback = await feedbackResponse.json();

    // Store feedback interaction (skip if DB unavailable)
    try {
      await prisma.agentInteraction.create({
        data: {
          sessionId,
          agentId: 'rv_expert',
          userId,
          messageType: 'feedback',
          role: 'assistant',
          content: feedback.feedback,
          successful: true,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0
        }
      });

      // Update session with feedback
      await prisma.experimentSession.update({
        where: { id: sessionId },
        data: {
          metadata: {
            scoring,
            impressions,
            feedback: feedback.feedback,
            recommendations: feedback.recommendations
          }
        }
      });
    } catch (dbError) {
      console.warn('[Webhook] Could not save feedback to database:', dbError.message);
    }

    console.log('[Webhook] Feedback generated successfully');

    res.json({
      success: true,
      feedback: feedback.feedback,
      recommendations: feedback.recommendations
    });

  } catch (error) {
    console.error('[Webhook] Scoring complete error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to generate feedback'
    });
  }
});

/**
 * POST /api/webhooks/rv/stage-advance
 * Called when participant advances to next stage
 * Gets stage-specific guidance from RV-Expert
 */
router.post('/rv/stage-advance', async (req, res) => {
  try {
    const { sessionId, stage, previousImpressions, userId } = req.body;

    console.log(`[Webhook] Stage advance to ${stage} for session:`, sessionId);

    // Get stage guidance from RV-Expert
    const guidanceResponse = await fetch(`${AI_SERVICE_URL}/rv/session/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        stage,
        protocol: 'CRV',
        previous_impressions: previousImpressions
      })
    });

    if (!guidanceResponse.ok) {
      throw new Error(`RV-Expert guidance API error: ${guidanceResponse.statusText}`);
    }

    const guidance = await guidanceResponse.json();

    // Store guidance interaction (skip if DB unavailable)
    try {
      await prisma.agentInteraction.create({
        data: {
          sessionId,
          agentId: 'rv_expert',
          userId,
          messageType: 'stage_guidance',
          role: 'assistant',
          content: guidance.guidance,
          successful: true,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0
        }
      });
    } catch (dbError) {
      console.warn('[Webhook] Could not save guidance to database:', dbError.message);
    }

    res.json({
      success: true,
      guidance: guidance.guidance,
      stage_name: guidance.stage_name,
      duration_minutes: guidance.duration_minutes
    });

  } catch (error) {
    console.error('[Webhook] Stage advance error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to get stage guidance'
    });
  }
});

/**
 * GET /api/webhooks/status
 * Health check for webhook system
 */
router.get('/status', async (req, res) => {
  try {
    // Check AI service connectivity
    const aiResponse = await fetch(`${AI_SERVICE_URL}/`);
    const aiServiceUp = aiResponse.ok;

    // Check database connectivity
    let dbUp = false;
    try {
      await prisma.agent.findFirst();
      dbUp = true;
    } catch (dbError) {
      console.error('Database check failed:', dbError.message);
    }

    res.json({
      status: 'active',
      services: {
        ai_service: aiServiceUp ? 'connected' : 'disconnected',
        ai_service_url: AI_SERVICE_URL,
        database: dbUp ? 'connected' : 'disconnected'
      },
      webhooks: [
        'POST /api/webhooks/rv/target-committed',
        'POST /api/webhooks/rv/session-complete',
        'POST /api/webhooks/rv/scoring-complete',
        'POST /api/webhooks/rv/stage-advance'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;
