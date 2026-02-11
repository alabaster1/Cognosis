/**
 * Bot Player Service - AI-vs-AI Control Group
 * Runs automated trials to establish pure randomness baselines.
 * These baseline distributions enable statistical comparison with human performance.
 */

const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

class BotPlayerService {
  constructor() {
    this.botUserId = 'bot-control-group';
    this.isRunning = false;
    this.totalTrials = 0;
    this.results = {
      cardPrediction: [],
      telepathy: [],
      precogExplorer: [],
      imageSimilarity: [],
    };
  }

  /**
   * Run a batch of bot-vs-bot trials for a specific experiment type
   * @param {string} experimentType - Type of experiment to simulate
   * @param {number} numTrials - Number of trials to run
   * @returns {Object} Aggregate statistics from the batch
   */
  async runBatch(experimentType, numTrials = 100) {
    console.log(`[BotPlayer] Running ${numTrials} ${experimentType} trials...`);
    this.isRunning = true;

    const batchResults = [];
    const startTime = Date.now();

    for (let i = 0; i < numTrials; i++) {
      try {
        let result;
        switch (experimentType) {
          case 'card-prediction':
            result = await this._runCardTrial();
            break;
          case 'telepathy-ghost':
            result = await this._runTelepathyTrial();
            break;
          case 'precog-explorer':
            result = await this._runPrecogTrial();
            break;
          case 'image-similarity':
            result = await this._runImageSimilarityTrial();
            break;
          default:
            result = await this._runCardTrial();
        }
        batchResults.push(result);
        this.totalTrials++;
      } catch (error) {
        console.error(`[BotPlayer] Trial ${i} failed:`, error.message);
      }
    }

    this.isRunning = false;
    const duration = Date.now() - startTime;

    // Calculate statistics
    const stats = this._calculateBatchStats(batchResults, experimentType);

    // Store baseline results
    if (this.results[experimentType]) {
      this.results[experimentType].push(...batchResults);
    }

    console.log(`[BotPlayer] Batch complete: ${batchResults.length}/${numTrials} trials in ${duration}ms`);
    return {
      experimentType,
      trialsRequested: numTrials,
      trialsCompleted: batchResults.length,
      durationMs: duration,
      stats,
      baselineDistribution: this._getDistribution(batchResults),
    };
  }

  /**
   * Run a single card prediction trial (bot randomly guesses)
   */
  async _runCardTrial() {
    const suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
    const target = suits[crypto.randomInt(0, 4)];
    const guess = suits[crypto.randomInt(0, 4)];

    return {
      type: 'card-prediction',
      target,
      guess,
      hit: target === guess,
      score: target === guess ? 1.0 : 0.0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run a simulated telepathy trial (bot randomly selects from 4 images)
   */
  async _runTelepathyTrial() {
    const targetIndex = 0; // Target is always index 0
    const botChoice = crypto.randomInt(0, 4); // Random 4-way selection

    return {
      type: 'telepathy-ghost',
      targetIndex,
      botChoice,
      hit: botChoice === targetIndex,
      score: botChoice === targetIndex ? 1.0 : 0.0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run a simulated precog explorer trial (4-sector selection)
   */
  async _runPrecogTrial() {
    const targetSector = crypto.randomInt(0, 4);
    const botChoice = crypto.randomInt(0, 4);

    return {
      type: 'precog-explorer',
      targetSector,
      botChoice,
      hit: botChoice === targetSector,
      score: botChoice === targetSector ? 1.0 : 0.0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run an image similarity trial using CLIP
   * Measures baseline similarity between random unrelated images
   */
  async _runImageSimilarityTrial() {
    try {
      // Generate two random images
      const resp1 = await axios.post(`${AI_SERVICE_URL}/generate/target`, { style: 'photorealistic' });
      const resp2 = await axios.post(`${AI_SERVICE_URL}/generate/target`, { style: 'photorealistic' });

      if (!resp1.data.image_url || !resp2.data.image_url) {
        return { type: 'image-similarity', score: 0, error: 'generation_failed' };
      }

      // Score similarity between unrelated images
      const scoreResp = await axios.post(`${AI_SERVICE_URL}/score/image-similarity`, {
        target_image_url: resp1.data.image_url,
        choice_image_url: resp2.data.image_url,
      });

      return {
        type: 'image-similarity',
        similarity: scoreResp.data.target_choice_similarity || 0,
        score: scoreResp.data.target_choice_similarity || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        type: 'image-similarity',
        score: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculate aggregate statistics from batch results
   */
  _calculateBatchStats(results, experimentType) {
    if (!results.length) return { mean: 0, std: 0, hitRate: 0 };

    const scores = results.map(r => r.score);
    const hits = results.filter(r => r.hit).length;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);
    const hitRate = hits / results.length;

    // Expected baselines
    const expectedBaselines = {
      'card-prediction': 0.25,
      'telepathy-ghost': 0.25,
      'precog-explorer': 0.25,
      'image-similarity': null, // Continuous, no fixed baseline
    };

    const baseline = expectedBaselines[experimentType] || 0.25;
    const zScore = baseline
      ? (hitRate - baseline) / Math.sqrt(baseline * (1 - baseline) / results.length)
      : 0;

    return {
      mean: parseFloat(mean.toFixed(4)),
      std: parseFloat(std.toFixed(4)),
      hitRate: parseFloat(hitRate.toFixed(4)),
      hits,
      total: results.length,
      baseline,
      zScore: parseFloat(zScore.toFixed(4)),
      significant: Math.abs(zScore) > 1.96,
    };
  }

  /**
   * Get distribution of scores for visualization
   */
  _getDistribution(results) {
    const bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const distribution = bins.slice(0, -1).map((binStart, i) => ({
      range: `${binStart.toFixed(1)}-${bins[i + 1].toFixed(1)}`,
      count: results.filter(r => r.score >= binStart && r.score < bins[i + 1]).length,
    }));
    return distribution;
  }

  /**
   * Get current bot player status and accumulated results
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalTrials: this.totalTrials,
      accumulatedResults: {
        cardPrediction: this.results.cardPrediction.length,
        telepathy: this.results['telepathy-ghost']?.length || 0,
        precogExplorer: this.results.precogExplorer.length,
        imageSimilarity: this.results.imageSimilarity.length,
      },
    };
  }

  /**
   * Get baseline statistics for a given experiment type
   * Used to compare human performance against pure randomness
   */
  getBaselineStats(experimentType) {
    const results = this.results[experimentType] || [];
    if (!results.length) {
      return { available: false, message: 'No baseline data available. Run bot trials first.' };
    }
    return {
      available: true,
      stats: this._calculateBatchStats(results, experimentType),
      sampleSize: results.length,
    };
  }
}

module.exports = new BotPlayerService();
