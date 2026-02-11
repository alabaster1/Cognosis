const OpenAI = require('openai');

// Lazy initialization of OpenAI client
let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[AIService] OPENAI_API_KEY not set - AI scoring will use basic fallback');
      return null;
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/**
 * AI-Powered Experiment Scoring Service
 * Uses OpenAI for intelligent scoring with fallback to basic algorithms
 *
 * EXPERIMENT TYPES:
 *
 * AI-SCORED (Subjective - Uses OpenAI):
 * - Remote Viewing (rv-images, rv-locations, rv-objects)
 * - Telepathy (tele-images, tele-emotions, tele-ai)
 * - Dream Journal (dream-journal, dream-precog, dream-telepathy, lucid-testing)
 * - Ganzfeld (ganzfeld-images, ganzfeld-video, ganzfeld-standard, mini-ganzfeld)
 * - Event Forecasting (premon-events, time-loop) - when actual outcome known
 * - Synchronicity (sync-tracker)
 * - Memory Field (memory-echo, delayed-recall, resonance-test)
 *
 * DETERMINISTIC (NO AI - Just log results):
 * - Card Prediction (premon-cards) - exact match / rank match / suit match
 * - RNG/PK (rng-focus, pk-rng, field-coherence) - statistical z-score
 * - Dice (pk-dice, dice-influence) - statistical deviation
 * - Quantum Decision (quantum-choice) - hit rate
 * - Probability Shifting (probability-shift) - distribution analysis
 * - Retrocausal Choice (retro-choice) - correlation analysis
 */

// Check if AI is available
const isAIAvailable = () => {
  return !!process.env.OPENAI_API_KEY;
};

// Backward compatibility
const isGeminiAvailable = isAIAvailable;

/**
 * Parse JSON from AI response
 */
function parseJsonResponse(text) {
  let content = text.trim();
  if (content.startsWith('```')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  return JSON.parse(content);
}

/**
 * Score Remote Viewing Response
 */
async function scoreRemoteViewing(userResponse, targetDescription) {
  const openai = getClient();
  if (openai) {
    try {
      const prompt = `You are an expert in scoring remote viewing experiments. Analyze the user's impressions against the actual target and provide a similarity score from 0-100 based on semantic overlap, visual element matches, and thematic correspondence. Be generous with partial matches and conceptual similarities.

Target Description: ${targetDescription}

User's Remote Viewing Response: ${userResponse}

Provide a JSON response with: {"score": <0-100>, "analysis": "<brief explanation>", "matches": ["<specific match 1>", "<match 2>", ...], "misses": ["<what was missed>"]}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const text = result.choices[0].message.content;
      const parsed = parseJsonResponse(text);
      return {
        score: parsed.score,
        analysis: parsed.analysis,
        matches: parsed.matches || [],
        misses: parsed.misses || [],
        scoringMethod: 'ai',
      };
    } catch (error) {
      console.error('AI scoring error, falling back to basic:', error.message);
      return scoreRemoteViewingBasic(userResponse, targetDescription);
    }
  } else {
    return scoreRemoteViewingBasic(userResponse, targetDescription);
  }
}

/**
 * Basic fallback scoring for Remote Viewing
 */
function scoreRemoteViewingBasic(userResponse, targetDescription) {
  const userWords = userResponse.toLowerCase().split(/\s+/);
  const targetWords = targetDescription.toLowerCase().split(/\s+/);

  const matches = userWords.filter(word =>
    word.length > 3 && targetWords.some(tw => tw.includes(word) || word.includes(tw))
  );

  const score = Math.min(100, Math.round((matches.length / Math.max(userWords.length, 10)) * 100 * 1.5));

  return {
    score,
    analysis: `Basic keyword matching found ${matches.length} potential matches.`,
    matches: matches.slice(0, 5),
    misses: ['Detailed analysis requires AI scoring'],
    scoringMethod: 'basic',
  };
}

/**
 * Score Telepathy Response
 */
async function scoreTelepathy(userResponse, targetContent, experimentType) {
  const openai = getClient();
  if (openai) {
    try {
      const prompt = `You are an expert in scoring telepathy experiments. For ${experimentType}, compare the received impressions with the sent target. Score 0-100 based on accuracy, emotional resonance, and conceptual alignment.

Target Sent: ${targetContent}

Received Impressions: ${userResponse}

Provide JSON: {"score": <0-100>, "analysis": "<explanation>", "emotional_match": <0-100>, "conceptual_match": <0-100|}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      });

      const text = result.choices[0].message.content;
      const parsed = parseJsonResponse(text);
      return {
        score: parsed.score,
        analysis: parsed.analysis,
        emotionalMatch: parsed.emotional_match,
        conceptualMatch: parsed.conceptual_match,
        scoringMethod: 'ai',
      };
    } catch (error) {
      console.error('AI scoring error, falling back to basic:', error.message);
      return scoreTelepathyBasic(userResponse, targetContent);
    }
  } else {
    return scoreTelepathyBasic(userResponse, targetContent);
  }
}

