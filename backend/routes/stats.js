/**
 * Stats Routes - Global statistics for experiments
 * /api/stats/*
 *
 * Provides aggregate statistics for homepage display and Bodega market integration
 */

const express = require('express');
const { getPrismaClient } = require('../db');

const router = express.Router();

const RV_EXPERIMENT_TYPES = [
  'remote-viewing',
  'remote-viewing-images',
  'remote-viewing-locations',
  'remote-viewing-objects',
];

/**
 * GET /api/stats/global
 * Get global platform statistics
 */
router.get('/global', async (req, res) => {
  try {
    const prisma = getPrismaClient();

    // Total experiment sessions across all types
    const totalExperiments = await prisma.experimentSession.count();

    // Pending analysis (responses submitted but not scored yet)
    const pendingAnalysis = await prisma.response.count({
      where: {
        aiScore: null,
      }
    });

    // Analyzed responses (have AI score)
    const analyzedCount = await prisma.response.count({
      where: {
        aiScore: { not: null }
      }
    });

    // Average AI score across all analyzed responses
    const scoreData = await prisma.response.aggregate({
      where: {
        aiScore: { not: null }
      },
      _avg: {
        aiScore: true
      }
    });

    // Active users (users with at least one experiment session)
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
    let totalRV;
    let completedRV;
    let rvAvgScore;
    let hits;
    let rvUsers;
    let recent7Days;
    let recent7DaysAvgScore;

    // Recent 7-day stats (for trending)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      // Preferred schema path: ExperimentSession + Response
      totalRV = await prisma.experimentSession.count({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES }
        }
      });

      completedRV = await prisma.response.count({
        where: {
          session: {
            experimentType: { in: RV_EXPERIMENT_TYPES }
          },
          aiScore: { not: null }
        }
      });

      const rvScoreData = await prisma.response.aggregate({
        where: {
          session: {
            experimentType: { in: RV_EXPERIMENT_TYPES }
          },
          aiScore: { not: null }
        },
        _avg: {
          aiScore: true
        }
      });
      rvAvgScore = rvScoreData._avg.aiScore || 0;

      hits = await prisma.response.count({
        where: {
          session: {
            experimentType: { in: RV_EXPERIMENT_TYPES }
          },
          aiScore: { gte: 60 }
        }
      });

      rvUsers = await prisma.user.count({
        where: {
          experiments: {
            some: {
              experimentType: { in: RV_EXPERIMENT_TYPES }
            }
          }
        }
      });

      recent7Days = await prisma.experimentSession.count({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          createdAt: { gte: sevenDaysAgo }
        }
      });

      const recent7DaysScoreData = await prisma.response.aggregate({
        where: {
          session: {
            experimentType: { in: RV_EXPERIMENT_TYPES }
          },
          aiScore: { not: null },
          submittedAt: { gte: sevenDaysAgo }
        },
        _avg: {
          aiScore: true
        }
      });
      recent7DaysAvgScore = recent7DaysScoreData._avg.aiScore || 0;
    } catch (primaryError) {
      console.warn('[Stats] Primary RV stats query failed; using commitment fallback:', primaryError.message);

      // Fallback schema path: Commitment table only (for partially migrated DBs)
      totalRV = await prisma.commitment.count({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES }
        }
      });

      completedRV = await prisma.commitment.count({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          score: { not: null }
        }
      });

      const rvScoreData = await prisma.commitment.aggregate({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          score: { not: null }
        },
        _avg: {
          score: true
        }
      });
      rvAvgScore = rvScoreData._avg.score || 0;

      hits = await prisma.commitment.count({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          score: { gte: 60 }
        }
      });

      const rvDistinctUsers = await prisma.commitment.findMany({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          userId: { not: null }
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      rvUsers = rvDistinctUsers.length;

      recent7Days = await prisma.commitment.count({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          createdAt: { gte: sevenDaysAgo }
        }
      });

      const recent7DaysScoreData = await prisma.commitment.aggregate({
        where: {
          experimentType: { in: RV_EXPERIMENT_TYPES },
          score: { not: null },
          createdAt: { gte: sevenDaysAgo }
        },
        _avg: {
          score: true
        }
      });
      recent7DaysAvgScore = recent7DaysScoreData._avg.score || 0;
    }

    // Build Bodega-compatible oracle response
    const bodegaOracle = {
      metric: 'remote_viewing_accuracy',
      value: rvAvgScore || 0,
      sampleSize: completedRV,
      timestamp: new Date().toISOString(),
      period: 'all_time',
      recent7Days: {
        trials: recent7Days,
        averageScore: recent7DaysAvgScore || 0
      }
    };

    res.json({
      success: true,
      stats: {
        totalTrials: totalRV,
        completedTrials: completedRV,
        averageAccuracy: rvAvgScore ? Math.round(rvAvgScore) : 0,
        hitRate: completedRV > 0 ? Math.round((hits / completedRV) * 100) : 0,
        activeResearchers: rvUsers,
        recent7Days: {
          trials: recent7Days,
          averageScore: recent7DaysAvgScore ? Math.round(recent7DaysAvgScore) : 0
        }
      },
      bodegaOracle, // Dedicated field for Bodega market integration
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Remote Viewing stats error:', error);

    // Never fail closed for dashboard stats; return a safe degraded payload.
    res.json({
      success: true,
      degraded: true,
      error: 'Stats temporarily unavailable; returning default values',
      stats: {
        totalTrials: 0,
        completedTrials: 0,
        averageAccuracy: 0,
        hitRate: 0,
        activeResearchers: 0,
        recent7Days: {
          trials: 0,
          averageScore: 0
        }
      },
      bodegaOracle: {
        metric: 'remote_viewing_accuracy',
        value: 0,
        sampleSize: 0,
        timestamp: new Date().toISOString(),
        period: 'all_time',
        recent7Days: {
          trials: 0,
          averageScore: 0
        }
      },
      timestamp: new Date().toISOString(),
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

    const totalCount = await prisma.experimentSession.count({
      where: { experimentType: type }
    });

    const completedCount = await prisma.response.count({
      where: {
        session: {
          experimentType: type
        },
        aiScore: { not: null }
      }
    });

    const scoreData = await prisma.response.aggregate({
      where: {
        session: {
          experimentType: type
        },
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
