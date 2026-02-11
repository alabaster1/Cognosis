/**
 * Statistics Service - Scientific Analysis for Psi Research
 *
 * Provides statistical rigor to prediction accuracy:
 * - P-values and statistical significance
 * - Z-scores and effect sizes
 * - Baseline comparisons (vs chance)
 * - Performance trends over time
 * - Experiment type analysis
 */

class StatisticsService {
  /**
   * Calculate comprehensive statistics for a single score
   */
  calculateScoreStatistics(score, experimentType = 'precognition') {
    // Expected chance performance by experiment type
    const chanceBaselines = {
      'precognition': 50,      // 50% = random guess quality
      'remote-viewing': 50,
      'telepathy': 50,
      'dream-journal': 50,
      'card-prediction': 1.92, // 1/52 = 1.92%
      'rng-pk': 50,           // 50% heads/tails
      'dice': 16.67,          // 1/6 = 16.67%
      'default': 50
    };

    const baseline = chanceBaselines[experimentType] || chanceBaselines.default;
    const deviation = score - baseline;

    // Z-score: how many standard deviations from chance
    // Assuming std dev of ~15 for subjective scoring (typical for human judgment)
    const stdDev = 15;
    const zScore = deviation / stdDev;

    // P-value (one-tailed test for psi-hitting, only scores above baseline)
    // Scores below baseline are considered random variation, not psi effects
    const pValue = deviation > 0
      ? this.calculatePValue(zScore)
      : 1.0; // Below baseline = not significant

    // Effect size (Cohen's d)
    const effectSize = deviation / stdDev;

    // Statistical significance levels (only for above-baseline scores)
    const significance = this.determineSignificance(pValue);

    return {
      score,
      baseline,
      deviation,
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      effectSize: parseFloat(effectSize.toFixed(3)),
      significance,
      significanceLevel: significance, // Add this for dashboard compatibility
      interpretation: this.interpretResult(score, baseline, pValue, significance, deviation)
    };
  }

  /**
   * Calculate p-value from z-score using Abramowitz & Stegun approximation.
   * Returns one-tailed p-value: P(Z > |z|) — appropriate for psi-hitting
   * hypothesis where we test if performance exceeds chance.
   */
  calculatePValue(zScore) {
    const absZ = Math.abs(zScore);

    // Approximation of upper-tail probability P(Z > z)
    const t = 1 / (1 + 0.2316419 * absZ);
    const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return p; // One-tailed: P(Z > |z|)
  }

  /**
   * Determine significance level
   */
  determineSignificance(pValue) {
    if (pValue < 0.001) return 'highly_significant'; // p < 0.001 ***
    if (pValue < 0.01) return 'very_significant';    // p < 0.01 **
    if (pValue < 0.05) return 'significant';         // p < 0.05 *
    if (pValue < 0.10) return 'marginally_significant'; // p < 0.10 †
    return 'not_significant';
  }

  /**
   * Interpret statistical result
   */
  interpretResult(score, baseline, pValue, significance, deviation) {
    const diff = score - baseline;
    const direction = diff > 0 ? 'above' : 'below';

    // Only scores above baseline can be statistically significant for psi-hitting
    const interpretations = {
      'highly_significant': `Extremely strong evidence of psi effect (p < 0.001)`,
      'very_significant': `Strong evidence of psi effect (p < 0.01)`,
      'significant': `Significant evidence of psi effect (p < 0.05)`,
      'marginally_significant': `Suggestive evidence of psi effect (p < 0.10)`,
      'not_significant': diff > 0
        ? `No significant deviation from chance (p ≥ 0.10)`
        : `Score below baseline - no psi effect detected`
    };

    return {
      summary: `Score is ${Math.abs(diff).toFixed(1)}% ${direction} baseline (${baseline}%)`,
      statistical: interpretations[significance],
      confidence: this.getConfidenceLevel(pValue)
    };
  }

  /**
   * Get confidence level percentage
   */
  getConfidenceLevel(pValue) {
    const confidence = (1 - pValue) * 100;
    return parseFloat(confidence.toFixed(2));
  }

  /**
   * Calculate user performance statistics across all experiments
   */
  async calculateUserPerformance(userId) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Get all revealed commitments with scores
      const commitments = await prisma.commitment.findMany({
        where: {
          userId,
          revealed: true,
          aiScore: { not: null }
        },
        orderBy: { revealTimestamp: 'desc' }
      });

