const express = require('express');
const router = express.Router();
const { getPrismaClient } = require('../db');
const gamificationService = require('../services/gamificationService');

const prisma = getPrismaClient();
const { authMiddleware } = require('../auth');

/**
 * GET /api/gamification/stats
 * Get comprehensive gamification stats for authenticated user
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await gamificationService.getUserStats(prisma, userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Gamification] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gamification stats'
    });
  }
});

/**
 * GET /api/gamification/streak
 * Get user streak information
 */
router.get('/streak', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const streak = await prisma.userStreak.findUnique({
      where: { userId }
    });

    res.json({
      success: true,
      streak: streak || {
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
        lastActivityDate: null
      }
    });
  } catch (error) {
    console.error('[Gamification] Error fetching streak:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch streak'
    });
  }
});

/**
 * POST /api/gamification/activity
 * Record user activity and update streak
 */
router.post('/activity', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const streak = await gamificationService.updateStreak(prisma, userId);

    res.json({
      success: true,
      streak
    });
  } catch (error) {
    console.error('[Gamification] Error updating activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity'
    });
  }
});

/**
 * GET /api/gamification/achievements
 * Get all achievements and user progress
 */
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all achievements
    const allAchievements = await prisma.achievement.findMany({
      orderBy: [
        { category: 'asc' },
        { points: 'asc' }
      ]
    });

    // Get user's unlocked achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    });

    // Map achievements with unlock status
    const achievementsWithStatus = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(
        ua => ua.achievementId === achievement.id
      );

      return {
        ...achievement,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt || null,
        progress: userAchievement?.progress || 0
      };
    });

    // Calculate total points
    const totalPoints = userAchievements.reduce(
      (sum, ua) => sum + ua.achievement.points,
      0
    );

    res.json({
      success: true,
      achievements: achievementsWithStatus,
      totalUnlocked: userAchievements.length,
      totalPoints
    });
  } catch (error) {
    console.error('[Gamification] Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
});

/**
 * GET /api/gamification/performance
 * Get performance history for time-series analysis
 */
router.get('/performance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { experimentType, limit = 50 } = req.query;

    const where = { userId };
    if (experimentType) {
      where.experimentType = experimentType;
    }

    const performanceHistory = await prisma.performanceHistory.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      performanceHistory: performanceHistory.reverse() // Chronological order for charts
    });
  } catch (error) {
    console.error('[Gamification] Error fetching performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance history'
    });
  }
});

/**
 * GET /api/gamification/bayesian
 * Get Bayesian probability estimates for user
 */
router.get('/bayesian', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bayesianPriors = await prisma.bayesianPrior.findMany({
      where: { userId }
    });

    const estimates = bayesianPriors.map(prior => ({
      experimentType: prior.experimentType,
      estimatedPerformance: (prior.posteriorMean * 100).toFixed(1),
      uncertainty: (Math.sqrt(prior.posteriorVariance) * 100).toFixed(1),
      sampleSize: prior.sampleSize,
      priorMean: prior.priorMean,
      priorVariance: prior.priorVariance,
      posteriorMean: prior.posteriorMean,
      posteriorVariance: prior.posteriorVariance,
      lastUpdated: prior.lastUpdated
    }));

    res.json({
      success: true,
      estimates
    });
  } catch (error) {
    console.error('[Gamification] Error fetching Bayesian estimates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bayesian estimates'
    });
  }
});

/**
 * POST /api/gamification/record-performance
 * Manually record performance data (called after experiment completion)
 */
router.post('/record-performance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { experimentType, score, metadata } = req.body;

    if (!experimentType || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'experimentType and score are required'
      });
    }

    const performance = await gamificationService.recordPerformance(
      prisma,
      userId,
      experimentType,
      score,
      metadata || {}
    );

    // Also update streak
    await gamificationService.updateStreak(prisma, userId);

    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('[Gamification] Error recording performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record performance'
    });
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard rankings (global or by experiment type)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { experimentType, period = 'all_time', limit = 10 } = req.query;

    const where = { period };
    if (experimentType) {
      where.experimentType = experimentType;
    }

    const leaderboard = await prisma.leaderboard.findMany({
      where,
      orderBy: { overallRank: 'asc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('[Gamification] Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

// Admin check middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
};

/**
 * POST /api/gamification/initialize-achievements
 * Initialize default achievements (admin only)
 * Requires admin authentication
 */
router.post('/initialize-achievements', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await gamificationService.initializeAchievements(prisma);

    res.json({
      success: true,
      message: 'Default achievements initialized'
    });
  } catch (error) {
    console.error('[Gamification] Error initializing achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize achievements'
    });
  }
});

module.exports = router;
