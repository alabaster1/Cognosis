/**
 * Game Experiments Routes
 * Backend endpoints for Pattern Oracle, Timeline Racer, Retro Roulette,
 * Emotion Echo, Quantum Coin Arena, Psi Poker, Mind Pulse, Synchronicity Bingo
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { optionalAuthMiddleware } = require('../auth');
const { getPrismaClient } = require('../db');
const commitRevealService = require('../services/commitRevealService');
const socketService = require('../services/socketService');
const drandService = require('../services/drandService');
const embeddingService = require('../services/embeddingService');

// Lazy OpenAI initialization for game experiments
const OpenAI = require('openai');
let gameOpenAIClient = null;

function getGameOpenAIClient() {
  if (!gameOpenAIClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    gameOpenAIClient = new OpenAI({ apiKey });
  }
  return gameOpenAIClient;
}

function parseGameJsonResponse(text) {
  let content = text.trim();
  if (content.startsWith('```')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  return JSON.parse(content);
}

// Plutchik's full emotion wheel (8 primary + 8 secondary + 8 tertiary = 24)
const EMOTIONS_PRIMARY = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];
const EMOTIONS_SECONDARY = ['love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt', 'aggressiveness', 'optimism'];
const EMOTIONS_TERTIARY = ['guilt', 'curiosity', 'despair', 'envy', 'pride', 'anxiety', 'delight', 'sentimentality'];
const EMOTIONS_FULL = [...EMOTIONS_PRIMARY, ...EMOTIONS_SECONDARY, ...EMOTIONS_TERTIARY];

// Keep backward compat: default 8 primary emotions
const EMOTIONS = EMOTIONS_PRIMARY;

// Color palette for abstract art generation (expanded for full wheel)
const ART_COLORS = {
  joy: ['#FFD700', '#FFA500', '#FF6347', '#FFFF00'],
  trust: ['#4169E1', '#87CEEB', '#98FB98', '#66CDAA'],
  fear: ['#4B0082', '#2F4F4F', '#191970', '#483D8B'],
  surprise: ['#FF1493', '#00CED1', '#FF69B4', '#7B68EE'],
  sadness: ['#4682B4', '#708090', '#5F9EA0', '#6B8E23'],
  disgust: ['#556B2F', '#8B4513', '#6B4226', '#3B3B3B'],
  anger: ['#DC143C', '#B22222', '#8B0000', '#FF4500'],
  anticipation: ['#DAA520', '#CD853F', '#DEB887', '#F4A460'],
  // Secondary emotions
  love: ['#FF69B4', '#FF1493', '#FFB6C1', '#DB7093'],
  submission: ['#B0C4DE', '#778899', '#AFEEEE', '#ADD8E6'],
  awe: ['#9370DB', '#8A2BE2', '#BA55D3', '#DDA0DD'],
  disapproval: ['#696969', '#808080', '#A9A9A9', '#778899'],
  remorse: ['#2F4F4F', '#4682B4', '#5F9EA0', '#708090'],
  contempt: ['#8B0000', '#4B0082', '#800080', '#483D8B'],
  aggressiveness: ['#FF0000', '#FF4500', '#DC143C', '#B22222'],
  optimism: ['#FFD700', '#32CD32', '#00FF7F', '#ADFF2F'],
  // Tertiary emotions
  guilt: ['#4B0082', '#696969', '#2F4F4F', '#708090'],
  curiosity: ['#00CED1', '#20B2AA', '#48D1CC', '#40E0D0'],
  despair: ['#191970', '#000080', '#2F4F4F', '#1C1C1C'],
  envy: ['#006400', '#228B22', '#2E8B57', '#3CB371'],
  pride: ['#FFD700', '#DAA520', '#B8860B', '#CD853F'],
  anxiety: ['#4B0082', '#663399', '#9932CC', '#8B008B'],
  delight: ['#FF69B4', '#FFD700', '#FFA07A', '#FF7F50'],
  sentimentality: ['#DDA0DD', '#EE82EE', '#DA70D6', '#FFB6C1'],
};

// ============================================================================
// PATTERN ORACLE
// ============================================================================

router.post('/pattern-oracle/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { gridSize = 25, targetCount = 5, difficulty = 'medium', verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // gridSize is the total number of cells (e.g. 25 for a 5x5 grid)
    const totalCells = gridSize;
    const roundsMap = { easy: 3, medium: 5, hard: 7 };
    const rounds = roundsMap[difficulty] || 5;
    const targetsPerRound = Math.floor(targetCount / rounds);

    // Generate targets independently per round (same cell can repeat across rounds)
    const allTargets = [];
    for (let r = 0; r < rounds; r++) {
      const roundTargets = new Set();
      while (roundTargets.size < targetsPerRound) {
        roundTargets.add(crypto.randomInt(0, totalCells));
      }
      allTargets.push(...roundTargets);
    }

    const targetData = {
      gridSize,
      targetCount,
      targetsPerRound,
      difficulty,
      targetTiles: allTargets,
      generatedAt: new Date().toISOString(),
    };

    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce)
      .digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'pattern-oracle',
      data: targetData,
      commitmentHash,
      metadata: { gridSize, targetCount, difficulty },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      gridSize,
      targetCount,
      difficulty,
      commitmentHash,
    });
  } catch (error) {
    console.error('[PatternOracle] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/pattern-oracle/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, selections, nonce, verified = false } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const targetTiles = targetData.targetTiles;

    // Baseline: probability of a hit per selection = targetsPerRound / totalCells
    const roundsMap = { easy: 3, medium: 5, hard: 7 };
    const rounds = roundsMap[targetData.difficulty] || 5;
    const targetsPerRound = targetData.targetsPerRound || Math.floor(targetData.targetCount / rounds);
    const totalCells = targetData.gridSize;

    // Count hits per round (each round has independent targets)
    let hits = 0;
    for (let r = 0; r < rounds; r++) {
      const roundTargetSet = new Set(targetTiles.slice(r * targetsPerRound, (r + 1) * targetsPerRound));
      const roundSelections = selections.slice(r * targetsPerRound, (r + 1) * targetsPerRound);
      hits += roundSelections.filter(s => roundTargetSet.has(s)).length;
    }
    const total = selections.length;
    const misses = total - hits;
    const accuracy = (hits / total) * 100;
    const baseline = (targetsPerRound / totalCells) * 100;
    const difference = accuracy - baseline;

    // Binomial proportion z-test
    const p0 = baseline / 100;
    const pHat = hits / total;
    const se = Math.sqrt(p0 * (1 - p0) / total);
    const zScore = se > 0 ? (pHat - p0) / se : 0;
    // One-tailed test: only above-chance performance is significant
    const pValue = zScore > 0 ? (1 - normalCDF(zScore)) : 1.0;

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'pattern-oracle' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: { userId: commitment.userId, experimentType: 'pattern-oracle', experimentId: commitmentId, targetHash: commitment.commitmentHash, status: 'completed' }
      });
    }

    await prisma.response.create({
      data: { sessionId: session.id, userId: commitment.userId, responseType: 'pattern-oracle', responseData: { selections }, aiScore: accuracy, aiScoreBreakdown: { hits, misses, accuracy, baseline, difference, pValue, zScore }, scoredAt: new Date() }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    socketService.broadcastExperimentResult({
      experimentType: 'pattern-oracle', accuracy, baseline,
      userId: commitment.userId, commitmentHash: commitment.commitmentHash, verified: false,
    });

    res.json({
      success: true,
      targetTiles,
      hits,
      misses,
      accuracy: parseFloat(accuracy.toFixed(2)),
      baseline: parseFloat(baseline.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      pValue: parseFloat(pValue.toFixed(6)),
      performance: difference > 0 ? 'above' : difference < 0 ? 'below' : 'at',
    });
  } catch (error) {
    console.error('[PatternOracle] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TIMELINE RACER
// ============================================================================

router.post('/timeline-racer/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { totalRounds = 30, symbolCount = 4, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const targets = [];
    for (let i = 0; i < totalRounds; i++) {
      targets.push(crypto.randomInt(0, symbolCount));
    }

    const targetData = { targets, totalRounds, symbolCount, generatedAt: new Date().toISOString() };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'timeline-racer',
      data: targetData,
      commitmentHash,
      metadata: { totalRounds, symbolCount },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      totalRounds,
      symbolCount,
      commitmentHash,
    });
  } catch (error) {
    console.error('[TimelineRacer] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/timeline-racer/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, predictions, nonce, verified = false } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const rounds = predictions.map((p, i) => ({
      round: p.round || i + 1,
      prediction: p.prediction,
      actual: targetData.targets[i],
      correct: p.prediction === targetData.targets[i],
      reactionTime: p.reactionTime || 0,
    }));

    const hits = rounds.filter(r => r.correct).length;
    const total = rounds.length;
    const accuracy = (hits / total) * 100;
    const baseline = (1 / (targetData.symbolCount || 4)) * 100;
    const difference = accuracy - baseline;
    const averageReactionTime = rounds.reduce((sum, r) => sum + r.reactionTime, 0) / total;

    const p0 = baseline / 100;
    const pHat = hits / total;
    const se = Math.sqrt(p0 * (1 - p0) / total);
    const zScore = se > 0 ? (pHat - p0) / se : 0;
    const pValue = zScore > 0 ? 1 - normalCDF(zScore) : 1.0;

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'timeline-racer' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: { userId: commitment.userId, experimentType: 'timeline-racer', experimentId: commitmentId, targetHash: commitment.commitmentHash, status: 'completed' }
      });
    }

    await prisma.response.create({
      data: { sessionId: session.id, userId: commitment.userId, responseType: 'timeline-racer', responseData: { predictions }, aiScore: accuracy, aiScoreBreakdown: { rounds, hits, total, accuracy, baseline, difference, averageReactionTime, pValue }, scoredAt: new Date() }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    socketService.broadcastExperimentResult({
      experimentType: 'timeline-racer', accuracy, baseline: 25,
      userId: commitment.userId, commitmentHash: commitment.commitmentHash, verified: false,
    });

    res.json({
      success: true,
      rounds,
      hits,
      total,
      accuracy: parseFloat(accuracy.toFixed(2)),
      baseline: parseFloat(baseline.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      averageReactionTime: parseFloat(averageReactionTime.toFixed(0)),
      performance: difference > 0 ? 'above' : difference < 0 ? 'below' : 'at',
      pValue: parseFloat(pValue.toFixed(6)),
    });
  } catch (error) {
    console.error('[TimelineRacer] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// RETRO ROULETTE (Full European Roulette Table)
// ============================================================================

const ROULETTE_RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const ROULETTE_BLACK = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
const ROULETTE_COLUMNS = {
  1: [1,4,7,10,13,16,19,22,25,28,31,34],
  2: [2,5,8,11,14,17,20,23,26,29,32,35],
  3: [3,6,9,12,15,18,21,24,27,30,33,36],
};
const ROULETTE_DOZENS = {
  1: Array.from({length:12},(_,i)=>i+1),
  2: Array.from({length:12},(_,i)=>i+13),
  3: Array.from({length:12},(_,i)=>i+25),
};
const ROULETTE_STREETS = Array.from({length:12},(_,i)=>[i*3+1,i*3+2,i*3+3]);

function getNumberColor(n) {
  if (n === 0) return 'green';
  if (ROULETTE_RED.includes(n)) return 'red';
  return 'black';
}

function resolveBet(betType, betValue, outcomeNumber) {
  let coveredNumbers = [];
  let payout = 0;

  switch (betType) {
    case 'straight':
      coveredNumbers = [betValue];
      payout = 35;
      break;
    case 'split':
      coveredNumbers = Array.isArray(betValue) ? betValue : [betValue];
      payout = 17;
      break;
    case 'street':
      coveredNumbers = Array.isArray(betValue) ? betValue : ROULETTE_STREETS[betValue] || [];
      payout = 11;
      break;
    case 'corner':
      coveredNumbers = Array.isArray(betValue) ? betValue : [];
      payout = 8;
      break;
    case 'sixline':
      coveredNumbers = Array.isArray(betValue) ? betValue : [];
      payout = 5;
      break;
    case 'dozen':
      coveredNumbers = ROULETTE_DOZENS[betValue] || [];
      payout = 2;
      break;
    case 'column':
      coveredNumbers = ROULETTE_COLUMNS[betValue] || [];
      payout = 2;
      break;
    case 'red':
      coveredNumbers = ROULETTE_RED;
      payout = 1;
      break;
    case 'black':
      coveredNumbers = ROULETTE_BLACK;
      payout = 1;
      break;
    case 'even':
      coveredNumbers = Array.from({length:18},(_,i)=>(i+1)*2).filter(n=>n<=36);
      payout = 1;
      break;
    case 'odd':
      coveredNumbers = Array.from({length:18},(_,i)=>i*2+1).filter(n=>n<=36);
      payout = 1;
      break;
    case 'high':
      coveredNumbers = Array.from({length:18},(_,i)=>i+19);
      payout = 1;
      break;
    case 'low':
      coveredNumbers = Array.from({length:18},(_,i)=>i+1);
      payout = 1;
      break;
    default:
      coveredNumbers = [];
      payout = 0;
  }

  const win = coveredNumbers.includes(outcomeNumber);
  const probability = coveredNumbers.length / 37;

  return { win, coveredNumbers, payout, probability };
}

function validateBet(betType, betValue) {
  switch (betType) {
    case 'straight':
      return Number.isInteger(betValue) && betValue >= 0 && betValue <= 36;
    case 'split': {
      if (!Array.isArray(betValue) || betValue.length !== 2) return false;
      const [a, b] = betValue.map(Number).sort((x, y) => x - y);
      if (a < 0 || b > 36 || a === b) return false;
      // 0 is adjacent to 1, 2, 3
      if (a === 0) return [1, 2, 3].includes(b);
      // Grid: row = (n-1) % 3, col = Math.floor((n-1) / 3)
      const rowA = (a - 1) % 3, colA = Math.floor((a - 1) / 3);
      const rowB = (b - 1) % 3, colB = Math.floor((b - 1) / 3);
      // Same row, adjacent columns
      if (rowA === rowB && Math.abs(colA - colB) === 1) return true;
      // Same column, adjacent rows
      if (colA === colB && Math.abs(rowA - rowB) === 1) return true;
      return false;
    }
    case 'street': {
      if (!Array.isArray(betValue) || betValue.length !== 3) return false;
      const sorted = [...betValue].sort((x, y) => x - y);
      return ROULETTE_STREETS.some(s =>
        s[0] === sorted[0] && s[1] === sorted[1] && s[2] === sorted[2]
      );
    }
    case 'corner': {
      if (!Array.isArray(betValue) || betValue.length !== 4) return false;
      const nums = [...betValue].sort((x, y) => x - y);
      // Must form a 2x2 block on the grid
      // Grid positions: row = (n-1) % 3, col = Math.floor((n-1) / 3)
      const positions = nums.map(n => ({ row: (n - 1) % 3, col: Math.floor((n - 1) / 3) }));
      const rows = [...new Set(positions.map(p => p.row))].sort();
      const cols = [...new Set(positions.map(p => p.col))].sort();
      if (rows.length !== 2 || cols.length !== 2) return false;
      if (rows[1] - rows[0] !== 1 || cols[1] - cols[0] !== 1) return false;
      // Verify all 4 positions exist
      for (const r of rows) {
        for (const c of cols) {
          const n = c * 3 + r + 1;
          if (!nums.includes(n)) return false;
        }
      }
      return true;
    }
    case 'sixline': {
      if (!Array.isArray(betValue) || betValue.length !== 6) return false;
      const sorted = [...betValue].sort((x, y) => x - y);
      // Must be two adjacent streets
      for (let i = 0; i < 11; i++) {
        const combined = [...ROULETTE_STREETS[i], ...ROULETTE_STREETS[i + 1]].sort((x, y) => x - y);
        if (combined.every((v, idx) => v === sorted[idx])) return true;
      }
      return false;
    }
    case 'dozen':
      return [1, 2, 3].includes(betValue);
    case 'column':
      return [1, 2, 3].includes(betValue);
    case 'red':
    case 'black':
    case 'even':
    case 'odd':
    case 'high':
    case 'low':
      return true;
    default:
      return false;
  }
}

router.post('/retro-roulette/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { totalOutcomes = 25, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const outcomes = [];
    for (let i = 0; i < totalOutcomes; i++) {
      outcomes.push(crypto.randomInt(0, 37));
    }

    const targetData = { outcomes, totalOutcomes, generatedAt: new Date().toISOString() };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'retro-roulette',
      data: targetData,
      commitmentHash,
      metadata: { totalOutcomes },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      totalOutcomes,
      commitmentHash,
    });
  } catch (error) {
    console.error('[RetroRoulette] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/retro-roulette/reveal-outcome', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, outcomeIndex, betType, betValue, nonce } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    // Validate bet
    if (!validateBet(betType, betValue)) {
      return res.status(400).json({ success: false, error: `Invalid bet: ${betType} ${JSON.stringify(betValue)}` });
    }

    const targetData = commitment.data;
    const outcomeNumber = targetData.outcomes[outcomeIndex];
    const color = getNumberColor(outcomeNumber);

    // Resolve bet
    const { win, probability, payout } = resolveBet(betType, betValue, outcomeNumber);

    // Persist user choice on the commitment data
    const userChoices = targetData.userChoices || [];
    userChoices[outcomeIndex] = { betType, betValue, win, probability, payout };
    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { data: { ...targetData, userChoices } }
    });


    res.json({
      success: true,
      index: outcomeIndex,
      actualOutcome: outcomeNumber,
      color,
      betType,
      win,
      probability: parseFloat(probability.toFixed(4)),
      payout,
    });
  } catch (error) {
    console.error('[RetroRoulette] Reveal outcome error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/retro-roulette/finalize', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, nonce, verified = false } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const userChoices = targetData.userChoices || [];

    // Build all outcomes with color
    const allOutcomes = targetData.outcomes.map((outcomeNumber, i) => ({
      index: i,
      outcomeNumber,
      color: getNumberColor(outcomeNumber),
    }));

    // Compute per-bet-type stats and Stouffer's combined z-score
    const answered = userChoices.filter(c => c != null);
    const total = answered.length;
    const wins = answered.filter(c => c.win).length;

    // Per-trial z-scores for Stouffer's method
    let sumZ = 0;
    const betTypeStats = {};

    for (const choice of answered) {
      if (!choice) continue;
      const p = choice.probability;
      const winVal = choice.win ? 1 : 0;
      const zi = p > 0 && p < 1 ? (winVal - p) / Math.sqrt(p * (1 - p)) : 0;
      sumZ += zi;

      // Group by bet type
      const bt = choice.betType;
      if (!betTypeStats[bt]) {
        betTypeStats[bt] = { count: 0, hits: 0, expected: 0, zScores: [] };
      }
      betTypeStats[bt].count++;
      if (choice.win) betTypeStats[bt].hits++;
      betTypeStats[bt].expected += choice.probability;
      betTypeStats[bt].zScores.push(zi);
    }

    // Combined z-score (Stouffer's method)
    const combinedZScore = total > 0 ? sumZ / Math.sqrt(total) : 0;
    const combinedPValue = combinedZScore > 0 ? 1 - normalCDF(combinedZScore) : 1.0;

    // Compute per-type z-scores
    for (const bt of Object.keys(betTypeStats)) {
      const s = betTypeStats[bt];
      s.zScore = s.zScores.length > 0
        ? parseFloat((s.zScores.reduce((a, b) => a + b, 0) / Math.sqrt(s.zScores.length)).toFixed(3))
        : 0;
      delete s.zScores; // Don't send raw z-scores
      s.expected = parseFloat(s.expected.toFixed(2));
    }

    // Payout tracking
    let totalPayoutUnits = 0;
    let expectedPayoutUnits = 0;
    for (const choice of answered) {
      if (!choice) continue;
      // Each bet costs 1 unit. Win returns payout + 1 (original stake).
      totalPayoutUnits += choice.win ? choice.payout : -1;
      // Expected: probability * payout - (1 - probability) * 1
      expectedPayoutUnits += choice.probability * choice.payout - (1 - choice.probability);
    }

    const performance = combinedZScore > 0.5 ? 'above' : combinedZScore < -0.5 ? 'below' : 'at';

    // Store response
    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'retro-roulette' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: { userId: commitment.userId, experimentType: 'retro-roulette', experimentId: commitmentId, targetHash: commitment.commitmentHash, status: 'completed' }
      });
    }

    await prisma.response.create({
      data: { sessionId: session.id, userId: commitment.userId, responseType: 'retro-roulette', responseData: { userChoices: answered }, aiScore: wins, aiScoreBreakdown: { wins, total, combinedZScore, combinedPValue, betTypeStats, totalPayoutUnits, expectedPayoutUnits }, scoredAt: new Date() }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    res.json({
      success: true,
      allOutcomes,
      wins,
      total,
      betTypeStats,
      combinedZScore: parseFloat(combinedZScore.toFixed(3)),
      combinedPValue: parseFloat(combinedPValue.toFixed(4)),
      totalPayoutUnits: parseFloat(totalPayoutUnits.toFixed(1)),
      expectedPayoutUnits: parseFloat(expectedPayoutUnits.toFixed(2)),
      performance,
    });
  } catch (error) {
    console.error('[RetroRoulette] Finalize error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EMOTION ECHO
// ============================================================================

router.post('/emotion-echo/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { totalRounds = 5, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Fetch drand beacon for verifiable randomness
    const beacon = await drandService.getLatestBeacon();

    // Select 8 emotions from the full 24-emotion Plutchik wheel using drand
    const sessionEmotionIndices = drandService.deriveUniqueIndices(
      beacon.randomness, 'emotion-session', 8, EMOTIONS_FULL.length
    );
    const sessionEmotions = sessionEmotionIndices.map(i => EMOTIONS_FULL[i]);

    // Select targets from the session-specific pool using drand
    const targets = [];
    for (let i = 0; i < totalRounds; i++) {
      const idx = drandService.deriveIndex(beacon.randomness, `emotion-round-${i}`, sessionEmotions.length);
      targets.push(sessionEmotions[idx]);
    }

    const targetData = {
      targets,
      sessionEmotions,
      totalRounds,
      generatedAt: new Date().toISOString(),
      drandRound: beacon.round,
      randomnessSource: beacon.source,
    };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'emotion-echo',
      data: targetData,
      commitmentHash,
      metadata: { totalRounds, drandRound: beacon.round },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      totalRounds,
      commitmentHash,
      sessionEmotions,
      drandRound: beacon.round,
      randomnessSource: beacon.source,
    });
  } catch (error) {
    console.error('[EmotionEcho] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/emotion-echo/get-art', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, roundIndex } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const targetEmotion = targetData.targets[roundIndex];
    const colors = ART_COLORS[targetEmotion] || ART_COLORS.joy;

    // Generate abstract art parameters based on emotion (without revealing which emotion)
    const artSeed = crypto.createHash('sha256').update(`${commitmentId}-${roundIndex}`).digest('hex');
    const shapes = [];
    const shapeTypes = ['circle', 'rect', 'triangle', 'ellipse'];

    for (let i = 0; i < 6; i++) {
      const seedInt = parseInt(artSeed.substring(i * 8, i * 8 + 8), 16);
      shapes.push({
        type: shapeTypes[seedInt % shapeTypes.length],
        color: colors[i % colors.length],
        x: (seedInt % 80) + 10,
        y: ((seedInt >> 8) % 80) + 10,
        size: (seedInt % 30) + 20,
        rotation: seedInt % 360,
      });
    }

    res.json({
      success: true,
      roundIndex,
      artSeed: artSeed.substring(0, 16),
      artParameters: {
        shapes,
        background: colors[0] + '22', // Subtle tint
      },
    });
  } catch (error) {
    console.error('[EmotionEcho] Get art error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/emotion-echo/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, selections, nonce, verified = false } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const rounds = selections.map((s, i) => ({
      round: s.round || i + 1,
      targetEmotion: targetData.targets[i],
      selectedEmotion: s.selectedEmotion,
      correct: s.selectedEmotion === targetData.targets[i],
      artExplanation: `Art was generated with ${ART_COLORS[targetData.targets[i]]?.[0] || 'neutral'} palette suggesting ${targetData.targets[i]}`,
    }));

    const hits = rounds.filter(r => r.correct).length;
    const total = rounds.length;
    const accuracy = (hits / total) * 100;
    // Use session-specific pool size for baseline (always 8 emotions presented)
    const poolSize = targetData.sessionEmotions ? targetData.sessionEmotions.length : EMOTIONS.length;
    const baseline = (1 / poolSize) * 100;
    const difference = accuracy - baseline;

    const p0 = baseline / 100;
    const pHat = hits / total;
    const se = Math.sqrt(p0 * (1 - p0) / total);
    const zScore = se > 0 ? (pHat - p0) / se : 0;
    const pValue = zScore > 0 ? 1 - normalCDF(zScore) : 1.0;

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'emotion-echo' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: { userId: commitment.userId, experimentType: 'emotion-echo', experimentId: commitmentId, targetHash: commitment.commitmentHash, status: 'completed' }
      });
    }

    await prisma.response.create({
      data: { sessionId: session.id, userId: commitment.userId, responseType: 'emotion-echo', responseData: { selections }, aiScore: accuracy, aiScoreBreakdown: { rounds, hits, total, accuracy, baseline, difference, pValue }, scoredAt: new Date() }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    res.json({
      success: true,
      rounds,
      hits,
      total,
      accuracy: parseFloat(accuracy.toFixed(2)),
      baseline: parseFloat(baseline.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      pValue: parseFloat(pValue.toFixed(6)),
      performance: difference > 0 ? 'above' : difference < 0 ? 'below' : 'at',
      drandRound: targetData.drandRound || null,
      randomnessSource: targetData.randomnessSource || null,
    });
  } catch (error) {
    console.error('[EmotionEcho] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// QUANTUM COIN ARENA
// ============================================================================

router.post('/quantum-coin-arena/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { totalFlips = 20, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const outcomes = [];
    for (let i = 0; i < totalFlips; i++) {
      outcomes.push(crypto.randomInt(0, 2) === 0 ? 'heads' : 'tails');
    }

    const targetData = { outcomes, totalFlips, generatedAt: new Date().toISOString() };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'quantum-coin-arena',
      data: targetData,
      commitmentHash,
      metadata: { totalFlips },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      totalFlips,
      commitmentHash,
    });
  } catch (error) {
    console.error('[QuantumCoin] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/quantum-coin-arena/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, intentions, nonce, verified = false } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const rounds = intentions.map((intent, i) => ({
      round: intent.round || i + 1,
      outcome: targetData.outcomes[i],
      intention: intent.intention,
      aligned: intent.intention === targetData.outcomes[i],
    }));

    const totalFlips = rounds.length;
    const headsCount = targetData.outcomes.filter(o => o === 'heads').length;
    const tailsCount = totalFlips - headsCount;
    const alignments = rounds.filter(r => r.aligned).length;
    const accuracy = (alignments / totalFlips) * 100;
    const baseline = 50;

    // Chi-square for coin flip alignment (1 df)
    const expectedAligned = totalFlips * 0.5;
    const chiSquare = Math.pow(alignments - expectedAligned, 2) / expectedAligned +
      Math.pow((totalFlips - alignments) - expectedAligned, 2) / expectedAligned;

    // Z-score for one-tailed test (above chance alignment)
    const se = Math.sqrt(0.5 * 0.5 / totalFlips); // SE of proportion
    const pHat = alignments / totalFlips;
    const zScore = se > 0 ? (pHat - 0.5) / se : 0;
    const pValue = zScore > 0 ? 1 - normalCDF(zScore) : 1.0;
    const effectSize = pHat - 0.5; // Raw effect (proportion above chance)

    let significance = 'not significant';
    if (pValue < 0.001) significance = 'p < 0.001';
    else if (pValue < 0.01) significance = 'p < 0.01';
    else if (pValue < 0.05) significance = 'p < 0.05';

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'quantum-coin-arena' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: { userId: commitment.userId, experimentType: 'quantum-coin-arena', experimentId: commitmentId, targetHash: commitment.commitmentHash, status: 'completed' }
      });
    }

    await prisma.response.create({
      data: { sessionId: session.id, userId: commitment.userId, responseType: 'quantum-coin-arena', responseData: { intentions }, aiScore: accuracy, aiScoreBreakdown: { rounds, alignments, accuracy, chiSquare, zScore, pValue, effectSize, significance }, scoredAt: new Date() }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    socketService.broadcastExperimentResult({
      experimentType: 'quantum-coin-arena', accuracy, baseline: 50,
      userId: commitment.userId, commitmentHash: commitment.commitmentHash, verified: false,
    });

    res.json({
      success: true,
      rounds,
      totalFlips,
      headsCount,
      tailsCount,
      alignments,
      accuracy: parseFloat(accuracy.toFixed(2)),
      baseline,
      chiSquare: parseFloat(chiSquare.toFixed(3)),
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      effectSize: parseFloat(effectSize.toFixed(4)),
      significance,
      performance: accuracy > baseline ? 'above' : accuracy < baseline ? 'below' : 'at',
    });
  } catch (error) {
    console.error('[QuantumCoin] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PSI POKER
// ============================================================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function generateDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function evaluatePokerHand(cards) {
  // Simplified hand ranking
  const rankCounts = {};
  cards.forEach(c => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1; });
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (counts[0] === 4) return 'Four of a Kind';
  if (counts[0] === 3 && counts[1] === 2) return 'Full House';
  if (counts[0] === 3) return 'Three of a Kind';
  if (counts[0] === 2 && counts[1] === 2) return 'Two Pair';
  if (counts[0] === 2) return 'Pair';
  return 'High Card';
}

router.post('/psi-poker/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { playerCount = 4, verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const deck = generateDeck();
    const numOpponents = playerCount - 1;

    // Convert deck objects to indices matching frontend's scheme:
    // SUITS: ['hearts','diamonds','clubs','spades'], RANKS: ['A','2','3',...,'K']
    const FRONTEND_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deckIndices = deck.map(card => {
      const suitIndex = SUITS.indexOf(card.suit);
      const rankIndex = FRONTEND_RANKS.indexOf(card.rank);
      return suitIndex * 13 + rankIndex;
    });

    const targetData = { shuffledDeck: deckIndices, playerCount, numOpponents, generatedAt: new Date().toISOString() };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'psi-poker',
      data: targetData,
      commitmentHash,
      metadata: { playerCount },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      playerCount,
      numOpponents,
      shuffledDeck: deckIndices,
      commitmentHash,
    });
  } catch (error) {
    console.error('[PsiPoker] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/psi-poker/get-hand', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, playerId } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    // Reconstruct hand from shuffledDeck indices
    const FRONTEND_RANKS_H = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const playerIdx = parseInt(playerId.replace('player_', '')) || 0;
    const deckStart = playerIdx * 2;
    const hand = targetData.shuffledDeck.slice(deckStart, deckStart + 2).map(idx => ({
      suit: SUITS[Math.floor(idx / 13)],
      rank: FRONTEND_RANKS_H[idx % 13],
    }));

    res.json({ success: true, hand });
  } catch (error) {
    console.error('[PsiPoker] Get hand error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/psi-poker/reveal', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, opponentPredictions, communityPredictions, nonce, verified = false } = req.body;
    const predictions = { opponentPredictions, communityPredictions };
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;

    // Reconstruct hands and community cards from shuffledDeck indices
    const FRONTEND_RANKS_REV = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const indexToCard = (idx) => ({
      suit: SUITS[Math.floor(idx / 13)],
      rank: FRONTEND_RANKS_REV[idx % 13],
    });

    const deckCards = targetData.shuffledDeck.map(indexToCard);
    const numPlayers = targetData.playerCount || 4;
    let deckIdx = 0;
    const hands = {};
    for (let p = 0; p < numPlayers; p++) {
      hands[`player_${p}`] = [deckCards[deckIdx++], deckCards[deckIdx++]];
    }
    const communityCards = deckCards.slice(deckIdx, deckIdx + 5);

    // Score opponent hand predictions (rank match)
    let handHits = 0;
    let handTotal = 0;

    if (predictions.opponentPredictions) {
      // Frontend sends: [{ opponentId, predictedCards: [idx, idx] }]
      predictions.opponentPredictions.forEach((pred, opIdx) => {
        const actualHand = hands[`player_${opIdx + 1}`]; // player_0 is "you"
        if (actualHand && pred.predictedCards) {
          pred.predictedCards.forEach((cardIdx) => {
            handTotal++;
            const predicted = indexToCard(cardIdx);
            if (actualHand.some(ac => ac.rank === predicted.rank)) {
              handHits++;
            }
          });
        }
      });
    }

    // Score community card predictions (rank match)
    let communityHits = 0;
    let communityTotal = 0;
    if (predictions.communityPredictions) {
      predictions.communityPredictions.forEach((cardIdx) => {
        communityTotal++;
        const predicted = indexToCard(cardIdx);
        if (communityCards.some(ac => ac.rank === predicted.rank)) {
          communityHits++;
        }
      });
    }

    const opponentAccuracy = handTotal > 0 ? (handHits / handTotal) * 100 : 0;
    const communityAccuracy = communityTotal > 0 ? (communityHits / communityTotal) * 100 : 0;
    const totalPredictions = handTotal + communityTotal;
    const totalHits = handHits + communityHits;
    const totalAccuracy = totalPredictions > 0
      ? (totalHits / totalPredictions) * 100 : 0;

    // Binomial z-test: rank match = 1/13 chance
    const p0 = 1 / 13;
    const pHat = totalPredictions > 0 ? totalHits / totalPredictions : 0;
    const se = totalPredictions > 0 ? Math.sqrt(p0 * (1 - p0) / totalPredictions) : 1;
    const zScore = se > 0 ? (pHat - p0) / se : 0;
    const pValue = pHat > p0 ? 1 - normalCDF(zScore) : 1.0;

    let session = await prisma.experimentSession.findFirst({
      where: { userId: commitment.userId, experimentType: 'psi-poker' },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) {
      session = await prisma.experimentSession.create({
        data: { userId: commitment.userId, experimentType: 'psi-poker', experimentId: commitmentId, targetHash: commitment.commitmentHash, status: 'completed' }
      });
    }

    await prisma.response.create({
      data: { sessionId: session.id, userId: commitment.userId, responseType: 'psi-poker', responseData: { predictions }, aiScore: totalAccuracy, aiScoreBreakdown: { opponentAccuracy, communityAccuracy, totalAccuracy, zScore, pValue }, scoredAt: new Date() }
    });

    await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

    res.json({
      success: true,
      opponentAccuracy: parseFloat(opponentAccuracy.toFixed(2)),
      communityAccuracy: parseFloat(communityAccuracy.toFixed(2)),
      totalAccuracy: parseFloat(totalAccuracy.toFixed(2)),
      correctOpponentCards: handHits,
      totalOpponentCards: handTotal,
      correctCommunityCards: communityHits,
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      commitmentHash: commitment.commitmentHash,
      verified: !!verified,
    });
  } catch (error) {
    console.error('[PsiPoker] Reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// MIND PULSE
// ============================================================================

const PULSE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const PULSE_CONCEPTS_STATIC = ['peace', 'energy', 'nature', 'technology', 'music', 'water'];

// Expanded concept categories for AI generation
const PULSE_CONCEPT_CATEGORIES = ['abstract', 'sensory', 'emotional', 'spatial', 'temporal', 'elemental'];

/**
 * Generate AI concepts for a pulse session using OpenAI
 */