      if (commitments.length === 0) {
        return {
          totalExperiments: 0,
          message: 'No analyzed experiments yet'
        };
      }

      const scores = commitments.map(c => c.aiScore);
      const types = commitments.map(c => c.experimentType);

      // Overall statistics
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const baseline = 50; // Default baseline
      const stdDev = this.calculateStdDev(scores);

      // Success rate (scores > 60 considered "hits")
      const hitThreshold = 60;
      const hits = scores.filter(s => s >= hitThreshold).length;
      const hitRate = (hits / scores.length) * 100;

      // Trend analysis (improving over time?)
      const recentScores = scores.slice(0, Math.min(5, scores.length));
      const olderScores = scores.slice(5);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.length > 0
        ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
        : recentAvg;
      const trendDirection = recentAvg > olderAvg ? 'improving' :
                            recentAvg < olderAvg ? 'declining' : 'stable';

      // Z-score for overall performance
      const overallZScore = (avgScore - baseline) / (stdDev / Math.sqrt(scores.length));
      const overallPValue = this.calculatePValue(overallZScore);

      // Performance by experiment type
      const byType = this.analyzeByType(commitments);

      await prisma.$disconnect();

      return {
        totalExperiments: scores.length,
        averageScore: parseFloat(avgScore.toFixed(2)),
        baseline,
        stdDev: parseFloat(stdDev.toFixed(2)),
        hitRate: parseFloat(hitRate.toFixed(2)),
        hitThreshold,
        trend: {
          direction: trendDirection,
          recentAvg: parseFloat(recentAvg.toFixed(2)),
          change: parseFloat((recentAvg - olderAvg).toFixed(2))
        },
        overall: {
          zScore: parseFloat(overallZScore.toFixed(3)),
          pValue: parseFloat(overallPValue.toFixed(4)),
          significance: this.determineSignificance(overallPValue),
          interpretation: this.interpretResult(avgScore, baseline, overallPValue, this.determineSignificance(overallPValue))
        },
        byType,
        scoreDistribution: this.calculateDistribution(scores)
      };
    } catch (error) {
      console.error('Performance calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Analyze performance by experiment type
   */
  analyzeByType(commitments) {
    const typeMap = {};

    commitments.forEach(c => {
      const type = c.experimentType || 'unknown';
      if (!typeMap[type]) {
        typeMap[type] = {
          count: 0,
          scores: [],
          avgScore: 0
        };
      }
      typeMap[type].count++;
      typeMap[type].scores.push(c.aiScore);
    });

    // Calculate averages and rankings
    Object.keys(typeMap).forEach(type => {
      const scores = typeMap[type].scores;
      typeMap[type].avgScore = parseFloat(
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      );
    });

    // Rank by average score
    const ranked = Object.entries(typeMap)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return ranked;
  }

  /**
   * Calculate score distribution
   */
  calculateDistribution(scores) {
    const ranges = {
      'exceptional': { min: 90, max: 100, count: 0 },
      'excellent': { min: 75, max: 89, count: 0 },
      'good': { min: 60, max: 74, count: 0 },
      'fair': { min: 40, max: 59, count: 0 },
      'poor': { min: 0, max: 39, count: 0 }
    };

    scores.forEach(score => {
      if (score >= 90) ranges.exceptional.count++;
      else if (score >= 75) ranges.excellent.count++;
      else if (score >= 60) ranges.good.count++;
      else if (score >= 40) ranges.fair.count++;
      else ranges.poor.count++;
    });

    return ranges;
  }

  /**
   * Compute statistics for embedding-based similarity scores
   * @param {number[]} similarities - Array of cosine similarity values
   * @param {number} baselineMean - Expected mean for random pairs (default 0.22)
   * @param {number} baselineStd - Expected std for random pairs (default 0.06)
   * @returns {{ zScore, pValue, significance, baselineMean, observedMean, effectSize, scoringMethod }}
   */
  computeEmbeddingStats(similarities, baselineMean = 0.22, baselineStd = 0.06) {
    if (!similarities || similarities.length === 0) {
      return { zScore: 0, pValue: 1, significance: 'not_significant', scoringMethod: 'embedding' };
    }

    const n = similarities.length;
    const observedMean = similarities.reduce((a, b) => a + b, 0) / n;
    const se = baselineStd / Math.sqrt(n);
    const zScore = se > 0 ? (observedMean - baselineMean) / se : 0;
    const pValue = zScore > 0 ? this.calculatePValue(zScore) : 1.0;
    const effectSize = baselineStd > 0 ? (observedMean - baselineMean) / baselineStd : 0;

    return {
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(6)),
      significance: this.determineSignificance(pValue),
      baselineMean,
      observedMean: parseFloat(observedMean.toFixed(4)),
      effectSize: parseFloat(effectSize.toFixed(3)),
      n,
      scoringMethod: 'embedding',
    };
  }

  /**
   * Compute binomial proportion z-test statistics
   * @param {number} hits - Number of successes
   * @param {number} trials - Total number of trials
   * @param {number} baselineProb - Expected probability under null hypothesis
   * @returns {{ zScore, pValue, significance, observedRate, expectedRate, effectSize }}
   */
  computeBinomialStats(hits, trials, baselineProb) {
    if (trials <= 0) {
      return { zScore: 0, pValue: 1, significance: 'not_significant' };
    }

    const observedRate = hits / trials;
    const se = Math.sqrt(baselineProb * (1 - baselineProb) / trials);
    const zScore = se > 0 ? (observedRate - baselineProb) / se : 0;
    const pValue = zScore > 0 ? this.calculatePValue(zScore) : 1.0;
    const effectSize = se > 0 ? (observedRate - baselineProb) / se : 0;

    return {
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(6)),
      significance: this.determineSignificance(pValue),
      observedRate: parseFloat(observedRate.toFixed(4)),
      expectedRate: baselineProb,
      hits,
      trials,
      effectSize: parseFloat(effectSize.toFixed(3)),
    };
  }

  /**
   * Compute chi-square goodness-of-fit test
   * @param {number[]} observed - Observed frequencies
   * @param {number[]} expected - Expected frequencies
   * @returns {{ chiSquare, df, pValue, significance }}
   */
  computeChiSquareStats(observed, expected) {
    if (observed.length !== expected.length || observed.length === 0) {
      return { chiSquare: 0, df: 0, pValue: 1, significance: 'not_significant' };
    }

    const df = observed.length - 1;
    let chiSquare = 0;

    for (let i = 0; i < observed.length; i++) {
      if (expected[i] > 0) {
        const diff = observed[i] - expected[i];
        chiSquare += (diff * diff) / expected[i];
      }
    }

    // Approximate p-value from chi-square using Wilson-Hilferty transformation
    const pValue = this._chiSquarePValue(chiSquare, df);

    return {
      chiSquare: parseFloat(chiSquare.toFixed(3)),
      df,
      pValue: parseFloat(pValue.toFixed(6)),
      significance: this.determineSignificance(pValue),
    };
  }

  /**
   * Convenience method: get significance level string
   * @param {number} pValue
   * @returns {'highly_significant' | 'significant' | 'marginally_significant' | 'not_significant'}
   */
  significanceLevel(pValue) {
    return this.determineSignificance(pValue);
  }

  /**
   * Approximate chi-square p-value using Wilson-Hilferty normal approximation
   * @private
   */
  _chiSquarePValue(chiSquare, df) {
    if (df <= 0) return 1;
    // Wilson-Hilferty approximation
    const z = Math.pow(chiSquare / df, 1 / 3) - (1 - 2 / (9 * df));
    const denom = Math.sqrt(2 / (9 * df));
    const zNorm = z / denom;
    return zNorm > 0 ? this.calculatePValue(zNorm) : 1.0;
  }

  /**
   * Calculate statistical power (ability to detect real effects)
   */
  calculatePower(sampleSize, effectSize, alpha = 0.05) {
    // Simplified power calculation
    // For a more accurate calculation, would need non-central t-distribution
    const ncp = effectSize * Math.sqrt(sampleSize); // Non-centrality parameter

    // Approximation: power increases with sample size and effect size
    const power = 1 - Math.exp(-Math.pow(ncp, 2) / 2);

    return {
      power: parseFloat(power.toFixed(3)),
      adequate: power >= 0.80, // 80% power is standard
      sampleSize,
      effectSize,
      alpha,
      interpretation: power >= 0.80
        ? 'Sufficient statistical power to detect effects'
        : `Low power (${(power * 100).toFixed(0)}%) - consider more experiments`
    };
  }
}

module.exports = new StatisticsService();
