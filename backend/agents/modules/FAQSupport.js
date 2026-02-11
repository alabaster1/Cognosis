/**
 * FAQ/Support Agent
 * Automated responses to common questions
 * Escalates to human when confidence is low
 */

const config = require('../config');
const llmHelper = require('../utils/llmHelper');
const { getVectorStore } = require('../utils/vectorStore');

class FAQSupport {
  constructor() {
    this.config = config.agents.faqSupport;
    this.vectorStore = null;
    this.stats = {
      questionsAnswered: 0,
      escalatedToHuman: 0,
      lastResponse: null,
      byCategory: {},
    };

    // Common FAQ database
    this.faqDatabase = {
      technical_issues: [
        {
          question: 'Why is my session not loading?',
          answer: 'Try refreshing the page or clearing your browser cache. If the issue persists, check your internet connection or try a different browser.',
          keywords: ['loading', 'not working', 'stuck', 'frozen', 'hang'],
        },
        {
          question: 'How do I connect my Midnight wallet?',
          answer: 'Click "Connect Wallet" in the header, then select your Midnight-compatible wallet from the options. Make sure you have the wallet extension installed.',
          keywords: ['wallet', 'connect', 'midnight', 'login'],
        },
      ],
      experiment_instructions: [
        {
          question: 'How do Remote Viewing sessions work?',
          answer: 'Remote Viewing follows 6 CRV stages. You record impressions without seeing the target, then the target is revealed after your commitment is locked on-chain. See /help for detailed instructions.',
          keywords: ['remote viewing', 'crv', 'how to', 'instructions', 'stages'],
        },
        {
          question: 'What is session calibration?',
          answer: 'Before each experiment, we ask about your current state (sleep, mood, focus). This helps control for variables that affect performance. You can skip it, but we recommend completing it.',
          keywords: ['calibration', 'survey', 'mood', 'sleep', 'before experiment'],
        },
      ],
      privacy_questions: [
        {
          question: 'Is my data private?',
          answer: 'Yes! All responses are encrypted client-side before storage. Only you and the AI scoring service can decrypt your data. We use Midnight blockchain for tamper-proof commitments while maintaining privacy.',
          keywords: ['privacy', 'data', 'encryption', 'secure', 'anonymous'],
        },
        {
          question: 'Who can see my experiment results?',
          answer: 'Only you can see your individual results. We publish aggregated, anonymized statistics for research, but never individual data.',
          keywords: ['results', 'see', 'public', 'privacy', 'who'],
        },
      ],
      token_system: [
        {
          question: 'How do I earn tokens?',
          answer: 'You earn tokens by completing experiments (10 per session), maintaining daily streaks (+25 every 5 days), achieving high accuracy (+5-20 bonus), and unlocking achievements (5-50 tokens each).',
          keywords: ['tokens', 'earn', 'rewards', 'how'],
        },
        {
          question: 'What can I do with tokens?',
          answer: 'Currently, tokens are participation rewards. Future features will allow token redemption for advanced experiments, premium insights, and exclusive access.',
          keywords: ['tokens', 'use', 'spend', 'redeem', 'what'],
        },
      ],
      baseline_profile: [
        {
          question: 'Why do I need a baseline profile?',
          answer: 'Your baseline captures stable characteristics (age, handedness, experience) that help us control for individual differences in research. It updates every 90 days.',
          keywords: ['baseline', 'profile', 'survey', 'why'],
        },
      ],
      scoring_methodology: [
        {
          question: 'How is my accuracy calculated?',
          answer: 'We use AI-powered semantic analysis (CLIP embeddings) to compare your impressions with the target across sensory, spatial, and emotional dimensions. Scores reflect similarity, not just exact matches.',
          keywords: ['accuracy', 'score', 'calculated', 'how', 'ai'],
        },
        {
          question: 'What is a good accuracy score?',
          answer: 'Chance is 25% for 4-choice experiments. Scores above 30% are promising, 40%+ is good, and 50%+ is excellent. Even small effects above chance are scientifically interesting!',
          keywords: ['good score', 'accuracy', 'what', 'chance'],
        },
      ],
    };
  }

  /**
   * Initialize vector store for FAQ retrieval
   */
  async initialize() {
    if (!this.vectorStore) {
      this.vectorStore = getVectorStore();
      await this.vectorStore.initialize();

      // Index FAQ database if not already indexed
      await this.indexFAQs();
    }
  }