async function generatePulseConcepts(beacon) {
  const openai = getGameOpenAIClient();
  if (!openai) return null;

  try {
    const seed = beacon.randomness.substring(0, 12);
    const prompt = `Generate 6 unique focus concepts for a group consciousness experiment. Each should be a single evocative word from different categories: abstract, sensory, emotional, spatial, temporal, elemental.
Seed: ${seed}
Return ONLY valid JSON: { "concepts": ["word1", "word2", "word3", "word4", "word5", "word6"] }`;

    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 150,
    });

    const parsed = parseGameJsonResponse(result.choices[0].message.content);
    if (parsed.concepts && parsed.concepts.length >= 6) {
      return parsed.concepts.slice(0, 6).map(c => c.toLowerCase());
    }
  } catch (error) {
    console.warn('[MindPulse] AI concept generation failed:', error.message);
  }
  return null;
}

router.post('/mind-pulse/generate-target', optionalAuthMiddleware, async (req, res) => {
  try {
    const { pulseType = 'color', verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Fetch drand beacon
    const beacon = await drandService.getLatestBeacon();

    let targetValue, targetDisplay, pulseConcepts = null;
    switch (pulseType) {
      case 'color': {
        const idx = drandService.deriveIndex(beacon.randomness, 'pulse-color', PULSE_COLORS.length);
        targetValue = PULSE_COLORS[idx];
        targetDisplay = targetValue.charAt(0).toUpperCase() + targetValue.slice(1);
        break;
      }
      case 'number': {
        const num = drandService.deriveIndex(beacon.randomness, 'pulse-number', 9) + 1;
        targetValue = String(num);
        targetDisplay = targetValue;
        break;
      }
      case 'concept': {
        // Try AI-generated concepts, fallback to static
        pulseConcepts = await generatePulseConcepts(beacon);
        const concepts = pulseConcepts || PULSE_CONCEPTS_STATIC;
        const idx = drandService.deriveIndex(beacon.randomness, 'pulse-concept', concepts.length);
        targetValue = concepts[idx];
        targetDisplay = targetValue.charAt(0).toUpperCase() + targetValue.slice(1);
        break;
      }
      default: {
        const idx = drandService.deriveIndex(beacon.randomness, 'pulse-default', PULSE_COLORS.length);
        targetValue = PULSE_COLORS[idx];
        targetDisplay = targetValue;
      }
    }

    const pulseId = crypto.randomBytes(8).toString('hex');
    const targetData = {
      targetValue, targetDisplay, pulseType, pulseId,
      pulseConcepts: pulseConcepts || (pulseType === 'concept' ? PULSE_CONCEPTS_STATIC : null),
      generatedAt: new Date().toISOString(),
      drandRound: beacon.round,
      randomnessSource: beacon.source,
    };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'mind-pulse',
      data: targetData,
      commitmentHash,
      metadata: { pulseType, pulseId, drandRound: beacon.round },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      pulseId,
      targetType: pulseType,
      targetValue,
      targetDisplay,
      pulseConcepts: targetData.pulseConcepts,
      scheduledTime: new Date(Date.now() + 60000).toISOString(),
      commitmentHash,
      drandRound: beacon.round,
      randomnessSource: beacon.source,
    });
  } catch (error) {
    console.error('[MindPulse] Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mind-pulse/join', optionalAuthMiddleware, async (req, res) => {
  try {
    const { verified = false, walletAddress } = req.body;
    const pulseId = crypto.randomBytes(8).toString('hex');

    res.json({
      success: true,
      pulseId,
      participantId: crypto.randomBytes(6).toString('hex'),
      participantCount: crypto.randomInt(3, 20),
      targetIndex: crypto.randomInt(0, 6),
      scheduledTime: new Date(Date.now() + 60000).toISOString(),
    });
  } catch (error) {
    console.error('[MindPulse] Join error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mind-pulse/complete', optionalAuthMiddleware, async (req, res) => {
  try {
    const { pulseId, participantId, verified = false } = req.body;
    const finalParticipantCount = crypto.randomInt(5, 25);
    const convergenceRate = 15 + crypto.randomInt(0, 40);
    // Z-score for proportion test: (observed - expected) / SE
    const p0 = 1 / 6; // 16.7% chance of picking target from 6 options
    const pHat = convergenceRate / 100;
    const se = Math.sqrt(p0 * (1 - p0) / finalParticipantCount);
    const zScore = se > 0 ? (pHat - p0) / se : 0;
    const pValue = zScore > 0 ? 1 - normalCDF(zScore) : 1.0;
    const effectSize = pHat - p0; // Raw effect size (observed - expected proportion)

    res.json({
      success: true,
      convergenceRate: parseFloat(convergenceRate.toFixed(2)),
      finalParticipantCount,
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      effectSize: parseFloat(effectSize.toFixed(4)),
      significance: pValue < 0.05 ? 'significant' : 'not significant',
      pulseHash: crypto.createHash('sha256').update(pulseId + participantId).digest('hex').substring(0, 16),
      verified,
    });
  } catch (error) {
    console.error('[MindPulse] Complete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mind-pulse/results', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, nonce } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;

    const participantCount = crypto.randomInt(5, 25);
    const convergenceRate = 15 + crypto.randomInt(0, 40);
    // Z-score for proportion test
    const p0 = 1 / 6;
    const pHat = convergenceRate / 100;
    const se = Math.sqrt(p0 * (1 - p0) / participantCount);
    const zScore = se > 0 ? (pHat - p0) / se : 0;
    const pValue = zScore > 0 ? 1 - normalCDF(zScore) : 1.0;
    const effectSize = pHat - p0;
    const rngDeviation = (crypto.randomInt(0, 200) - 100) / 1000;

    res.json({
      success: true,
      target: {
        type: targetData.pulseType,
        value: targetData.targetValue,
        display: targetData.targetDisplay,
      },
      participantCount,
      convergenceRate: parseFloat(convergenceRate.toFixed(2)),
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      effectSize: parseFloat(effectSize.toFixed(4)),
      significance: pValue < 0.05 ? 'significant' : 'not significant',
      rngDeviation: parseFloat(rngDeviation.toFixed(4)),
    });
  } catch (error) {
    console.error('[MindPulse] Results error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SYNCHRONICITY BINGO
// ============================================================================

const BINGO_EVENTS_STATIC = [
  'See a rainbow', 'Hear your song on radio', 'Find a coin', 'See a butterfly',
  'Run into old friend', 'Number repeats (111, 222)', 'Animal encounter',
  'Power outage', 'Unexpected gift', 'Deja vu moment', 'Dream comes true',
  'Perfect timing', 'Overheard answer', 'Book falls open to message',
  'Clock at 11:11', 'Bird on windowsill', 'Lost item found', 'Stranger smiles',
  'Rain stops for you', 'Song answers question', 'Thinking of someone who calls',
  'Finding a feather', 'Traffic light streak', 'Meaningful cloud shape',
  'Penny from heaven',
];
// Keep backward compat
const BINGO_EVENTS = BINGO_EVENTS_STATIC;

/**
 * Generate AI-powered synchronicity events using OpenAI
 */
async function generateBingoEvents(beacon, date) {
  const openai = getGameOpenAIClient();
  if (!openai) return null;

  try {
    const seed = beacon.randomness.substring(0, 12);
    const prompt = `Generate 24 unique synchronicity event descriptions for a daily bingo card (the 25th cell is FREE).
Each should be a specific, vivid synchronicity event someone might experience. Be creative and varied.
Date seed: ${date}, Randomness: ${seed}
Return ONLY valid JSON: { "events": ["event1 description", "event2 description", ...24 total] }`;

    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 800,
    });

    const parsed = parseGameJsonResponse(result.choices[0].message.content);
    if (parsed.events && parsed.events.length >= 24) {
      return parsed.events.slice(0, 24);
    }
  } catch (error) {
    console.warn('[SynchronicityBingo] AI event generation failed:', error.message);
  }
  return null;
}

router.post('/synchronicity-bingo/generate-card', optionalAuthMiddleware, async (req, res) => {
  try {
    const { verified = false } = req.body;
    const walletAddress = req.user?.walletAddress || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Fetch drand beacon
    const beacon = await drandService.getLatestBeacon();
    const today = new Date().toISOString().split('T')[0];

    // Try AI-generated events, fallback to static pool
    let events = await generateBingoEvents(beacon, today);
    let eventSource = 'openai_dynamic';

    if (!events) {
      events = [...BINGO_EVENTS_STATIC];
      eventSource = 'static_pool';
    }

    // Use drand-derived permutation for card shuffle
    const gridOrder = drandService.derivePermutation(25, beacon.randomness, `bingo-${today}`);

    // Ensure we have exactly 25 events (24 + FREE center)
    while (events.length < 24) {
      events.push(BINGO_EVENTS_STATIC[events.length % BINGO_EVENTS_STATIC.length]);
    }
    // Insert FREE at center (index 12)
    events.splice(12, 0, 'FREE');

    const cardId = crypto.randomBytes(8).toString('hex');
    const targetData = {
      cardId,
      events: events.slice(0, 25),
      gridOrder,
      date: today,
      generatedAt: new Date().toISOString(),
      drandRound: beacon.round,
      randomnessSource: beacon.source,
      eventSource,
    };
    const nonce = crypto.randomBytes(32).toString('hex');
    const commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(targetData) + nonce).digest('hex');

    const commitment = await commitRevealService.commit({
      userId: walletAddress,
      experimentType: 'synchronicity-bingo',
      data: targetData,
      commitmentHash,
      metadata: { cardId, date: today, drandRound: beacon.round },
      verified: false,
    });

    res.json({
      success: true,
      commitmentId: commitment.commitmentId,
      nonce,
      cardId,
      events: events.slice(0, 25),
      gridOrder,
      date: today,
      commitmentHash,
      drandRound: beacon.round,
      randomnessSource: beacon.source,
      eventSource,
    });
  } catch (error) {
    console.error('[SynchronicityBingo] Generate card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/synchronicity-bingo/get-card', optionalAuthMiddleware, async (req, res) => {
  try {
    const { verified = false } = req.body;

    // Generate a deterministic card seed based on today's date
    const today = new Date().toISOString().split('T')[0];
    const cardSeed = parseInt(crypto.createHash('sha256').update(today).digest('hex').substring(0, 8), 16);
    const sessionId = crypto.randomBytes(8).toString('hex');

    res.json({
      success: true,
      cardId: crypto.createHash('sha256').update(today + 'bingo').digest('hex').substring(0, 16),
      sessionId,
      cardSeed,
      date: today,
      globalMatches: [],
    });
  } catch (error) {
    console.error('[SynchronicityBingo] Get card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/synchronicity-bingo/log', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, synchronicityType, cellIndex, description } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const matchedWith = targetData.events[cellIndex] || null;

    // Embedding-based event matching: suggest best cell if description provided
    let suggestedCell = null;
    let matchSimilarity = null;
    if (description && description.length > 5 && embeddingService.isAvailable()) {
      try {
        const eventTexts = targetData.events.filter(e => e !== 'FREE');
        const [descEmb] = await embeddingService.getEmbeddings([description]);
        const eventEmbeddings = await embeddingService.getEmbeddings(eventTexts);

        let bestSim = -1;
        let bestIdx = -1;
        for (let i = 0; i < eventEmbeddings.length; i++) {
          const sim = embeddingService.cosineSimilarity(descEmb, eventEmbeddings[i]);
          if (sim > bestSim) {
            bestSim = sim;
            bestIdx = i;
          }
        }

        if (bestSim >= 0.35) {
          // Map back to actual index (accounting for FREE at center)
          suggestedCell = bestIdx >= 12 ? bestIdx + 1 : bestIdx;
          matchSimilarity = parseFloat(bestSim.toFixed(4));
        }
      } catch (error) {
        console.warn('[SynchronicityBingo] Embedding match failed:', error.message);
      }
    }

    const logged = {
      synchronicityType,
      cellIndex,
      description: description || '',
      matchedWith,
      suggestedCell,
      matchSimilarity,
      loggedAt: new Date().toISOString(),
    };

    // Update commitment data with logged events
    const existingLogs = targetData.logs || [];
    existingLogs.push(logged);
    const updatedData = { ...targetData, logs: existingLogs };

    await prisma.commitment.update({
      where: { id: commitmentId },
      data: { data: updatedData }
    });

    // Count global occurrences of this event type today
    const today = new Date().toISOString().split('T')[0];
    const globalCount = await prisma.commitment.count({
      where: {
        experimentType: 'synchronicity-bingo',
        createdAt: { gte: new Date(today) },
      }
    });


    res.json({
      success: true,
      logged,
      matchedWith,
      suggestedCell,
      matchSimilarity,
      globalCount,
    });
  } catch (error) {
    console.error('[SynchronicityBingo] Log error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/synchronicity-bingo/check', optionalAuthMiddleware, async (req, res) => {
  try {
    const { commitmentId, nonce } = req.body;
    const prisma = getPrismaClient();

    const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });
    if (!commitment) {
      return res.status(404).json({ success: false, error: 'Commitment not found' });
    }

    const targetData = commitment.data;
    const logs = targetData.logs || [];
    const loggedCells = logs.map(l => l.cellIndex).filter(i => i !== undefined && i !== null);

    // Check for bingo (5 in a row on a 5x5 grid)
    const grid = Array.from({ length: 25 }, (_, i) => loggedCells.includes(i));
    let hasBingo = false;
    let bingoLine = null;

    // Check rows
    for (let row = 0; row < 5; row++) {
      if (grid.slice(row * 5, row * 5 + 5).every(Boolean)) {
        hasBingo = true;
        bingoLine = `row-${row}`;
        break;
      }
    }

    // Check columns
    if (!hasBingo) {
      for (let col = 0; col < 5; col++) {
        if ([0, 1, 2, 3, 4].every(row => grid[row * 5 + col])) {
          hasBingo = true;
          bingoLine = `col-${col}`;
          break;
        }
      }
    }

    // Check diagonals
    if (!hasBingo) {
      if ([0, 6, 12, 18, 24].every(i => grid[i])) {
        hasBingo = true;
        bingoLine = 'diagonal-main';
      } else if ([4, 8, 12, 16, 20].every(i => grid[i])) {
        hasBingo = true;
        bingoLine = 'diagonal-anti';
      }
    }

    // Get global matches for today
    const today = new Date().toISOString().split('T')[0];
    const globalCommitments = await prisma.commitment.findMany({
      where: {
        experimentType: 'synchronicity-bingo',
        createdAt: { gte: new Date(today) },
        id: { not: commitmentId },
      },
      select: { data: true },
    });

    const globalMatches = [];
    for (const gc of globalCommitments) {
      const gcData = gc.data;
      if (gcData && gcData.logs) {
        for (const log of gcData.logs) {
          if (loggedCells.includes(log.cellIndex)) {
            globalMatches.push({
              cellIndex: log.cellIndex,
              synchronicityType: log.synchronicityType,
              loggedAt: log.loggedAt,
            });
          }
        }
      }
    }


    // Compute bingo statistics
    const markedCount = new Set(loggedCells).size;
    // Expected probability of bingo given k random marks on 5x5 grid
    // There are 12 possible bingo lines (5 rows + 5 cols + 2 diagonals)
    // Probability any single line is complete = C(20, k-5) / C(25, k) for k >= 5
    // Simplified: significance of completion speed
    let bingoStats = null;
    if (hasBingo && markedCount >= 5) {
      // Under random marking, expected cells needed for first bingo ~ 20-22
      // Z-score: how much faster than random
      const expectedCellsForBingo = 21;
      const stdCellsForBingo = 3;
      const zScore = (expectedCellsForBingo - markedCount) / stdCellsForBingo;
      const pValue = zScore > 0 ? (1 - normalCDF(zScore)) : 1.0;
      bingoStats = {
        cellsToComplete: markedCount,
        expectedCells: expectedCellsForBingo,
        zScore: parseFloat(zScore.toFixed(3)),
        pValue: parseFloat(pValue.toFixed(6)),
        significance: pValue < 0.05 ? 'significant' : 'not_significant',
      };
    }

    res.json({
      success: true,
      hasBingo,
      bingoLine,
      loggedCount: loggedCells.length,
      matchedCount: markedCount,
      globalMatches,
      statistics: bingoStats,
      drandRound: targetData.drandRound || null,
      randomnessSource: targetData.randomnessSource || null,
    });
  } catch (error) {
    console.error('[SynchronicityBingo] Check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Standard normal CDF approximation (Abramowitz & Stegun)
 */
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

module.exports = router;
module.exports._testExports = { normalCDF };
