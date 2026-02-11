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
