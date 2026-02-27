/**
 * Prediction Scoring Service
 * AI-powered scoring for precognition and prediction experiments using OpenAI
 */

const OpenAI = require('openai');

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

class PredictionScoringService {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  parseJsonResponse(text) {
    let content = text.trim();
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    return JSON.parse(content);
  }

  summarizeAxiosError(error) {
    if (!error) return 'Unknown error';
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const responseData = error.response?.data;
    const code = error.code;
    const message = error.message || 'Request failed';

    const dataText = responseData
      ? (typeof responseData === 'string' ? responseData : JSON.stringify(responseData))
      : '';

    const parts = [message];
    if (code) parts.push(`code=${code}`);
    if (status) parts.push(`status=${status}${statusText ? ` ${statusText}` : ''}`);
    if (dataText) parts.push(`data=${dataText.substring(0, 300)}`);
    return parts.join(' | ');
  }

  scoreRemoteViewingBasic(impressions, targetData) {
    const userText = typeof impressions === 'string'
      ? impressions
      : (impressions?.impressions || JSON.stringify(impressions || {}));
    const targetText = [
      targetData?.description || '',
      ...(Array.isArray(targetData?.tags) ? targetData.tags : []),
    ].join(' ');

    const userWords = userText
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4);
    const targetWords = new Set(
      targetText
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 4)
    );

    const correspondences = [...new Set(userWords.filter((w) => targetWords.has(w)))];
    const baseline = 35;
    const score = Math.min(85, baseline + correspondences.length * 8);

    return {
      score,
      scoringMethod: 'deterministic-fallback',
      details: {
        scores: {
          overall_score: score / 100,
          semantic_similarity: correspondences.length ? 0.5 : 0.35,
          structural_alignment: correspondences.length ? 0.55 : 0.4,
          confidence: 0.4,
        },
        statisticalContext: 'Deterministic fallback used (keyword overlap)',
        analysis: correspondences.length
          ? `Found ${correspondences.length} keyword correspondences with target metadata.`
          : 'No strong keyword overlap; fallback baseline score applied.',
        correspondences,
        mismatches: [],
        scorerVersion: 'fallback-basic-v1',
        durationMs: 0,
      },
    };
  }

  async scoreRemoteViewingWithOpenAI(impressions, targetData) {
    const openai = this.getClient();
    const impressionText = typeof impressions === 'string'
      ? impressions
      : (impressions?.impressions || JSON.stringify(impressions || {}));

    const prompt = `You are an expert remote viewing evaluator.
Score the participant impressions against the target metadata.

TARGET DESCRIPTION:
${targetData?.description || ''}

TARGET TAGS:
${JSON.stringify(targetData?.tags || [])}

PARTICIPANT IMPRESSIONS:
${impressionText}

Return JSON only:
{
  "overallScore": <integer 0-100>,
  "analysis": "<brief technical analysis>",
  "correspondences": ["<matching element>"],
  "mismatches": ["<missing/incorrect element>"]
}`;

    const result = await openai.chat.completions.create({
      model: process.env.OPENAI_SCORING_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    const parsed = this.parseJsonResponse(result.choices[0].message.content || '{}');
    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.overallScore) || 0)));

    return {
      score,
      scoringMethod: 'openai-fallback',
      details: {
        scores: {
          overall_score: score / 100,
        },
        statisticalContext: 'OpenAI fallback scoring (AI service unavailable)',
        analysis: parsed.analysis || 'OpenAI fallback analysis',
        correspondences: Array.isArray(parsed.correspondences) ? parsed.correspondences : [],
        mismatches: Array.isArray(parsed.mismatches) ? parsed.mismatches : [],
        scorerVersion: 'openai-fallback-v1',
        durationMs: 0,
      },
    };
  }

  /**
   * Score precognition predictions against actual events
   * @param {string} prediction - User's prediction made before the event
   * @param {string} actualOutcome - Actual outcome that occurred
   * @param {string} verificationEvidence - Evidence/context for verification
   * @returns {Object} Scoring results with hits, misses, and feedback
   */
  async scorePrecognition(prediction, actualOutcome, verificationEvidence) {
    const prompt = `You are an expert precognition evaluator with rigorous scientific standards. You assess predictions objectively, distinguishing between specific accurate predictions and vague general statements.

Evaluate this precognition prediction with strict accuracy standards:

PREDICTION (made before event):
${prediction}

ACTUAL OUTCOME:
${actualOutcome}

VERIFICATION EVIDENCE:
${verificationEvidence}

Analyze the accuracy and provide detailed scoring:
1. Overall accuracy score (0-100, where 50 is chance baseline)
2. Specific hits (correct elements with high confidence)
3. Specific misses (incorrect or missing elements)
4. Constructive feedback

Be rigorous - only score as "hit" if there's clear, specific correspondence.
Vague or generic predictions should score near baseline (50).

Return as JSON with this exact structure:
{
  "overallScore": <number 0-100>,
  "accuracy": "<exceptional|good|fair|poor>",
  "hits": [
    {
      "element": "<specific prediction element>",
      "confidence": "<high|medium|low>",
      "explanation": "<why this counts as a hit>"
    }
  ],
  "misses": [
    {
      "element": "<specific prediction element>",
      "importance": "<high|medium|low>",
      "explanation": "<why this was incorrect or missing>"
    }
  ],
  "feedback": "<constructive feedback for improvement>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "areasForImprovement": ["<area 1>", "<area 2>"]
}

Return ONLY valid JSON without markdown code blocks.`;

    try {
      const openai = this.getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return this.parseJsonResponse(result.choices[0].message.content);
    } catch (error) {
      console.error('[PredictionScoring] Error scoring precognition:', error);
      throw new Error(`Failed to score precognition: ${error.message}`);
    }
  }

  /**
   * Score event forecasting predictions
   * @param {string} prediction - User's forecast
   * @param {string} actualEvents - What actually happened
   * @param {string} dateRange - Time period covered
   * @returns {Object} Scoring results
   */
  async scoreEventForecasting(prediction, actualEvents, dateRange) {
    const prompt = `You are an expert in evaluating predictive accuracy for future events. You assess both the correctness and specificity of predictions, distinguishing meaningful hits from chance correspondence.

Evaluate this event forecasting prediction:

FORECAST (made in advance):
${prediction}

TIME PERIOD: ${dateRange}

ACTUAL EVENTS:
${actualEvents}

Assess accuracy with these criteria:
1. Correct specific events predicted
2. Timing accuracy (if applicable)
3. Details accuracy (people, places, scale)
4. Overall predictive value

Return JSON:
{
  "overallScore": <number 0-100>,
  "accuracy": "<exceptional|good|fair|poor>",
  "hits": [{
    "event": "<predicted event>",
    "match": "<actual event>",
    "timingAccuracy": "<exact|approximate|off>",
    "detailsAccuracy": "<high|medium|low>",
    "explanation": "<analysis>"
  }],
  "misses": [{
    "event": "<predicted but didn't occur>",
    "explanation": "<why this was incorrect>"
  }],
  "feedback": "<improvement suggestions>",
  "statisticalSignificance": "<p-value or significance assessment>"
}

Return ONLY valid JSON without markdown code blocks.`;

    try {
      const openai = this.getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      });

      return this.parseJsonResponse(result.choices[0].message.content);
    } catch (error) {
      console.error('[PredictionScoring] Error scoring event forecasting:', error);
      throw new Error(`Failed to score event forecasting: ${error.message}`);
    }
  }

  /**
   * Score dream journal predictions
   * @param {string} dreamContent - Dream description
   * @param {string} actualEvents - Events that occurred after the dream
   * @param {string} dreamDate - When the dream occurred
   * @returns {Object} Scoring results
   */
  async scoreDreamJournal(dreamContent, actualEvents, dreamDate) {
    const prompt = `You are an expert in dream analysis and precognitive dream evaluation. You assess potential correspondences between dream content and subsequent events, distinguishing meaningful patterns from coincidence.

Evaluate this dream for precognitive elements:

DREAM (recorded ${dreamDate}):
${dreamContent}

SUBSEQUENT EVENTS:
${actualEvents}

Analyze for:
1. Symbolic or literal correspondences
2. Specificity of dream elements matching reality
3. Temporal accuracy
4. Probability of chance vs meaningful correlation

Return JSON:
{
  "overallScore": <number 0-100>,
  "accuracy": "<exceptional|good|fair|poor>",
  "correspondences": [{
    "dreamElement": "<element from dream>",
    "realEvent": "<matching real event>",
    "type": "<literal|symbolic|thematic>",
    "confidence": "<high|medium|low>",
    "explanation": "<analysis>"
  }],
  "nonMatches": [{
    "dreamElement": "<element without match>",
    "explanation": "<why no correspondence>"
  }],
  "feedback": "<interpretation and suggestions>",
  "precognitiveValue": "<high|medium|low|none>"
}

Return ONLY valid JSON without markdown code blocks.`;

    try {
      const openai = this.getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      });

      return this.parseJsonResponse(result.choices[0].message.content);
    } catch (error) {
      console.error('[PredictionScoring] Error scoring dream journal:', error);
      throw new Error(`Failed to score dream journal: ${error.message}`);
    }
  }

  /**
   * Score telepathy experiment
   * @param {string} senderThoughts - What the sender was thinking
   * @param {string} receiverResponse - What the receiver perceived
   * @param {Object} metadata - Experiment metadata
   * @returns {Object} Scoring results
   */
  async scoreTelepathy(senderThoughts, receiverResponse, metadata = {}) {
    const prompt = `You are an expert in telepathy research and psi experiments. You evaluate thought transmission accuracy using rigorous standards, assessing both direct and semantic correspondences.

Evaluate this telepathy experiment:

SENDER'S THOUGHTS/TARGET:
${senderThoughts}

RECEIVER'S RESPONSE:
${receiverResponse}

METADATA: ${JSON.stringify(metadata)}

Assess:
1. Direct matches (specific words/concepts)
2. Thematic/semantic alignment
3. Emotional/contextual correspondence
4. Overall accuracy vs chance

Return JSON:
{
  "overallScore": <number 0-100>,
  "accuracy": "<exceptional|good|fair|poor>",
  "directMatches": [{
    "element": "<matched element>",
    "confidence": "<high|medium|low>",
    "explanation": "<analysis>"
  }],
  "thematicAlignment": [{
    "theme": "<theme>",
    "strength": "<strong|moderate|weak>",
    "explanation": "<analysis>"
  }],
  "misses": [{
    "element": "<element that didn't match>",
    "explanation": "<why>"
  }],
  "feedback": "<suggestions for improvement>",
  "statisticalSignificance": "<assessment>"
}

Return ONLY valid JSON without markdown code blocks.`;

    try {
      const openai = this.getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return this.parseJsonResponse(result.choices[0].message.content);
    } catch (error) {
      console.error('[PredictionScoring] Error scoring telepathy:', error);
      throw new Error(`Failed to score telepathy: ${error.message}`);
    }
  }

  /**
   * Score global consciousness event correlation
   * @param {string} prediction - User's prediction about global event
   * @param {Object} globalData - Global consciousness network data
   * @param {string} actualEvent - Actual global event
   * @returns {Object} Scoring results
   */
  async scoreGlobalConsciousness(prediction, globalData, actualEvent) {
    const prompt = `You are an expert in global consciousness research and collective phenomena. You evaluate correlations between individual predictions and global events/data patterns.

Evaluate this global consciousness prediction:

PREDICTION:
${prediction}

GLOBAL CONSCIOUSNESS DATA:
${JSON.stringify(globalData, null, 2)}

ACTUAL GLOBAL EVENT:
${actualEvent}

Assess:
1. Correlation between prediction and event
2. Timing accuracy
3. Global significance alignment
4. Data pattern correspondence

Return JSON:
{
  "overallScore": <number 0-100>,
  "accuracy": "<exceptional|good|fair|poor>",
  "correlations": [{
    "aspect": "<aspect of prediction>",
    "dataSupport": "<how data supports it>",
    "strength": "<strong|moderate|weak>",
    "explanation": "<analysis>"
  }],
  "timing": {
    "predicted": "<when predicted>",
    "actual": "<when occurred>",
    "accuracy": "<exact|approximate|off>"
  },
  "feedback": "<analysis and suggestions>",
  "globalSignificance": "<high|medium|low>"
}

Return ONLY valid JSON without markdown code blocks.`;

    try {
      const openai = this.getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return this.parseJsonResponse(result.choices[0].message.content);
    } catch (error) {
      console.error('[PredictionScoring] Error scoring global consciousness:', error);
      throw new Error(`Failed to score global consciousness: ${error.message}`);
    }
  }
  /**
   * Score remote viewing session using PsiScoreAI multi-dimensional analysis
   * Calls the AI service at /rv/score with blinded data (no user context)
   * @param {string} sessionId - Session identifier
   * @param {Object} impressions - Participant's impressions (description, sensory data, etc.)
   * @param {Object} targetData - Target information (description, imageUrl, tags, etc.)
   * @param {string} targetHash - Commitment hash of the target
   * @returns {Object} { score: 0-100, details: { scores, analysis, correspondences, mismatches } }
   */
  async scoreRemoteViewing(sessionId, impressions, targetData, targetHash) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/rv/score`, {
        session_id: sessionId,
        user_id: 'blinded',  // Scientific blinding: no user identity sent
        impressions,
        target_data: targetData,
        target_hash: targetHash,
      }, { timeout: 30000 });

      const result = response.data;

      // overall_score is 0.0-1.0 from PsiScoreAI, scale to 0-100 integer for on-chain
      const overallFloat = result.scores?.overall_score ?? 0;
      const score = Math.min(100, Math.max(0, Math.round(overallFloat * 100)));

      return {
        score,
        scoringMethod: 'psi-score-ai',
        details: {
          scores: result.scores,
          statisticalContext: result.statistical_context,
          analysis: result.detailed_analysis,
          correspondences: result.correspondences,
          mismatches: result.mismatches,
          scorerVersion: result.scorer_version,
          durationMs: result.duration_ms,
        },
      };
    } catch (error) {
      const detail = this.summarizeAxiosError(error);
      console.warn('[PredictionScoring] RV scoring service unavailable:', detail);

      // First fallback: use direct OpenAI scoring if API key is available.
      try {
        return await this.scoreRemoteViewingWithOpenAI(impressions, targetData);
      } catch (openAiError) {
        const openAiMessage = openAiError?.message || 'OpenAI fallback failed';
        console.warn('[PredictionScoring] OpenAI fallback unavailable:', openAiMessage);
      }

      // Final fallback: deterministic keyword baseline (never throws).
      return this.scoreRemoteViewingBasic(impressions, targetData);
    }
  }

  /**
   * Score image-based experiments using CLIP similarity and Psi-Coefficient
   * @param {string} targetImageUrl - URL/CID of the target image
   * @param {string} choiceImageUrl - URL/CID of the user's chosen image
   * @param {string[]} distractorImageUrls - URLs of distractor images
   * @returns {Object} Psi-Coefficient scoring results
   */
  async scorePsiCoefficient(targetImageUrl, choiceImageUrl, distractorImageUrls) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/score/psi-coefficient`, {
        target_image_url: targetImageUrl,
        response_image_url: choiceImageUrl,
        distractor_image_urls: distractorImageUrls,
      });
      return response.data;
    } catch (error) {
      console.error('[PredictionScoring] Psi-Coefficient error:', error.message);
      throw new Error(`Failed to calculate Psi-Coefficient: ${error.message}`);
    }
  }

  /**
   * Score image similarity using CLIP vectors
   * @param {string} targetImageUrl - Target image URL
   * @param {string} choiceImageUrl - User's chosen image URL
   * @param {string[]} distractorImageUrls - Optional distractor URLs
   * @returns {Object} CLIP similarity scores
   */
  async scoreImageSimilarity(targetImageUrl, choiceImageUrl, distractorImageUrls = null) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/score/image-similarity`, {
        target_image_url: targetImageUrl,
        choice_image_url: choiceImageUrl,
        distractor_image_urls: distractorImageUrls,
      });
      return response.data;
    } catch (error) {
      console.error('[PredictionScoring] Image similarity error:', error.message);
      throw new Error(`Failed to score image similarity: ${error.message}`);
    }
  }
}

module.exports = new PredictionScoringService();
