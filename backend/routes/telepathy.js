/**
 * Telepathy Routes - Ghost Signal Protocol
 * Handles the 2-player async telepathy experiment endpoints
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../auth');
const telepathyService = require('../services/telepathyService');

/**
 * POST /api/telepathy/sessions
 * Create a new telepathy session (sender initiates)
 * Requires authentication
 */
router.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const { delayMinutes, inviteCode } = req.body;

    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    const result = await telepathyService.createSession(userId, {
      delayMinutes,
      inviteCode,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('[Telepathy] Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/telepathy/sessions/join
 * Join a session as receiver (by invite code or session ID)
 * Requires authentication
 */
router.post('/sessions/join', authMiddleware, async (req, res) => {
  try {
    const { sessionId, inviteCode } = req.body;

    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    if (!sessionId && !inviteCode) {
      return res.status(400).json({ error: 'sessionId or inviteCode required' });
    }

    const result = await telepathyService.joinSession(userId, { sessionId, inviteCode });
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] Join session error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/telepathy/matchmaking
 * Join the matchmaking queue for auto-pairing
 * Requires authentication
 */
router.post('/matchmaking', authMiddleware, async (req, res) => {
  try {
    const { role = 'any', preferredDelay = 30 } = req.body;

    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    const result = await telepathyService.joinMatchQueue(userId, role, preferredDelay);
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] Matchmaking error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/telepathy/sessions/:sessionId/sender-tags
 * Sender submits their 3 descriptive tags
 * Requires authentication
 */
router.post('/sessions/:sessionId/sender-tags', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tags } = req.body;

    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    if (!tags) {
      return res.status(400).json({ error: 'tags are required' });
    }

    const result = await telepathyService.submitSenderTags(sessionId, userId, tags);
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] Sender tags error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/telepathy/sessions/:sessionId/delay
 * Check if the mandatory delay has elapsed
 */
router.get('/sessions/:sessionId/delay', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await telepathyService.checkDelay(sessionId);
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] Delay check error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/telepathy/sessions/:sessionId/receiver-response
 * Receiver submits sensed tags and image choice
 * Requires authentication
 */
router.post('/sessions/:sessionId/receiver-response', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tags, choiceIndex } = req.body;

    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    if (!tags || choiceIndex === undefined) {
      return res.status(400).json({ error: 'tags and choiceIndex are required' });
    }

    const result = await telepathyService.submitReceiverResponse(sessionId, userId, {
      tags,
      choiceIndex,
    });
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] Receiver response error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/telepathy/sessions/:sessionId
 * Get session details (role-appropriate view)
 * Requires authentication
 */
router.get('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    const result = await telepathyService.getSession(sessionId, userId);
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] Get session error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/telepathy/sessions
 * Get user's telepathy sessions
 * Requires authentication
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;

    const result = await telepathyService.getUserSessions(userId);
    res.json(result);
  } catch (error) {
    console.error('[Telepathy] List sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
