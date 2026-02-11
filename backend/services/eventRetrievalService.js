const OpenAI = require('openai');
const axios = require('axios');

/**
 * Event Retrieval Service - AI-Powered with Web Grounding
 *
 * MULTI-TIER APPROACH:
 * 1. Web-Grounded AI (Perplexity) - Real-time web search with citations
 * 2. OpenAI - Knowledge base retrieval as fallback
 * 3. Mock events - Development fallback
 *
 * This ensures we get REAL, VERIFIABLE events with sources.
 */

class EventRetrievalService {
  constructor() {
    this.openai = null;
    this.perplexity = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize Perplexity (web-grounded, real-time)
    if (process.env.PERPLEXITY_API_KEY) {
      this.perplexity = {
        apiKey: process.env.PERPLEXITY_API_KEY,
        endpoint: 'https://api.perplexity.ai/chat/completions'
      };
      console.log('✓ Perplexity AI initialized (web-grounded search)');
    }

    // Initialize OpenAI (fallback)
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log('✓ OpenAI initialized (knowledge base fallback)');
    }

    if (!this.perplexity && !this.openai) {
      console.warn('[Event Retrieval] No AI services configured. Using mock events.');
    }

    this.initialized = true;
  }

  parseJsonResponse(text) {
    let content = text.trim();
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    return JSON.parse(content);
  }

  /**
   * Retrieve real-world events for a given time window
   *
   * @param {Object} params
   * @param {Date} params.startDate - Start of event window
   * @param {Date} params.endDate - End of event window
   * @param {string} params.predictionContext - User's prediction for context
   * @param {Array<string>} params.categories - Event categories (news, sports, weather, etc.)
   * @returns {Promise<Object>} Structured event data
   */
  async queryEvents({ startDate, endDate, predictionContext = '', categories = ['news', 'sports', 'weather'] }) {
    await this.initialize();

    // TIER 1: Try Perplexity (web-grounded with citations)
    if (this.perplexity) {
      try {
        return await this.queryWithPerplexity({ startDate, endDate, predictionContext, categories });
      } catch (error) {
        console.error('[Event Retrieval] Perplexity failed, falling back to OpenAI:', error.message);
      }
    }

    // TIER 2: Try OpenAI (knowledge base)
    if (this.openai) {
      try {
        return await this.queryWithOpenAI({ startDate, endDate, predictionContext, categories });
      } catch (error) {
        console.error('[Event Retrieval] OpenAI failed, falling back to mock:', error.message);
      }
    }

    // TIER 3: Mock events
    return this.getMockEvents(startDate, endDate);
  }

  /**
   * Query using Perplexity (web-grounded, real-time)
   */
  async queryWithPerplexity({ startDate, endDate, predictionContext, categories }) {
    const dateRange = this.formatDateRange(startDate, endDate);

    const response = await axios.post(
      this.perplexity.endpoint,
      {
        model: 'llama-3.1-sonar-large-128k-online', // Web-connected model
        messages: [
          {
            role: 'system',
            content: 'You are a factual event retrieval system with web access. Search for real, verifiable events with citations. Be specific with dates, names, and details.'
          },
          {
            role: 'user',
            content: `Search the web for real events that occurred during ${dateRange}.

${predictionContext ? `Context: User predicted "${predictionContext}". Find events that might relate.` : ''}

Categories: ${categories.join(', ')}

Return JSON with this structure:
{
  "events": [
    {
      "title": "Event headline",
      "description": "Detailed description with specifics",
      "date": "YYYY-MM-DD",
      "category": "news|sports|weather|etc",
      "source": "Source name or URL",
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "summary": "Brief summary of major events",
  "citations": ["Source 1", "Source 2"]
}`
          }
        ],
        temperature: 0.2,
        return_citations: true,
        return_images: false
      },
      {
        headers: {
          'Authorization': `Bearer ${this.perplexity.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const result = JSON.parse(content);
    const citations = response.data.citations || result.citations || [];

    return {
      events: this.normalizeEvents(result.events || []),
      summary: result.summary || 'Web search completed',
      dateRange,
      retrievalMethod: 'perplexity_web_search',
      citations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Query using OpenAI (knowledge base fallback)
   */
  async queryWithOpenAI({ startDate, endDate, predictionContext, categories }) {
    const dateRange = this.formatDateRange(startDate, endDate);

    const prompt = `You are a knowledge retrieval agent for psi research. Retrieve real-world events that occurred during a specific time period.

Retrieve real-world events for ${dateRange}.

${predictionContext ? `Context: "${predictionContext}"` : ''}
Categories: ${categories.join(', ')}

Return JSON: {"events": [{"category": "...", "title": "...", "description": "...", "date": "YYYY-MM-DD"}], "summary": "..."}

Return ONLY valid JSON without markdown code blocks.`;

    const result = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const parsed = this.parseJsonResponse(result.choices[0].message.content);

    return {
      events: this.normalizeEvents(parsed.events || []),
      summary: parsed.summary || 'No summary available',
      dateRange,
      retrievalMethod: 'openai_knowledge',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Query specific event types with more targeted prompts
   */
  async querySpecificEvents({ startDate, endDate, eventType, keywords = [] }) {
    await this.initialize();

    if (!this.openai) {
      return this.getMockEvents(startDate, endDate);
    }

    const prompts = {
      news: 'major news headlines, political events, international developments',
      sports: 'sports results, championships, records, major games',
      weather: 'significant weather events, storms, temperature records, natural disasters',
      markets: 'stock market movements, economic news, company announcements',
      celebrity: 'celebrity news, entertainment events, awards, releases',
      science: 'scientific discoveries, space missions, technology breakthroughs',
      trends: 'viral trends, social media phenomena, cultural moments'
    };

    const prompt_context = prompts[eventType] || 'notable events';
    const keywordContext = keywords.length > 0 ? ` Focus on events related to: ${keywords.join(', ')}.` : '';

    try {
      const dateRange = this.formatDateRange(startDate, endDate);

      const prompt = `You are a factual event retrieval system. Provide only verifiable real-world events with specific details.

List ${prompt_context} from ${dateRange}.${keywordContext}

Provide JSON:
{
  "events": [
    {
      "title": "Event headline",
      "description": "Detailed description",
      "date": "YYYY-MM-DD",
      "specifics": ["specific detail 1", "specific detail 2"]
    }
  ]
}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1500,
      });

      const parsed = this.parseJsonResponse(result.choices[0].message.content);

      return {
        events: this.normalizeEvents(parsed.events || [], eventType),
        eventType,
        dateRange,
        keywords,
        retrievalMethod: 'openai_targeted'
      };
    } catch (error) {
      console.error('[Event Retrieval] Targeted query error:', error);
      return { events: [], eventType, dateRange, keywords };
    }
  }

  /**
   * Verify if a specific prediction matches any real events
   */
  async verifyPrediction({ prediction, startDate, endDate }) {
    await this.initialize();

    if (!this.openai) {
      return { verified: false, matches: [], confidence: 0 };
    }

    try {
      const dateRange = this.formatDateRange(startDate, endDate);

      const prompt = `You are a prediction verification system. Compare predictions with actual events and identify matches.

Prediction: "${prediction}"
Time Period: ${dateRange}

Did any real-world events match this prediction? Provide JSON:
{
  "verified": true/false,
  "matches": [
    {
      "event": "Description of matching event",
      "matchType": "exact|partial|thematic|coincidental",
      "confidence": 0-100,
      "specifics": ["what matched specifically"]
    }
  ],
  "overallConfidence": 0-100,
  "explanation": "Brief explanation of verification result"
}

Return ONLY valid JSON without markdown code blocks.`;

      const result = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const parsed = this.parseJsonResponse(result.choices[0].message.content);

      return {
        verified: parsed.verified || false,
        matches: parsed.matches || [],
        confidence: parsed.overallConfidence || 0,
        explanation: parsed.explanation || '',
        verificationMethod: 'openai_verification'
      };
    } catch (error) {
      console.error('[Event Retrieval] Verification error:', error);
      return { verified: false, matches: [], confidence: 0 };
    }
  }

  /**
   * Normalize event structure
   */
  normalizeEvents(events, defaultCategory = 'general') {
    return events.map(event => ({
      category: event.category || defaultCategory,
      title: event.title || '',
      description: event.description || '',
      date: event.date || new Date().toISOString().split('T')[0],
      source: event.source || 'openai_knowledge',
      significance: event.significance || 'medium',
      keywords: event.keywords || event.specifics || [],
      specifics: event.specifics || []
    }));
  }

  /**
   * Format date range for prompts
   */
  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    if (start.toDateString() === end.toDateString()) {
      return formatDate(start);
    }

    return `${formatDate(start)} to ${formatDate(end)}`;
  }

  /**
   * Mock events for development/fallback
   */
  getMockEvents(startDate, endDate) {
    const dateRange = this.formatDateRange(startDate, endDate);

    return {
      events: [
        {
          category: 'news',
          title: 'Mock Event - Major Political Development',
          description: 'Significant political event occurred during this period.',
          date: new Date(startDate).toISOString().split('T')[0],
          source: 'mock',
          significance: 'high',
          keywords: ['politics', 'government', 'international']
        },
        {
          category: 'sports',
          title: 'Mock Event - Championship Game',
          description: 'Major sports championship took place.',
          date: new Date(startDate).toISOString().split('T')[0],
          source: 'mock',
          significance: 'medium',
          keywords: ['sports', 'championship', 'competition']
        },
        {
          category: 'weather',
          title: 'Mock Event - Weather Pattern',
          description: 'Notable weather event in major city.',
          date: new Date(startDate).toISOString().split('T')[0],
          source: 'mock',
          significance: 'medium',
          keywords: ['weather', 'climate', 'temperature']
        }
      ],
      summary: 'Mock events generated for development/testing',
      dateRange,
      retrievalMethod: 'mock',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new EventRetrievalService();
