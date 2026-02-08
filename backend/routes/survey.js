/**
 * Survey System API Routes
 * Handles baseline profiles, session calibration, and post-experiment feedback
 */

const express = require('express');
const router = express.Router();
const { getPrismaClient } = require('../db');
const { authMiddleware, optionalAuthMiddleware } = require('../auth');
const envService = require('../services/environmentService');
const crypto = require('crypto');

const prisma = getPrismaClient();

// ============================================
// BASELINE PROFILE
// ============================================

/**
 * GET /api/survey/baseline/check
 * Check if user needs to complete baseline survey
 * Requires authentication - users can only check their own status
 */
router.get('/baseline/check/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // SECURITY: Users can only check their own baseline status
    if (req.user.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied - you can only check your own baseline status'
      });
    }

    const profile = await prisma.baselineProfile.findUnique({
      where: { userId }
    });

    const needsBaseline = !profile || new Date(profile.expiresAt) < new Date();

    res.json({
      needsBaseline,
      profile: profile || null,
      expiresAt: profile?.expiresAt || null
    });
  } catch (error) {
    console.error('[Survey] Baseline check error:', error);
    res.status(500).json({ error: 'Failed to check baseline status' });
  }
});

/**
 * POST /api/survey/baseline
 * Submit baseline profile
 * Requires authentication - users can only submit their own profile
 */
router.post('/baseline', authMiddleware, async (req, res) => {
  try {
    const {
      ageRange,
      gender,
      handedness,
      meditationExperience,
      beliefScale,
      psiTraining
    } = req.body;

    // SECURITY: Use authenticated user ID, not from request body
    const userId = req.user.userId;

    // Get environment data
    const envData = await envService.getEnvironmentData();
    const timezone = envService.getTimezone();

    // Calculate expiration (90 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create commitment hash for Cardano
    const profileData = {
      userId,
      ageRange,
      handedness,
      meditationExperience,
      beliefScale,
      psiTraining,
      timestamp: new Date().toISOString()
    };
    const nonce = crypto.randomBytes(16).toString('hex');
    const commitmentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(profileData) + nonce)
      .digest('hex');

    // Upsert baseline profile
    const profile = await prisma.baselineProfile.upsert({
      where: { userId },
      create: {
        userId,
        ageRange,
        gender,
        handedness,
        timezone,
        meditationExperience,
        beliefScale,
        psiTraining,
        geomagneticIndex: envData.geomagneticIndex,
        lunarPhase: envData.lunarPhase,
        commitmentHash,
        expiresAt
      },
      update: {
        ageRange,
        gender,
        handedness,
        timezone,
        meditationExperience,
        beliefScale,
        psiTraining,
        geomagneticIndex: envData.geomagneticIndex,
        lunarPhase: envData.lunarPhase,
        commitmentHash,
        expiresAt,
        updatedAt: new Date()
      }
    });

    console.log(`[Survey] Baseline profile saved for user ${userId}`);

    res.json({
      success: true,
      profile,
      commitmentHash,
      message: 'Baseline profile saved successfully'
    });
  } catch (error) {
    console.error('[Survey] Baseline save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SESSION CALIBRATION
// ============================================

/**
 * POST /api/survey/calibration
 * Submit session calibration
 * Requires authentication
 */
router.post('/calibration', authMiddleware, async (req, res) => {
  try {
    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;
    const {
      sessionId,
      experimentType,
      sleepHours,
      caffeineIntake,
      substancesUsed,
      moodState,
      stressLevel,
      focusLevel,
      timePressure,
      outcomeExpectation,
      attentionCheckPassed,
      skipped
    } = req.body;

    // Get environment data
    const envData = await envService.getEnvironmentData();

    // Create commitment hash
    const calibrationData = {
      userId,
      experimentType,
      sleepHours,
      moodState,
      stressLevel,
      focusLevel,
      timestamp: new Date().toISOString()
    };
    const nonce = crypto.randomBytes(16).toString('hex');
    const commitmentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(calibrationData) + nonce)
      .digest('hex');

    const calibration = await prisma.sessionCalibration.create({
      data: {
        userId,
        sessionId,
        experimentType,
        sleepHours: sleepHours || null,
        caffeineIntake: caffeineIntake || null,
        substancesUsed: substancesUsed || null,
        moodState: moodState || 5,
        stressLevel: stressLevel || 5,
        focusLevel: focusLevel || 5,
        timePressure: timePressure || false,
        outcomeExpectation: outcomeExpectation || 5,
        geomagneticIndex: envData.geomagneticIndex,
        lunarPhase: envData.lunarPhase,
        attentionCheckPassed: attentionCheckPassed !== false,
        commitmentHash,
        skipped: skipped || false
      }
    });

    console.log(`[Survey] Calibration saved for session ${sessionId}`);

    res.json({
      success: true,
      calibration,
      environmentData: envData,
      message: skipped
        ? 'Calibration skipped'
        : 'Session calibration saved successfully'
    });
  } catch (error) {
    console.error('[Survey] Calibration save error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/survey/calibration/:sessionId
 * Get calibration data for a session
 */
router.get('/calibration/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const calibration = await prisma.sessionCalibration.findFirst({
      where: { sessionId }
    });

    res.json({ calibration });
  } catch (error) {
    console.error('[Survey] Calibration fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST-EXPERIMENT FEEDBACK
// ============================================

/**
 * POST /api/survey/feedback
 * Submit post-experiment feedback
 * Requires authentication
 */
router.post('/feedback', authMiddleware, async (req, res) => {
  try {
    // SECURITY: Use authenticated user ID
    const userId = req.user.userId;
    const {
      sessionId,
      experimentType,
      difficulty,
      confidence,
      phenomenology,
      comments,
      tokensEarned,
      bonusTokens,
      tokenReason,
      achievementsUnlocked
    } = req.body;

    const feedback = await prisma.postExperimentFeedback.create({
      data: {
        userId,
        sessionId,
        experimentType,
        difficulty: difficulty || 5,
        confidence: confidence || 5,
        phenomenology: phenomenology || [],
        comments: comments || null,
        tokensEarned: tokensEarned || 0,
        bonusTokens: bonusTokens || 0,
        tokenReason: tokenReason || null,
        achievementsUnlocked: achievementsUnlocked || []
      }
    });

    console.log(`[Survey] Feedback saved for session ${sessionId}`);
    console.log(`[Survey] Tokens earned: ${tokensEarned + bonusTokens}`);

    res.json({
      success: true,
      feedback,
      totalTokens: tokensEarned + bonusTokens,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('[Survey] Feedback save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENVIRONMENT DATA
// ============================================

/**
 * GET /api/survey/environment
 * Get current environment data
 */
router.get('/environment', async (req, res) => {
  try {
    const envData = await envService.getEnvironmentData();

    res.json(envData);
  } catch (error) {
    console.error('[Survey] Environment fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
