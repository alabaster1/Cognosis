const express = require('express');
const router = express.Router();
const { getPrismaClient } = require('../db');

const prisma = getPrismaClient();

/**
 * GET /api/meta-analysis/summary
 * Get aggregated performance statistics across all users and experiments
 */
router.get('/summary', async (req, res) => {
  try {
    const { experimentType, period = 'all_time' } = req.query;

    // Calculate date range based on period
    let dateFilter = {};
    if (period === 'daily') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dateFilter = { gte: yesterday };
    } else if (period === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateFilter = { gte: lastWeek };
    } else if (period === 'monthly') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      dateFilter = { gte: lastMonth };
    }

    const where = {};
    if (experimentType) {
      where.experimentType = experimentType;
    }
    if (Object.keys(dateFilter).length > 0) {
      where.recordedAt = dateFilter;
    }

    // Get all performance data
    const performanceData = await prisma.performanceHistory.findMany({
      where,
      select: {
        score: true,
        accuracy: true,
        delta: true,
        zScore: true,
        pValue: true,
        experimentType: true
      }
    });

    if (performanceData.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalTrials: 0,
          averageScore: 0,
          stdDeviation: 0,
          medianScore: 0,
          aboveChance: 0,
          percentAboveChance: 0,
          effectSize: 0,
          aggregateZScore: null,
          aggregatePValue: null
        }
      });
    }

    // Calculate statistics
    const scores = performanceData.map(p => p.score);
    const totalTrials = scores.length;

    // Mean
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = sum / totalTrials;

    // Standard deviation
    const squareDiffs = scores.map(score => Math.pow(score - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / totalTrials;
    const stdDev = Math.sqrt(avgSquareDiff);

    // Median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = totalTrials % 2 === 0
      ? (sortedScores[totalTrials / 2 - 1] + sortedScores[totalTrials / 2]) / 2
      : sortedScores[Math.floor(totalTrials / 2)];

    // Above chance (50%)
    const aboveChance = scores.filter(s => s > 50).length;
    const percentAboveChance = (aboveChance / totalTrials) * 100;

    // Effect size (Cohen's d)
    const baseline = 50; // Chance level
    const effectSize = (mean - baseline) / stdDev;

    // Meta-analytic Z-score (Stouffer's method)
    const zScores = performanceData
      .map(p => p.zScore)
      .filter(z => z !== null && z !== undefined);

    let aggregateZScore = null;
    let aggregatePValue = null;

    if (zScores.length > 0) {
      const sumZ = zScores.reduce((a, b) => a + b, 0);
      aggregateZScore = sumZ / Math.sqrt(zScores.length);

      // Calculate p-value from Z-score (two-tailed)
      aggregatePValue = 2 * (1 - normalCDF(Math.abs(aggregateZScore)));
    }

    // Breakdown by experiment type
    const byExperiment = {};
    performanceData.forEach(p => {
      if (!byExperiment[p.experimentType]) {
        byExperiment[p.experimentType] = [];
      }
      byExperiment[p.experimentType].push(p.score);
    });

    const experimentBreakdown = Object.entries(byExperiment).map(([type, scores]) => {
      const expMean = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        experimentType: type,
        trials: scores.length,
        averageScore: expMean,
        aboveChance: scores.filter(s => s > 50).length,
        percentAboveChance: (scores.filter(s => s > 50).length / scores.length) * 100
      };
    });

    res.json({
      success: true,
      summary: {
        totalTrials,
        averageScore: mean,
        stdDeviation: stdDev,
        medianScore,
        aboveChance,
        percentAboveChance,
        effectSize,
        aggregateZScore,
        aggregatePValue,
        experimentBreakdown,
        period,
        dateRange: Object.keys(dateFilter).length > 0 ? dateFilter : 'all_time'
      }
    });
  } catch (error) {
    console.error('[MetaAnalysis] Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meta-analysis summary'
    });
  }
});

/**
 * GET /api/meta-analysis/time-series
 * Get aggregated performance over time
 */
router.get('/time-series', async (req, res) => {
  try {
    const { experimentType, granularity = 'daily', limit = 30 } = req.query;

    const where = {};
    if (experimentType) {
      where.experimentType = experimentType;
    }

    // Get performance data
    const performanceData = await prisma.performanceHistory.findMany({
      where,
      select: {
        score: true,
        recordedAt: true,
        experimentType: true
      },
      orderBy: { recordedAt: 'asc' }
    });

    // Group by time period
    const grouped = {};

    performanceData.forEach(p => {
      const date = new Date(p.recordedAt);
      let key;

      if (granularity === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(p.score);
    });

    // Calculate statistics for each period
    const timeSeries = Object.entries(grouped)
      .map(([period, scores]) => {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const aboveChance = scores.filter(s => s > 50).length;

        return {
          period,
          trials: scores.length,
          averageScore: mean,
          percentAboveChance: (aboveChance / scores.length) * 100
        };
      })
      .slice(-parseInt(limit)); // Get last N periods

    res.json({
      success: true,
      timeSeries,
      granularity
    });
  } catch (error) {
    console.error('[MetaAnalysis] Error fetching time series:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time series data'
    });
  }
});