/**
 * Basic fallback scoring for Telepathy
 */
function scoreTelepathyBasic(userResponse, targetContent) {
  const userWords = userResponse.toLowerCase().split(/\s+/);
  const targetWords = targetContent.toLowerCase().split(/\s+/);

  const matches = userWords.filter(word =>
    word.length > 3 && targetWords.includes(word)
  );

  const score = Math.min(100, Math.round((matches.length / Math.max(targetWords.length, 5)) * 100));

  return {
    score,
    analysis: `Basic matching found ${matches.length} word overlaps.`,
    emotionalMatch: 50,
    conceptualMatch: score,
    scoringMethod: 'basic',
  };
}

/**
 * Score Dream Journal Entry
 */
async function scoreDreamJournal(dreamEntry, priorDreams = []) {
  const openai = getClient();
  if (openai) {
    try {
      const prompt = `You are an expert dream analyst. Analyze dream content for vividness, symbolic richness, coherence, and potential precognitive elements. Score 0-100 on dream quality.

Dream Entry: ${dreamEntry}

Provide JSON: {"score": <0-100>, "vividness": <0-100>, "symbolism": <0-100>, "coherence": <0-100>, "themes": ["<theme1>", "<theme2>"], "analysis": "<interpretation>"}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 500,
      });

      const text = result.choices[0].message.content;
      const parsed = parseJsonResponse(text);
      return {
        score: parsed.score,
        vividness: parsed.vividness,
        symbolism: parsed.symbolism,
        coherence: parsed.coherence,
        themes: parsed.themes || [],
        analysis: parsed.analysis,
        scoringMethod: 'ai',
      };
    } catch (error) {
      console.error('AI scoring error, falling back to basic:', error.message);
      return scoreDreamJournalBasic(dreamEntry);
    }
  } else {
    return scoreDreamJournalBasic(dreamEntry);
  }
}

/**
 * Basic fallback scoring for Dream Journal
 */
function scoreDreamJournalBasic(dreamEntry) {
  const wordCount = dreamEntry.split(/\s+/).length;
  const detailScore = Math.min(100, (wordCount / 50) * 100);

  return {
    score: detailScore,
    vividness: detailScore,
    symbolism: 50,
    coherence: 60,
    themes: ['Requires AI analysis'],
    analysis: 'Basic scoring based on entry length and detail.',
    scoringMethod: 'basic',
  };
}

/**
 * Score RNG/PK Experiment
 * NOTE: This is pure statistical analysis - NO AI needed
 * Just calculates deviation from expected random distribution
 */
function scoreRNGExperiment(trials, intention, expectedValue = 0.5) {
  // Statistical analysis for RNG experiments - deterministic, no AI
  const totalTrials = trials.length;
  const successCount = trials.filter(t => t.result === 1).length;
  const successRate = successCount / totalTrials;

  // Calculate z-score
  const expectedSuccesses = totalTrials * expectedValue;
  const variance = totalTrials * expectedValue * (1 - expectedValue);
  const stdDev = Math.sqrt(variance);
  const zScore = (successCount - expectedSuccesses) / stdDev;

  // Convert z-score to score (0-100)
  // Z-score of 2.0 = 100, Z-score of 0 = 50
  const score = Math.min(100, Math.max(0, 50 + (zScore * 25)));

  return {
    score: Math.round(score),
    successRate: Math.round(successRate * 100),
    zScore: zScore.toFixed(3),
    expectedRate: Math.round(expectedValue * 100),
    totalTrials,
    successCount,
    analysis: zScore > 1.96
      ? 'Statistically significant deviation detected! (p < 0.05)'
      : zScore > 1.64
      ? 'Moderate deviation observed (p < 0.10)'
      : 'Results within normal random variance',
    scoringMethod: 'statistical',
  };
}

/**
 * Score Card Prediction
 * NOTE: This is deterministic matching - NO AI needed
 * Just checks if prediction matches actual card
 */
function scoreCardPrediction(prediction, actualCard) {
  const exactMatch = prediction.rank === actualCard.rank && prediction.suit === actualCard.suit;
  const rankMatch = prediction.rank === actualCard.rank;
  const suitMatch = prediction.suit === actualCard.suit;
  const colorMatch =
    (['hearts', 'diamonds'].includes(prediction.suit) && ['hearts', 'diamonds'].includes(actualCard.suit)) ||
    (['clubs', 'spades'].includes(prediction.suit) && ['clubs', 'spades'].includes(actualCard.suit));

  let score = 0;
  if (exactMatch) {
    score = 100;
  } else if (rankMatch) {
    score = 60;
  } else if (suitMatch) {
    score = 50;
  } else if (colorMatch) {
    score = 25;
  }

  return {
    score,
    exactMatch,
    rankMatch,
    suitMatch,
    colorMatch,
    analysis: exactMatch
      ? 'Perfect match! Exact card predicted.'
      : rankMatch
      ? 'Rank matched - strong partial hit'
      : suitMatch
      ? 'Suit matched - good partial hit'
      : colorMatch
      ? 'Color matched - weak correlation'
      : 'No matches detected',
    scoringMethod: 'deterministic',
  };
}

/**
 * Score Event Forecasting
 */
async function scoreEventForecast(prediction, actualOutcome) {
  const openai = getClient();
  if (openai) {
    try {
      const prompt = `You are an expert in evaluating precognitive predictions with STRICT scoring criteria.

CRITICAL RULES:
- Vague, generic, or meaningless predictions (like "test", "something", "event") should score 0-10
- Only award high scores (70-100) for specific, detailed predictions with clear matches
- A prediction must contain concrete details (who, what, when, where) to score above 50
- Generic predictions that could apply to any outcome score 0-20
- Penalize severely for lack of specificity

Score 0-100 based on:
1. Specificity of prediction (50% weight)
2. Accuracy of details (30% weight)
3. Timing precision (20% weight)

Be HARSH on vague predictions. A one-word or generic prediction cannot score above 15.

Prediction: ${prediction}

Actual Outcome: ${actualOutcome}

Provide JSON: {"score": <0-100>, "accuracy": "<high/medium/low>", "analysis": "<detailed comparison>", "specificHits": ["<specific correct detail>"], "specificMisses": ["<what was wrong>"]}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
      });

      const text = result.choices[0].message.content;
      const parsed = parseJsonResponse(text);
      return {
        score: parsed.score,
        accuracy: parsed.accuracy,
        analysis: parsed.analysis,
        specificHits: parsed.specificHits || [],
        specificMisses: parsed.specificMisses || [],
        scoringMethod: 'ai',
      };
    } catch (error) {
      console.error('AI scoring error, falling back to basic:', error.message);
      return scoreEventForecastBasic(prediction, actualOutcome);
    }
  } else {
    return scoreEventForecastBasic(prediction, actualOutcome);
  }
}

