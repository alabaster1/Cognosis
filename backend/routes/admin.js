/**
 * Admin Dashboard Routes
 * /api/admin/*
 *
 * Requires authentication and admin privileges
 */

const express = require('express');
const { getPrismaClient } = require('../db');
const { authMiddleware } = require('../auth');
const monitoring = require('../offchain_coordinator/monitoring');

const router = express.Router();

// Admin middleware - verifies auth then checks admin role
const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, async () => {
    try {
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true }
      });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
      next();
    } catch (error) {
      console.error('Admin role check error:', error);
      res.status(500).json({ success: false, error: 'Authorization check failed' });
    }
  });
};

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview
 */
router.get('/dashboard', adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();

    // Get system metrics
    const [
      totalUsers,
      totalExperiments,
      totalResponses,
      totalCommitments,
      activeUsers24h,
      completedExperiments24h,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.experimentSession.count(),
      prisma.response.count(),
      prisma.commitment.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.experimentSession.count({
        where: {
          completedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          status: 'completed'
        }
      }),
    ]);

    // Get monitoring metrics
    const monitoringMetrics = monitoring.getMetrics();
    const health = monitoring.getHealth();

    // Get top experiments by popularity
    const experimentStats = await prisma.experimentSession.groupBy({
      by: ['experimentType'],
      _count: {
        experimentType: true
      },
      orderBy: {
        _count: {
          experimentType: 'desc'
        }
      },
      take: 10
    });

    // Get recent errors
    const recentErrors = await prisma.analyticsEvent.findMany({
      where: {
        success: false,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 20
    });

    // Commitment/reveal stats
    const commitmentStats = await prisma.commitment.aggregate({
      _count: {
        id: true
      },
      where: {
        revealed: false
      }
    });

    const revealedStats = await prisma.commitment.aggregate({
      _count: {
        id: true
      },
      where: {
        revealed: true
      }
    });

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalUsers,
          totalExperiments,
          totalResponses,
          totalCommitments,
          activeUsers24h,
          completedExperiments24h,
        },
        health: {
          status: health.status,
          issues: health.issues,
          uptime: health.uptime,
        },
        monitoring: {
          commits: monitoringMetrics.commits,
          reveals: monitoringMetrics.reveals,
          ipfsUploads: monitoringMetrics.ipfsUploads,
          errorRates: monitoringMetrics.errorRates,
          activeAlerts: monitoringMetrics.activeAlerts,
        },
        experiments: {
          topByPopularity: experimentStats,
        },
        commitments: {
          unrevealed: commitmentStats._count.id,
          revealed: revealedStats._count.id,
        },
        errors: {
          recent24h: recentErrors.length,
          list: recentErrors.slice(0, 10),
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/users
 * Get user list with pagination
 */
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { page = 1, limit = 50, search = '' } = req.query;

    const cappedLimit = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * cappedLimit;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          _count: {
            select: {
              experiments: true,
              responses: true,
              commitments: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: cappedLimit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: cappedLimit,
        total,
        pages: Math.ceil(total / cappedLimit),
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/experiments
 * Get experiment sessions with pagination
 */
router.get('/experiments', adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { page = 1, limit = 50, status = 'all', experimentType = 'all' } = req.query;

    const cappedLimit = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * cappedLimit;

    const where = {
      ...(status !== 'all' && { status }),
      ...(experimentType !== 'all' && { experimentType }),
    };

    const [experiments, total] = await Promise.all([
      prisma.experimentSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              walletAddress: true,
            }
          },
          responses: {
            select: {
              id: true,
              aiScore: true,
              submittedAt: true,
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        },
        skip,
        take: cappedLimit,
      }),
      prisma.experimentSession.count({ where }),
    ]);

    res.json({
      success: true,
      experiments,
      pagination: {
        page: parseInt(page),
        limit: cappedLimit,
        total,
        pages: Math.ceil(total / cappedLimit),
      }
    });
  } catch (error) {
    console.error('Admin experiments error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/commitments
 * Get blockchain commitments with pagination
 */
router.get('/commitments', adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { page = 1, limit = 50, revealed = 'all' } = req.query;

    const cappedLimit = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * cappedLimit;

    const where = revealed !== 'all' ? { revealed: revealed === 'true' } : {};

    const [commitments, total] = await Promise.all([
      prisma.commitment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              walletAddress: true,
            }
          },
          response: {
            select: {
              id: true,
              aiScore: true,
              submittedAt: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: cappedLimit,
      }),
      prisma.commitment.count({ where }),
    ]);

    res.json({
      success: true,
      commitments,
      pagination: {
        page: parseInt(page),
        limit: cappedLimit,
        total,
        pages: Math.ceil(total / cappedLimit),
      }
    });
  } catch (error) {
    console.error('Admin commitments error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/analytics
 * Get analytics overview
 */
router.get('/analytics', adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { days = 7 } = req.query;

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Daily user registrations
    const registrations = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      }
    });

    // Daily experiment completions
    const completions = await prisma.experimentSession.groupBy({
      by: ['completedAt'],
      where: {
        completedAt: {
          gte: startDate
        },
        status: 'completed'
      },
      _count: {
        id: true
      }
    });

    // Event type distribution
    const events = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _count: {
        eventType: true
      }
    });

    res.json({
      success: true,
      analytics: {
        registrations,
        completions,
        events,
        period: `${days} days`,
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/metrics/snapshot
 * Create system metrics snapshot
 */
router.post('/metrics/snapshot', adminMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const monitoring = require('../offchain_coordinator/monitoring');

    const metrics = monitoring.getMetrics();

    const snapshot = await prisma.systemMetrics.create({
      data: {
        totalUsers: await prisma.user.count(),
        activeUsers: await prisma.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        totalExperiments: await prisma.experimentSession.count(),
        totalCommits: metrics.commits.total,
        totalReveals: metrics.reveals.total,
        avgResponseTime: parseFloat(metrics.errorRates.commits) || 0,
        errorRate: parseFloat(metrics.errorRates.commits) || 0,
      }
    });

    res.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error('Admin snapshot error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
