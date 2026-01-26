/**
 * Feed Routes - Real-time experiment results and global statistics
 * Serves actual participant data from the database for the Global Research Feed.
 */

const express = require('express');
const router = express.Router();
const { getPrismaClient } = require('../db');
const { optionalAuthMiddleware } = require('../auth');
const { readLimiter } = require('../middleware/rateLimit');
const statisticsService = require('../services/statisticsService');

/**
 * GET /api/feed/recent
 * Returns the most recent experiment responses with scores.
 * Query params: limit (default 50), offset (default 0), experimentType (optional filter)
 */
router.get('/recent', async (req, res) => {
  const prisma = getPrismaClient();
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const experimentType = req.query.experimentType || null;

    const where = {
      aiScore: { not: null },
    };
    if (experimentType) {
      where.responseType = experimentType;
    }

    const responses = await prisma.response.findMany({
      where,
      orderBy: { scoredAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        responseType: true,
        aiScore: true,
        aiScoreBreakdown: true,
        scoredAt: true,
        userId: true,
        session: {
          select: {
            experimentType: true,
            targetHash: true,
          }
        }
      }
    });

    // Map to feed format
    const baselines = {
      'pattern-oracle': 20,
      'timeline-racer': 25,
      'retro-roulette': 50,
      'emotion-echo': 12.5,
      'quantum-coin-arena': 50,
      'psi-poker': 1.92,
      'mind-pulse': 16.7,
      'synchronicity-bingo': 20,
      'card-prediction': 25,
      'remote-viewing': 50,
      'remote-viewing-images': 50,
      'remote-viewing-locations': 50,
      'remote-viewing-objects': 50,
      'ai-telepathy': 25,
      'dice-influence': 16.67,
      'precognition': 50,
    };

    const results = responses.map(r => {
      const expType = r.responseType || r.session?.experimentType || 'unknown';
      const baseline = baselines[expType] || 25;
      const accuracy = r.aiScore || 0;
      const delta = accuracy - baseline;

      // Generate anonymized alias from userId
      const hash = (r.userId || 'unknown').slice(-8);
      const adjectives = ['Cosmic', 'Quantum', 'Mystic', 'Astral', 'Neural', 'Ethereal', 'Stellar', 'Lunar'];
      const nouns = ['Fox', 'Owl', 'Wolf', 'Raven', 'Phoenix', 'Dolphin', 'Eagle', 'Hawk'];
      const adjIdx = parseInt(hash.slice(0, 4), 16) % adjectives.length || 0;
      const nounIdx = parseInt(hash.slice(4, 8), 16) % nouns.length || 0;
      const anonymizedUser = `${adjectives[adjIdx]}${nouns[nounIdx]}_${hash.slice(0, 4)}`;

      // Extract commitment hash from session or breakdown
      const commitmentHash = r.session?.targetHash || r.aiScoreBreakdown?.commitmentHash || null;

      return {
        id: r.id,
        experimentType: expType,
        score: Math.round(accuracy),
        accuracy,
        baseline,
        delta: parseFloat(delta.toFixed(2)),
        timestamp: r.scoredAt?.toISOString() || new Date().toISOString(),
        commitmentHash,
        verified: !!r.session?.targetHash,
        anonymizedUser,
      };
    });

    res.json({ success: true, results, total: results.length, offset });
  } catch (error) {
    console.error('[Feed] Recent results error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/feed/submit
 * Submit an experiment result to the global feed.
 */
router.post('/submit', async (req, res) => {
  const prisma = getPrismaClient();
  try {
    const {
      experimentType,
      score,
      accuracy,
      baseline,
      commitmentId,
      commitmentHash,
      verified = false,
      walletAddress,
    } = req.body;

    if (!experimentType || accuracy == null) {
      return res.status(400).json({ success: false, error: 'experimentType and accuracy are required' });
    }

    // Generate anonymized alias
    const userId = walletAddress || `guest_${Date.now()}`;
    const hash = userId.slice(-8);
    const adjectives = ['Cosmic', 'Quantum', 'Mystic', 'Astral', 'Neural', 'Ethereal', 'Stellar', 'Lunar'];
    const nouns = ['Fox', 'Owl', 'Wolf', 'Raven', 'Phoenix', 'Dolphin', 'Eagle', 'Hawk'];
    const adjIdx = parseInt(hash.slice(0, 4), 16) % adjectives.length || 0;
    const nounIdx = parseInt(hash.slice(4, 8), 16) % nouns.length || 0;
    const anonymizedUser = `${adjectives[adjIdx]}${nouns[nounIdx]}_${hash.slice(0, 4)}`;

    // Look up commitment hash if commitmentId provided
    let resolvedCommitmentHash = commitmentHash || null;
    if (commitmentId && !resolvedCommitmentHash) {
      const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
      if (commitment) {
        resolvedCommitmentHash = commitment.commitmentHash;
      }
    }

    const delta = accuracy - (baseline || 0);

    res.json({
      success: true,
      feedResult: {
        id: `feed_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        experimentType,
        score: Math.round(score || accuracy),
        accuracy,
        baseline: baseline || 0,
        delta: parseFloat(delta.toFixed(2)),
        timestamp: new Date().toISOString(),
        commitmentHash: resolvedCommitmentHash,
        verified: !!verified,
        anonymizedUser,
      },
    });
  } catch (error) {
    console.error('[Feed] Submit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/feed/stats
 * Returns global statistics with proper p-values, z-scores, and effect sizes.
 * Computes stats from scored responses in the database.
 * Rate limited to prevent DoS attacks via expensive queries
 */
router.get('/stats', readLimiter, async (req, res) => {
  const prisma = getPrismaClient();
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total experiments with scores
    const totalCount = await prisma.response.count({
      where: { aiScore: { not: null } }
    });

    // Today's experiments
    const todayCount = await prisma.response.count({
      where: {
        aiScore: { not: null },
        scoredAt: { gte: todayStart }
      }
    });

    // Active researchers in last 24h
    const activeUsers = await prisma.response.findMany({
      where: {
        scoredAt: { gte: last24h }
      },
      select: { userId: true },
      distinct: ['userId']
    });

    // Get scored responses for statistical analysis (limit to prevent DoS)
    // Using a sample of recent responses for statistics calculation
    const allScores = await prisma.response.findMany({
      where: { aiScore: { not: null } },
      select: {
        aiScore: true,
        responseType: true,
      },
      orderBy: { scoredAt: 'desc' },
      take: 10000 // Limit to prevent unbounded queries
    });

    const baselines = {
      'pattern-oracle': 20,
      'timeline-racer': 25,
      'retro-roulette': 50,
      'emotion-echo': 12.5,
      'quantum-coin-arena': 50,
      'psi-poker': 1.92,
      'mind-pulse': 16.7,
      'synchronicity-bingo': 20,
      'card-prediction': 25,
      'remote-viewing': 50,
      'remote-viewing-images': 50,
      'remote-viewing-locations': 50,
      'remote-viewing-objects': 50,
      'ai-telepathy': 25,
      'dice-influence': 16.67,
      'precognition': 50,
    };

    if (allScores.length === 0) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          today: 0,
          hitRate: 0,
          baseline: 25,
          pValue: 1.0,
          effectSize: 0,
          zScore: 0,
          significanceLevel: 'none',
          activeUsers24h: 0,
        }
      });
    }

    // Compute weighted average accuracy and baseline
    const scores = allScores.map(s => s.aiScore);
    const experimentBaselines = allScores.map(s => baselines[s.responseType] || 25);
    const avgAccuracy = scores.reduce((a, b) => a + b, 0) / scores.length;
    const avgBaseline = experimentBaselines.reduce((a, b) => a + b, 0) / experimentBaselines.length;

    // Compute global z-score and p-value
    const n = scores.length;
    const sampleStdDev = n > 1
      ? Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avgAccuracy, 2), 0) / (n - 1))
      : 15;
    const se = sampleStdDev / Math.sqrt(n);
    const delta = avgAccuracy - avgBaseline;
    const zScore = se > 0 ? delta / se : 0;

    // One-tailed p-value: testing above chance
    const pValue = zScore > 0 ? statisticsService.calculatePValue(zScore) : 1.0;

    // Effect size (Cohen's d)
    const effectSize = sampleStdDev > 0 ? delta / sampleStdDev : 0;

    // Significance level
    const significanceLevel = pValue < 0.01 ? 'highly_significant'
      : pValue < 0.05 ? 'significant'
      : pValue < 0.10 ? 'marginal'
      : 'none';

    res.json({
      success: true,
      stats: {
        total: totalCount,
        today: todayCount,
        hitRate: parseFloat(avgAccuracy.toFixed(2)),
        baseline: parseFloat(avgBaseline.toFixed(2)),
        pValue: parseFloat(pValue.toFixed(6)),
        effectSize: parseFloat(effectSize.toFixed(4)),
        zScore: parseFloat(zScore.toFixed(3)),
        significanceLevel,
        activeUsers24h: activeUsers.length,
        sampleSize: n,
      }
    });
  } catch (error) {
    console.error('[Feed] Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