/**
 * Basic fallback scoring for Event Forecasting
 */
function scoreEventForecastBasic(prediction, actualOutcome) {
  const predWords = prediction.toLowerCase().split(/\s+/);
  const outcomeWords = actualOutcome.toLowerCase().split(/\s+/);

  const matches = predWords.filter(word =>
    word.length > 3 && outcomeWords.includes(word)
  );

  const score = Math.min(100, Math.round((matches.length / Math.max(predWords.length, 10)) * 100));

  return {
    score,
    accuracy: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
    analysis: `Basic matching found ${matches.length} word overlaps.`,
    specificHits: matches.slice(0, 3),
    specificMisses: ['Detailed analysis requires AI scoring'],
    scoringMethod: 'basic',
  };
}

/**
 * Score Ganzfeld Response
 */
async function scoreGanzfeld(userResponse, targetImage) {
  // Ganzfeld is similar to remote viewing
  return scoreRemoteViewing(userResponse, targetImage);
}

/**
 * Score Synchronicity Entry
 */
async function scoreSynchronicity(description) {
  const openai = getClient();
  if (openai) {
    try {
      const prompt = `You are an expert in analyzing synchronicities and meaningful coincidences. Score the significance and meaningfulness of the reported synchronicity 0-100.

Synchronicity Report: ${description}

Provide JSON: {"score": <0-100>, "significance": "<high/medium/low>", "jungianElements": ["<element>"], "analysis": "<interpretation>"}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 400,
      });

      const text = result.choices[0].message.content;
      const parsed = parseJsonResponse(text);
      return {
        score: parsed.score,
        significance: parsed.significance,
        jungianElements: parsed.jungianElements || [],
        analysis: parsed.analysis,
        scoringMethod: 'ai',
      };
    } catch (error) {
      console.error('AI scoring error, falling back to basic:', error.message);
      return scoreSynchronicityBasic(description);
    }
  } else {
    return scoreSynchronicityBasic(description);
  }
}

/**
 * Basic fallback scoring for Synchronicity
 */
function scoreSynchronicityBasic(description) {
  const wordCount = description.split(/\s+/).length;
  const detailScore = Math.min(100, (wordCount / 30) * 100);

  return {
    score: detailScore,
    significance: detailScore > 70 ? 'high' : detailScore > 40 ? 'medium' : 'low',
    jungianElements: ['Requires AI analysis'],
    analysis: 'Basic scoring based on description detail.',
    scoringMethod: 'basic',
  };
}

module.exports = {
  scoreRemoteViewing,
  scoreTelepathy,
  scoreDreamJournal,
  scoreRNGExperiment,
  scoreCardPrediction,
  scoreEventForecast,
  scoreGanzfeld,
  scoreSynchronicity,
  isGeminiAvailable,
  isAIAvailable,
};