  /**
   * Index all FAQs into vector store
   */
  async indexFAQs() {
    for (const [category, faqs] of Object.entries(this.faqDatabase)) {
      for (const faq of faqs) {
        const docId = `faq_${category}_${faq.question.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const text = `Q: ${faq.question}\nA: ${faq.answer}\nKeywords: ${faq.keywords.join(', ')}`;

        await this.vectorStore.addDocument(docId, text, { category, type: 'faq' });
      }
    }

    await this.vectorStore.saveToFile();
    console.log('[FAQSupport] FAQ database indexed');
  }

  /**
   * Answer a user question
   * @param {string} question - User's question
   * @param {Object} context - Optional context (userId, platform, etc.)
   * @returns {Promise<Object>} Answer with confidence and metadata
   */
  async answerQuestion(question, context = {}) {
    try {
      await this.initialize();

      // Search for relevant FAQs
      const relevantFAQs = await this.vectorStore.search(question, 3, { type: 'faq' });

      if (relevantFAQs.length === 0) {
        return this.escalateToHuman(question, 'No relevant FAQs found');
      }

      // Get top match
      const topMatch = relevantFAQs[0];
      const confidence = topMatch.score;

      // If confidence is too low, escalate
      if (confidence < this.config.confidenceThreshold) {
        return this.escalateToHuman(question, `Low confidence (${confidence.toFixed(2)})`);
      }

      // Extract category
      const category = topMatch.metadata.category;

      // Generate response using AI (optional enhancement)
      const response = await this.generateResponse(question, relevantFAQs);

      // Update stats
      this.stats.questionsAnswered++;
      this.stats.lastResponse = new Date().toISOString();
      this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;

      return {
        success: true,
        answer: response.answer,
        confidence,
        category,
        relatedFAQs: relevantFAQs.slice(1).map(faq => ({
          question: this.extractQuestion(faq.text),
          category: faq.metadata.category,
        })),
        requiresApproval: this.config.requireApproval,
        autoPost: this.config.autoPost && confidence >= this.config.confidenceThreshold,
      };
    } catch (error) {
      console.error('[FAQSupport] Answer error:', error);
      return this.escalateToHuman(question, `Error: ${error.message}`);
    }
  }

  /**
   * Generate enhanced response using AI
   */
  async generateResponse(question, relevantFAQs) {
    const faqContext = relevantFAQs
      .map(faq => faq.text)
      .join('\n\n');

    try {
      if (!llmHelper.isAvailable()) {
        // Return the raw FAQ answer
        return {
          answer: this.extractAnswer(relevantFAQs[0].text),
          source: 'faq_direct',
        };
      }

      const systemPrompt = `You are a helpful support agent for a psi research platform. Answer the user's question based on the FAQ context provided.

**Instructions:**
- Be ${this.config.persona.tone}
- Use a ${this.config.persona.voice} voice
- Keep answers concise (2-3 sentences)
- Include relevant links when helpful (e.g., /help, /settings)
- If the FAQs don't fully answer the question, acknowledge limitations`;

      const userPrompt = `**User Question:**
${question}

**Relevant FAQs:**
${faqContext}

Provide a clear, direct answer:`;

      const response = await llmHelper.chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 512,
      });

      return {
        answer: response.trim(),
        source: 'ai_enhanced',
      };
    } catch (error) {
      console.error('[FAQSupport] AI generation error:', error.message);
      return {
        answer: this.extractAnswer(relevantFAQs[0].text),
        source: 'faq_fallback',
      };
    }
  }

  /**
   * Extract answer from FAQ text
   */
  extractAnswer(text) {
    const match = text.match(/A: (.+?)(\n|$)/);
    return match ? match[1] : text.substring(0, 200);
  }

  /**
   * Escalate to human support
   */
  escalateToHuman(question, reason) {
    this.stats.escalatedToHuman++;

    return {
      success: false,
      escalated: true,
      reason,
      message: "Thanks for your question! I'll connect you with our support team for a detailed answer. You can also check /help for tutorials.",
      question,
      suggestedAction: 'contact_support',
    };
  }

  /**
   * Extract question from FAQ text
   */
  extractQuestion(text) {
    const match = text.match(/Q: (.+?)\n/);
    return match ? match[1] : text.substring(0, 100);
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      questionsAnswered: this.stats.questionsAnswered,
      escalatedToHuman: this.stats.escalatedToHuman,
      escalationRate: this.stats.questionsAnswered > 0
        ? (this.stats.escalatedToHuman / (this.stats.questionsAnswered + this.stats.escalatedToHuman)) * 100
        : 0,
      lastResponse: this.stats.lastResponse,
      byCategory: this.stats.byCategory,
      enabled: this.config.enabled,
      autoPost: this.config.autoPost,
    };
  }

  /**
   * Add new FAQ to database
   */
  async addFAQ(category, question, answer, keywords) {
    if (!this.faqDatabase[category]) {
      this.faqDatabase[category] = [];
    }

    this.faqDatabase[category].push({ question, answer, keywords });

    // Re-index
    if (this.vectorStore) {
      await this.indexFAQs();
    }

    return { success: true, category, question };
  }
}

module.exports = FAQSupport;
