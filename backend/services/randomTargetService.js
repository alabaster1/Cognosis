/**
 * Random Target Generation Service
 * Cryptographically secure random target generation for experiments
 */

const crypto = require('crypto');
const axios = require('axios');
const embeddingService = require('./embeddingService');
const drandService = require('./drandService');

// Lazy OpenAI initialization
const OpenAI = require('openai');
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function parseJsonResponse(text) {
  let content = text.trim();
  if (content.startsWith('```')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  return JSON.parse(content);
}

// Charli3 VRF Oracle configuration (Cardano)
const VRF_ORACLE_URL = process.env.CHARLI3_VRF_URL || null;
const VRF_API_KEY = process.env.CHARLI3_API_KEY || null;

class RandomTargetService {
  /**
   * Generate verifiable random number using Charli3 VRF Oracle (Cardano)
   * Falls back to crypto.randomInt if VRF unavailable
   *
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {{ value: number, proof: string|null, source: string }}
   */
  async generateVRFRandom(min, max) {
    // Try Charli3 VRF first
    if (VRF_ORACLE_URL && VRF_API_KEY) {
      try {
        const response = await axios.post(
          `${VRF_ORACLE_URL}/v1/randomness`,
          {
            min,
            max,
            callback_url: null, // Synchronous request
          },
          {
            headers: {
              'Authorization': `Bearer ${VRF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        const { randomValue, proof, txHash } = response.data;

        return {
          value: randomValue,
          proof: proof,
          txHash: txHash || null,
          source: 'charli3_vrf',
          verifiable: true,
        };
      } catch (error) {
        console.warn('[RandomTarget] VRF Oracle unavailable, falling back to crypto:', error.message);
      }
    }

    // Fallback: cryptographic randomness (server-side, not on-chain verifiable)
    return {
      value: crypto.randomInt(min, max),
      proof: null,
      txHash: null,
      source: 'crypto_random',
      verifiable: false,
    };
  }

  /**
   * Generate a verifiable random seed for experiment targets
   * Returns seed + VRF proof for on-chain verification
   */
  async generateVerifiableSeed() {
    const result = await this.generateVRFRandom(0, 2 ** 31);
    return {
      seed: result.value,
      vrfProof: result.proof,
      vrfTxHash: result.txHash,
      source: result.source,
      verifiable: result.verifiable,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate random card suits for card prediction experiment
   */
  generateCardTargets(numRounds) {
    const suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
    const targets = [];

    for (let i = 0; i < numRounds; i++) {
      // Use crypto.randomInt for cryptographically secure randomness
      const randomIndex = crypto.randomInt(0, suits.length);
      targets.push(suits[randomIndex]);
    }

    return {
      targets,
      totalRounds: numRounds,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate random concepts for AI telepathy experiment
   */
  generateTelepathyTargets(numRounds = 3) {
    const concepts = [
      { concept: 'Ocean', category: 'Nature' },
      { concept: 'Mountain', category: 'Nature' },
      { concept: 'Forest', category: 'Nature' },
      { concept: 'Desert', category: 'Nature' },
      { concept: 'River', category: 'Nature' },
      { concept: 'Joy', category: 'Emotions' },
      { concept: 'Peace', category: 'Emotions' },
      { concept: 'Wonder', category: 'Emotions' },
      { concept: 'Love', category: 'Emotions' },
      { concept: 'Courage', category: 'Emotions' },
      { concept: 'Book', category: 'Objects' },
      { concept: 'Key', category: 'Objects' },
      { concept: 'Mirror', category: 'Objects' },
      { concept: 'Clock', category: 'Objects' },
      { concept: 'Candle', category: 'Objects' },
      { concept: 'Dancing', category: 'Actions' },
      { concept: 'Flying', category: 'Actions' },
      { concept: 'Swimming', category: 'Actions' },
      { concept: 'Running', category: 'Actions' },
      { concept: 'Singing', category: 'Actions' },
      { concept: 'Time', category: 'Abstract' },
      { concept: 'Energy', category: 'Abstract' },
      { concept: 'Connection', category: 'Abstract' },
      { concept: 'Balance', category: 'Abstract' },
      { concept: 'Infinity', category: 'Abstract' },
    ];

    const targets = [];
    const usedIndices = new Set();

    // Select unique random concepts
    for (let i = 0; i < numRounds; i++) {
      let randomIndex;
      do {
        randomIndex = crypto.randomInt(0, concepts.length);
      } while (usedIndices.has(randomIndex));

      usedIndices.add(randomIndex);
      targets.push(concepts[randomIndex]);
    }

    return {
      targets,
      totalRounds: numRounds,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Expanded static pool with imagery for AI telepathy fallback (50+ concepts)
   */
  static TELEPATHY_POOL = [
    { concept: 'Ocean', category: 'Nature', imagery: 'Vast blue waves crashing against rocky cliffs under stormy skies' },
    { concept: 'Mountain', category: 'Nature', imagery: 'Snow-capped peak piercing through misty clouds at sunrise' },
    { concept: 'Forest', category: 'Nature', imagery: 'Dense canopy of ancient trees with shafts of golden light' },
    { concept: 'Desert', category: 'Nature', imagery: 'Endless golden sand dunes rippling under a blazing sun' },
    { concept: 'River', category: 'Nature', imagery: 'Crystal clear water rushing over smooth mossy stones' },
    { concept: 'Volcano', category: 'Nature', imagery: 'Glowing orange lava flowing down a dark mountain at night' },
    { concept: 'Waterfall', category: 'Nature', imagery: 'Thundering cascade of white water plunging into a misty pool' },
    { concept: 'Cave', category: 'Nature', imagery: 'Dark underground chamber with stalactites dripping mineral water' },
    { concept: 'Lightning', category: 'Nature', imagery: 'Brilliant white bolt splitting a purple-black storm sky' },
    { concept: 'Coral Reef', category: 'Nature', imagery: 'Colorful underwater garden teeming with tropical fish' },
    { concept: 'Joy', category: 'Emotions', imagery: 'A child laughing while spinning in circles with arms wide open' },
    { concept: 'Peace', category: 'Emotions', imagery: 'Still lake at dawn reflecting pink and gold sky perfectly' },
    { concept: 'Wonder', category: 'Emotions', imagery: 'Eyes wide open gazing at the northern lights dancing overhead' },
    { concept: 'Love', category: 'Emotions', imagery: 'Two hands intertwined with warmth radiating like golden light' },
    { concept: 'Courage', category: 'Emotions', imagery: 'A lone figure standing firm against a howling wind storm' },
    { concept: 'Nostalgia', category: 'Emotions', imagery: 'Faded photograph of a summer day that smells of cut grass' },
    { concept: 'Serenity', category: 'Emotions', imagery: 'Gentle waves lapping a sandy shore under a full moon' },
    { concept: 'Excitement', category: 'Emotions', imagery: 'Heart racing as a roller coaster crests the first drop' },
    { concept: 'Gratitude', category: 'Emotions', imagery: 'Warm sunlight streaming through a window onto a sleeping cat' },
    { concept: 'Awe', category: 'Emotions', imagery: 'Standing at the edge of the Grand Canyon at sunset' },
    { concept: 'Book', category: 'Objects', imagery: 'Leather-bound volume with yellowed pages and gold-embossed spine' },
    { concept: 'Key', category: 'Objects', imagery: 'Ornate brass skeleton key glinting in dim candlelight' },
    { concept: 'Mirror', category: 'Objects', imagery: 'Antique silver-framed looking glass reflecting a different world' },
    { concept: 'Clock', category: 'Objects', imagery: 'Grand pendulum clock ticking loudly in a silent marble hall' },
    { concept: 'Candle', category: 'Objects', imagery: 'Tall white candle flame flickering in a dark stone room' },
    { concept: 'Compass', category: 'Objects', imagery: 'Brass navigation instrument with a spinning red needle pointing north' },
    { concept: 'Telescope', category: 'Objects', imagery: 'Long copper tube pointed at a starry sky from a tower' },
    { concept: 'Hourglass', category: 'Objects', imagery: 'Sand grains falling one by one through a narrow glass neck' },
    { concept: 'Lantern', category: 'Objects', imagery: 'Paper lantern glowing orange and floating up into the night' },
    { concept: 'Crystal', category: 'Objects', imagery: 'Faceted clear prism splitting white light into rainbow colors' },
    { concept: 'Dancing', category: 'Actions', imagery: 'Bare feet spinning on wooden floor with flowing silk fabric' },
    { concept: 'Flying', category: 'Actions', imagery: 'Soaring above clouds with wind rushing past outstretched arms' },
    { concept: 'Swimming', category: 'Actions', imagery: 'Gliding through turquoise water with bubbles trailing behind' },
    { concept: 'Running', category: 'Actions', imagery: 'Sprinting through tall grass with the wind at your back' },
    { concept: 'Singing', category: 'Actions', imagery: 'Voice echoing through a cathedral with notes visible as light' },
    { concept: 'Climbing', category: 'Actions', imagery: 'Gripping rough stone ledge high above a misty valley' },
    { concept: 'Painting', category: 'Actions', imagery: 'Brush sweeping vivid colors across a blank white canvas' },
    { concept: 'Meditating', category: 'Actions', imagery: 'Cross-legged figure surrounded by floating golden particles of light' },
    { concept: 'Falling', category: 'Actions', imagery: 'Tumbling through clouds with the ground rushing up below' },
    { concept: 'Building', category: 'Actions', imagery: 'Hands stacking stones into a tower reaching toward the sky' },
    { concept: 'Time', category: 'Abstract', imagery: 'Melting clocks draped over tree branches in a surreal landscape' },
    { concept: 'Energy', category: 'Abstract', imagery: 'Crackling electricity arcing between two metal spheres in darkness' },
    { concept: 'Connection', category: 'Abstract', imagery: 'Glowing threads linking silhouettes across a vast dark space' },
    { concept: 'Balance', category: 'Abstract', imagery: 'A stone perfectly poised on a razor-thin cliff edge' },
    { concept: 'Infinity', category: 'Abstract', imagery: 'Spiraling staircase descending endlessly into a starry void' },
    { concept: 'Transformation', category: 'Abstract', imagery: 'Caterpillar dissolving into light and emerging as a butterfly' },
    { concept: 'Gravity', category: 'Abstract', imagery: 'Objects floating weightlessly in a room with no floor' },
    { concept: 'Silence', category: 'Abstract', imagery: 'Empty white room where even thoughts make no sound' },
    { concept: 'Chaos', category: 'Abstract', imagery: 'Shattered glass pieces suspended mid-explosion catching rainbow light' },
    { concept: 'Harmony', category: 'Abstract', imagery: 'Concentric ripples from two drops merging perfectly in a pond' },
  ];

  /**
   * Generate dynamic telepathy targets using OpenAI + drand beacon
   * @param {number} numRounds - Number of targets to generate
   * @param {{ randomness: string, round: number, source: string }} beacon - drand beacon
   * @returns {{ targets: Array, totalRounds: number, generatedAt: string, drandRound: number, randomnessSource: string }}
   */
  async generateTelepathyTargetsDynamic(numRounds = 3, beacon = null) {
    // Get drand beacon if not provided
    if (!beacon) {
      beacon = await drandService.getLatestBeacon();
    }

    const seed = beacon.randomness.substring(0, 16);
    const openai = getOpenAIClient();

    if (openai) {
      try {
        const prompt = `Generate ${numRounds} vivid concept targets for a telepathy experiment.
Each must be concrete, imagery-rich, and from different categories (Nature, Emotions, Objects, Actions, Abstract).
Seed: ${seed}
Return ONLY valid JSON without markdown code blocks:
{ "targets": [{ "concept": "1-3 words", "category": "string", "imagery": "8-15 word vivid description for visualization" }] }`;

        const result = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          max_tokens: 500,
        });

        const parsed = parseJsonResponse(result.choices[0].message.content);

        if (parsed.targets && parsed.targets.length >= numRounds) {
          return {
            targets: parsed.targets.slice(0, numRounds),
            totalRounds: numRounds,
            generatedAt: new Date().toISOString(),
            drandRound: beacon.round,
            randomnessSource: beacon.source,
            targetSource: 'openai_dynamic',
          };
        }
      } catch (error) {
        console.warn('[RandomTarget] OpenAI dynamic generation failed, using static pool:', error.message);
      }
    }

    // Fallback: select from expanded static pool using drand
    const pool = RandomTargetService.TELEPATHY_POOL;
    const indices = drandService.deriveUniqueIndices(beacon.randomness, 'telepathy-target', numRounds, pool.length);
    const targets = indices.map(i => pool[i]);

    return {
      targets,
      totalRounds: numRounds,
      generatedAt: new Date().toISOString(),
      drandRound: beacon.round,
      randomnessSource: beacon.source,
      targetSource: 'static_pool',
    };
  }

  /**
   * Score telepathy guesses using embedding similarity
   * @param {string[][]} guesses - Array of guess arrays per round
   * @param {Array<{ concept: string, category: string, imagery: string }>} targets
   * @returns {{ rounds: Array, averageWarmth: string, accuracy: string, rawSimilarities: number[], scoringMethod: string }}
   */
  async scoreTelepathyEmbedding(guesses, targets) {
    if (!embeddingService.isAvailable()) {
      // Fallback to string matching
      const fallback = this.scoreTelepathy(guesses, targets);
      return { ...fallback, rawSimilarities: [], scoringMethod: 'string_matching' };
    }

    const rounds = [];
    const rawSimilarities = [];
    let totalScore = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const roundGuesses = guesses[i] || [];

      if (roundGuesses.length === 0) {
        rounds.push({
          round: i + 1,
          target: target.concept,
          category: target.category,
          imagery: target.imagery,
          guesses: [],
          bestGuess: '',
          bestWarmth: 'cold',
          bestSimilarity: 0,
        });
        continue;
      }

      // Embed target concept and imagery
      const targetTexts = [target.concept];
      if (target.imagery) targetTexts.push(target.imagery);
      const targetEmbeddings = await embeddingService.getEmbeddings(targetTexts);

      // Embed all guesses for this round
      const guessEmbeddings = await embeddingService.getEmbeddings(roundGuesses);

      const guessResults = [];
      let bestSim = -1;
      let bestIdx = 0;

      for (let g = 0; g < roundGuesses.length; g++) {
        // Score = max similarity to concept or imagery
        const simConcept = embeddingService.cosineSimilarity(guessEmbeddings[g], targetEmbeddings[0]);
        const simImagery = targetEmbeddings[1]
          ? embeddingService.cosineSimilarity(guessEmbeddings[g], targetEmbeddings[1])
          : 0;
        const sim = Math.max(simConcept, simImagery);

        const warmth = embeddingService.similarityToWarmth(sim);
        guessResults.push({ guess: roundGuesses[g], warmth, similarity: parseFloat(sim.toFixed(4)) });
        rawSimilarities.push(sim);

        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = g;
        }
      }

      const bestWarmth = embeddingService.similarityToWarmth(bestSim);
      totalScore += embeddingService.warmthToScore(bestWarmth);

      rounds.push({
        round: i + 1,
        target: target.concept,
        category: target.category,
        imagery: target.imagery,
        guesses: guessResults,
        bestGuess: roundGuesses[bestIdx],
        bestWarmth,
        bestSimilarity: parseFloat(bestSim.toFixed(4)),
      });
    }

    const avgScore = targets.length > 0 ? totalScore / targets.length : 0;

    return {
      rounds,
      averageWarmth: avgScore.toFixed(2),
      accuracy: avgScore.toFixed(2),
      performance: avgScore > 50 ? 'above' : avgScore < 50 ? 'below' : 'at',
      rawSimilarities,
      scoringMethod: 'embedding',
    };
  }

  /**
   * Generate random dice faces for dice influence experiment
   */
  generateDiceTargets(numRolls, userTargetFace) {
    const targets = [];

    for (let i = 0; i < numRolls; i++) {
      // Generate random dice face (0-5, representing faces 1-6)
      const randomFace = crypto.randomInt(0, 6);
      targets.push(randomFace);
    }

    return {
      targets,
      userTargetFace,
      totalRolls: numRolls,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Score card prediction results
   */
  scoreCardPrediction(predictions, targets) {
    if (predictions.length !== targets.length) {
      throw new Error('Predictions and targets length mismatch');
    }

    let hits = 0;
    const rounds = [];

    for (let i = 0; i < predictions.length; i++) {
      const correct = predictions[i] === targets[i];
      if (correct) hits++;

      rounds.push({
        round: i + 1,
        prediction: predictions[i],
        actual: targets[i],
        correct,
      });
    }

    const total = predictions.length;
    const accuracy = (hits / total) * 100;
    const baseline = 25; // 1 in 4 chance
    const difference = accuracy - baseline;

    return {
      rounds,
      hits,
      total,
      accuracy: parseFloat(accuracy.toFixed(2)),
      baseline,
      difference: parseFloat(difference.toFixed(2)),
      performance: difference > 0 ? 'above' : difference < 0 ? 'below' : 'at',
    };
  }

  /**
   * Score AI telepathy results using string similarity
   */
  scoreTelepathy(guesses, targets) {
    const rounds = [];
    let totalWarmth = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const roundGuesses = guesses[i] || [];

      const guessResults = roundGuesses.map(guess => {
        const warmth = this.calculateWarmth(guess, target.concept);
        return { guess, warmth };
      });

      // Find best guess
      const bestGuess = guessResults.reduce((best, curr) =>
        this.warmthToScore(curr.warmth) > this.warmthToScore(best.warmth) ? curr : best,
        guessResults[0] || { guess: '', warmth: 'cold' }
      );

      totalWarmth += this.warmthToScore(bestGuess.warmth);

      rounds.push({
        round: i + 1,
        target: target.concept,
        category: target.category,
        guesses: guessResults,
        bestGuess: bestGuess.guess,
        bestWarmth: bestGuess.warmth,
      });
    }

    const avgWarmth = totalWarmth / targets.length;
    const accuracy = (avgWarmth / 100) * 100; // Convert warmth score to percentage

    return {
      rounds,
      averageWarmth: avgWarmth.toFixed(2),
      accuracy: accuracy.toFixed(2),
      performance: avgWarmth > 50 ? 'above' : avgWarmth < 50 ? 'below' : 'at',
    };
  }

  /**
   * Calculate warmth level based on string similarity
   */
  calculateWarmth(guess, target) {
    const similarity = this.calculateSimilarity(guess.toLowerCase(), target.toLowerCase());

    if (similarity > 0.8) return 'burning';
    if (similarity > 0.6) return 'veryWarm';
    if (similarity > 0.4) return 'warm';
    if (similarity > 0.25) return 'lukewarm';
    if (similarity > 0.1) return 'cool';
    return 'cold';
  }

  /**
   * Calculate string similarity (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.includes(str2) || str2.includes(str1)) return 0.7;

    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const commonWords = words1.filter(w => words2.includes(w)).length;

    return commonWords / Math.max(words1.length, words2.length);
  }

  /**
   * Convert warmth level to score (0-100)
   */
  warmthToScore(warmth) {
    const scores = {
      burning: 100,
      veryWarm: 80,
      warm: 60,
      lukewarm: 40,
      cool: 20,
      cold: 0,
    };
    return scores[warmth] || 0;
  }

  /**
   * Score dice influence results with chi-square analysis
   */
  scoreDiceInfluence(userTargetFace, actualResults) {
    const totalRolls = actualResults.length;
    let hits = 0;
    const rolls = [];

    // Count hits and create roll results
    for (let i = 0; i < actualResults.length; i++) {
      const isHit = actualResults[i] === userTargetFace;
      if (isHit) hits++;

      rolls.push({
        number: i + 1,
        result: actualResults[i],
        isHit,
      });
    }

    // Calculate distribution
    const distribution = [0, 0, 0, 0, 0, 0];
    actualResults.forEach(result => {
      distribution[result]++;
    });

    // Chi-square calculation
    const expected = totalRolls / 6;
    let chiSquare = 0;
    for (let i = 0; i < 6; i++) {
      const diff = distribution[i] - expected;
      chiSquare += (diff * diff) / expected;
    }

    // Determine significance
    let significance;
    if (chiSquare >= 20.52) {
      significance = { level: 'p < 0.001', description: 'Highly significant', color: 'purple' };
    } else if (chiSquare >= 15.09) {
      significance = { level: 'p < 0.01', description: 'Very significant', color: 'blue' };
    } else if (chiSquare >= 11.07) {
      significance = { level: 'p < 0.05', description: 'Significant', color: 'green' };
    } else {
      significance = { level: 'p > 0.05', description: 'Not significant', color: 'gray' };
    }

    const hitRate = (hits / totalRolls) * 100;
    const expectedRate = 16.67;
    const expectedHits = (totalRolls * expectedRate) / 100;

    return {
      rolls,
      hits,
      totalRolls,
      hitRate: parseFloat(hitRate.toFixed(2)),
      expectedRate,
      expectedHits: parseFloat(expectedHits.toFixed(2)),
      difference: parseFloat((hitRate - expectedRate).toFixed(2)),
      distribution,
      chiSquare: parseFloat(chiSquare.toFixed(3)),
      significance,
      performance: hitRate > expectedRate ? 'above' : hitRate < expectedRate ? 'below' : 'at',
    };
  }
}

module.exports = new RandomTargetService();
