/**
 * Leaderboard Routes
 * /api/leaderboard/*
 */

const express = require('express');
const { getPrismaClient } = require('../db');
const { authMiddleware, optionalAuthMiddleware } = require('../auth');

const router = express.Router();

// Admin check middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
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
 * GET /api/leaderboard
 * Get global leaderboard
 */
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { experimentType, period = 'all_time', limit = 50 } = req.query;
    const take = Math.min(parseInt(limit) || 50, 200);

    const leaderboard = await prisma.leaderboard.findMany({
      where: {
        experimentType: experimentType || null,
        period: period,
      },
      orderBy: {
        overallRank: 'asc',
      },
      take,
    });

    // If current user is authenticated, find their rank
    let currentUserRank = null;
    if (req.user) {
      const userEntry = await prisma.leaderboard.findUnique({
        where: {
          userId_experimentType_period: {
            userId: req.user.userId,
            experimentType: experimentType || null,
            period: period,
          }
        }
      });
      if (userEntry) {
        currentUserRank = userEntry.overallRank;
      }
    }

    res.json({
      success: true,
      leaderboard,
      currentUserRank,
      period,
      experimentType: experimentType || 'all',
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Get user's leaderboard entries
 * Requires authentication - users can only view their own data
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { userId } = req.params;

    // SECURITY: Users can only access their own leaderboard data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you can only view your own leaderboard data',
      });
    }

    const entries = await prisma.leaderboard.findMany({
      where: { userId },
      orderBy: {
        overallRank: 'asc',
      }
    });

    res.json({
      success: true,
      entries,
    });
  } catch (error) {
    console.error('User leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data',
    });
  }
});

/**
 * POST /api/leaderboard/update
 * Update leaderboard (admin/cron job)
 * Requires admin authentication
 */
router.post('/update', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();

    // Recalculate leaderboard for all users
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        experiments: {
          where: { status: 'completed' },
          select: {
            experimentType: true,
            finalScore: true,
          }
        }
      }
    });

    const periods = ['all_time', 'monthly', 'weekly', 'daily'];
    const experimentTypes = [
      null, // Overall
      'remote-viewing',
      'premonition',
      'dream-logging',
      'telepathy',
      'time-displacement',
      'synchronicity',
      'memory-field',
      'entanglement',
      'chance-influence',
      'collective-field',
    ];

    for (const period of periods) {
      for (const experimentType of experimentTypes) {
        // Calculate scores for this category
        const userScores = users.map(user => {
          const relevantExperiments = user.experiments.filter(exp => {
            if (experimentType && exp.experimentType !== experimentType) {
              return false;
            }
            // TODO: Add time filtering for non-all_time periods
            return true;
          });

          const scores = relevantExperiments
            .map(exp => exp.finalScore)
            .filter(score => score !== null);

          const totalExperiments = relevantExperiments.length;
          const averageScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
          const bestScore = scores.length > 0
            ? Math.max(...scores)
            : 0;

          return {
            userId: user.id,
            walletAddress: user.walletAddress,
            username: user.username || user.profile?.displayName,
            totalExperiments,
            averageScore,
            bestScore,
            overallScore: averageScore * totalExperiments, // Weight by participation
          };
        })
          .filter(u => u.totalExperiments > 0)
          .sort((a, b) => b.overallScore - a.overallScore);

        // Assign ranks
        userScores.forEach((user, index) => {
          user.overallRank = index + 1;
        });

        // Update leaderboard
        for (const userScore of userScores) {
          await prisma.leaderboard.upsert({
            where: {
              userId_experimentType_period: {
                userId: userScore.userId,
                experimentType,
                period,
              }
            },
            create: {
              userId: userScore.userId,
              walletAddress: userScore.walletAddress,
              username: userScore.username,
              experimentType,
              period,
              overallRank: userScore.overallRank,
              overallScore: userScore.overallScore,
              totalExperiments: userScore.totalExperiments,
              averageScore: userScore.averageScore,
              bestScore: userScore.bestScore,
            },
            update: {
              overallRank: userScore.overallRank,
              overallScore: userScore.overallScore,
              totalExperiments: userScore.totalExperiments,
              averageScore: userScore.averageScore,
              bestScore: userScore.bestScore,
            }
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Leaderboard updated',
      usersProcessed: users.length,
    });
  } catch (error) {
    console.error('Update leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
