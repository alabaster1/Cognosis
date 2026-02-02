/**
 * Stats Routes - Global statistics for experiments
 * /api/stats/*
 * 
 * Provides aggregate statistics for homepage display and Bodega market integration
 */

const express = require('express');
const { getPrismaClient } = require('../db');

const router = express.Router();

/**
 * GET /api/stats/global
 * Get global platform statistics
 */
router.get('/global', async (req, res) => {
  try {
    const prisma = getPrismaClient();

    // Total experiments across all types
    const totalExperiments = await prisma.experiment.count();

    // Pending analysis (committed but not scored yet)
    const pendingAnalysis = await prisma.experiment.count({
      where: {
        stage: { in: ['committed', 'revealed'] },
        aiScore: null,
      }
    });

    // Analyzed experiments (have AI score)
    const analyzedCount = await prisma.experiment.count({
      where: {
        aiScore: { not: null }
      }
    });

    // Average AI score across all analyzed experiments
    const scoreData = await prisma.experiment.aggregate({
      where: {
        aiScore: { not: null }
      },
      _avg: {
        aiScore: true
      }
    });

    // Active users (users with at least one experiment)
    const activeUsers = await prisma.user.count({
      where: {
        experiments: {
          some: {}
        }
      }
    });

    res.json({
      success: true,
      stats: {
        totalTrials: totalExperiments,
        pendingAnalysis,
        analyzedTrials: analyzedCount,
        averageAccuracy: scoreData._avg.aiScore ? Math.round(scoreData._avg.aiScore) : 0,
        activeResearchers: activeUsers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Global stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global statistics'
    });
  }
});

/**
 * GET /api/stats/remote-viewing
 * Get Remote Viewing specific statistics
 * BODEGA MARKET INTEGRATION: This endpoint provides oracle data for prediction markets
 */
router.get('/remote-viewing', async (req, res) => {
  try {
    const prisma = getPrismaClient();

    // All Remote Viewing experiments
    const totalRV = await prisma.experiment.count({
      where: {
        experimentType: 'remote-viewing'
      }
    });

    // Completed RV (have AI score)
    const completedRV = await prisma.experiment.count({
      where: {
        experimentType: 'remote-viewing',
        aiScore: { not: null }
      }
    });

    // RV Average Score
    const rvScoreData = await prisma.experiment.aggregate({
      where: {
        experimentType: 'remote-viewing',
        aiScore: { not: null }
      },
      _avg: {
        aiScore: true
      }
    });

    // Success rate (score >= 60 is considered a "hit")
    const hits = await prisma.experiment.count({
      where: {
        experimentType: 'remote-viewing',
        aiScore: { gte: 60 }
      }
    });

    // Active RV researchers
    const rvUsers = await prisma.user.count({
      where: {
        experiments: {
          some: {
            experimentType: 'remote-viewing'
          }
        }
      }
    });

    // Recent 7-day stats (for trending)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent7Days = await prisma.experiment.count({
      where: {
        experimentType: 'remote-viewing',
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const recent7DaysScoreData = await prisma.experiment.aggregate({
      where: {
        experimentType: 'remote-viewing',
        aiScore: { not: null },
        createdAt: { gte: sevenDaysAgo }
      },
      _avg: {
        aiScore: true
      }
    });

    // Build Bodega-compatible oracle response
    const bodegaOracle = {
      metric: 'remote_viewing_accuracy',
      value: rvScoreData._avg.aiScore || 0,
      sampleSize: completedRV,
      timestamp: new Date().toISOString(),
      period: 'all_time',
      recent7Days: {
        trials: recent7Days,
        averageScore: recent7DaysScoreData._avg.aiScore || 0
      }
    };

    res.json({
      success: true,
      stats: {
        totalTrials: totalRV,
        completedTrials: completedRV,
        averageAccuracy: rvScoreData._avg.aiScore ? Math.round(rvScoreData._avg.aiScore) : 0,
        hitRate: completedRV > 0 ? Math.round((hits / completedRV) * 100) : 0,
        activeResearchers: rvUsers,
        recent7Days: {
          trials: recent7Days,
          averageScore: recent7DaysScoreData._avg.aiScore ? Math.round(recent7DaysScoreData._avg.aiScore) : 0
        }
      },
      bodegaOracle, // Dedicated field for Bodega market integration
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Remote Viewing stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Remote Viewing statistics'
    });
  }
});

/**
 * GET /api/stats/experiment/:type
 * Get statistics for a specific experiment type
 */
router.get('/experiment/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const prisma = getPrismaClient();

    const totalCount = await prisma.experiment.count({
      where: { experimentType: type }
    });

    const completedCount = await prisma.experiment.count({
      where: {
        experimentType: type,
        aiScore: { not: null }
      }
    });

    const scoreData = await prisma.experiment.aggregate({
      where: {
        experimentType: type,
        aiScore: { not: null }
      },
      _avg: {
        aiScore: true
      }
    });

    res.json({
      success: true,
      experimentType: type,
      stats: {
        totalTrials: totalCount,
        completedTrials: completedCount,
        averageAccuracy: scoreData._avg.aiScore ? Math.round(scoreData._avg.aiScore) : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Stats error for ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiment statistics'
    });
  }
});

module.exports = router;