/**
 * GET /api/meta-analysis/top-performers
 * Get top performing users (anonymized)
 */
router.get('/top-performers', async (req, res) => {
  try {
    const { experimentType, limit = 10 } = req.query;

    const where = {};
    if (experimentType) {
      where.experimentType = experimentType;
    }

    // Get aggregated performance by user
    const userPerformance = await prisma.performanceHistory.groupBy({
      by: ['userId'],
      where,
      _avg: {
        score: true
      },
      _count: {
        score: true
      },
      having: {
        score: {
          _count: {
            gte: 5 // Minimum 5 trials
          }
        }
      }
    });

    // Sort by average score
    const sortedPerformers = userPerformance
      .map(up => ({
        userId: up.userId.substring(0, 8) + '...', // Anonymize
        averageScore: up._avg.score,
        trials: up._count.score
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      topPerformers: sortedPerformers
    });
  } catch (error) {
    console.error('[MetaAnalysis] Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers'
    });
  }
});

/**
 * GET /api/meta-analysis/distribution
 * Get score distribution histogram
 */
router.get('/distribution', async (req, res) => {
  try {
    const { experimentType, bins = 10 } = req.query;

    const where = {};
    if (experimentType) {
      where.experimentType = experimentType;
    }

    const performanceData = await prisma.performanceHistory.findMany({
      where,
      select: {
        score: true
      }
    });

    if (performanceData.length === 0) {
      return res.json({
        success: true,
        distribution: [],
        binSize: 0
      });
    }

    // Create histogram bins
    const scores = performanceData.map(p => p.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const binSize = (maxScore - minScore) / parseInt(bins);

    const distribution = [];
    for (let i = 0; i < parseInt(bins); i++) {
      const binStart = minScore + i * binSize;
      const binEnd = binStart + binSize;
      const count = scores.filter(s => s >= binStart && s < binEnd).length;

      distribution.push({
        binStart: binStart.toFixed(1),
        binEnd: binEnd.toFixed(1),
        count,
        percentage: (count / scores.length) * 100
      });
    }

    res.json({
      success: true,
      distribution,
      binSize,
      totalScores: scores.length
    });
  } catch (error) {
    console.error('[MetaAnalysis] Error fetching distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distribution'
    });
  }
});

/**
 * GET /api/meta-analysis/bayesian-aggregate
 * Get aggregate Bayesian estimates across all users
 */
router.get('/bayesian-aggregate', async (req, res) => {
  try {
    const { experimentType } = req.query;

    const where = {};
    if (experimentType) {
      where.experimentType = experimentType;
    }

    const bayesianPriors = await prisma.bayesianPrior.findMany({
      where,
      select: {
        experimentType: true,
        posteriorMean: true,
        posteriorVariance: true,
        sampleSize: true
      }
    });

    // Group by experiment type
    const byExperiment = {};
    bayesianPriors.forEach(bp => {
      if (!byExperiment[bp.experimentType]) {
        byExperiment[bp.experimentType] = [];
      }
      byExperiment[bp.experimentType].push(bp);
    });

    // Calculate population-level estimates
    const aggregates = Object.entries(byExperiment).map(([type, priors]) => {
      // Weighted average by sample size
      const totalSamples = priors.reduce((sum, p) => sum + p.sampleSize, 0);
      const weightedMean = priors.reduce((sum, p) =>
        sum + (p.posteriorMean * p.sampleSize), 0) / totalSamples;

      // Pooled variance
      const pooledVariance = priors.reduce((sum, p) =>
        sum + (p.posteriorVariance * p.sampleSize), 0) / totalSamples;

      return {
        experimentType: type,
        populationMean: (weightedMean * 100).toFixed(1),
        populationUncertainty: (Math.sqrt(pooledVariance) * 100).toFixed(1),
        totalSamples,
        userCount: priors.length
      };
    });

    res.json({
      success: true,
      aggregates
    });
  } catch (error) {
    console.error('[MetaAnalysis] Error fetching Bayesian aggregate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bayesian aggregate'
    });
  }
});

/**
 * Helper: Normal CDF approximation
 */
function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

module.exports = router;
