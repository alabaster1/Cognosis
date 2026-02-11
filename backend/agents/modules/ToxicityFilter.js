/**
 * Toxicity Filter Module
 * Prevents engagement with conspiracy theories, pseudoscience, and harmful content
 */

const config = require('../config');
const llmHelper = require('../utils/llmHelper');

class ToxicityFilter {
  constructor() {
    this.blockedKeywords = [
      // Conspiracy theories
      'flat earth', 'chemtrails', 'illuminati', 'lizard people', 'qanon',
      'deep state conspiracy', 'new world order conspiracy', 'fake moon landing',

      // Pseudoscience
      'quantum healing crystals', 'miracle cure', 'anti-vax', 'vaccine causes autism',
      'healing frequency scam', 'medbed', 'energy vampire',

      // Medical misinformation
      'cure cancer with', 'big pharma hiding cure', 'drink bleach',
      'essential oils cure', 'homeopathy cures',

      // Harmful content
      'suicide method', 'how to harm', 'terrorist', 'bomb making',
    ];

    this.blockedHashtags = [
      '#flatearth', '#qanon', '#antivax', '#plandemic', '#chemtrails',
      '#bigpharma', '#fakenews', '#hoax', '#conspiracy', '#illuminati',
    ];

    this.suspiciousPhrases = [
      'mainstream science doesn\'t want you to know',
      'they don\'t want you to know',
      'wake up sheeple',
      'do your own research',
      'big pharma conspiracy',
      'government cover-up',
    ];
  }

  /**
   * Check if content passes toxicity filters
   * @param {string} content - The content to check
   * @returns {Object} - { safe: boolean, reason: string, confidence: number }
   */
  async checkContent(content) {
    if (!content) {
      return { safe: false, reason: 'Empty content', confidence: 1.0 };
    }

    const contentLower = content.toLowerCase();

    // Check blocked keywords
    const blockedKeyword = this.blockedKeywords.find(keyword =>
      contentLower.includes(keyword.toLowerCase())
    );
    if (blockedKeyword) {
      return {
        safe: false,
        reason: `Blocked keyword detected: "${blockedKeyword}"`,
        confidence: 1.0,
        category: 'blocked_keyword',
      };
    }

    // Check blocked hashtags
    const blockedHashtag = this.blockedHashtags.find(tag =>
      contentLower.includes(tag.toLowerCase())
    );
    if (blockedHashtag) {
      return {
        safe: false,
        reason: `Blocked hashtag: ${blockedHashtag}`,
        confidence: 1.0,
        category: 'blocked_hashtag',
      };
    }

    // Check suspicious phrases
    const suspiciousPhrase = this.suspiciousPhrases.find(phrase =>
      contentLower.includes(phrase.toLowerCase())
    );
    if (suspiciousPhrase) {
      return {
        safe: false,
        reason: `Suspicious phrase detected: "${suspiciousPhrase}"`,
        confidence: 0.9,
        category: 'suspicious_phrase',
      };
    }

    // AI-based toxicity check using OpenAI
    const aiCheck = await this.checkWithAI(content);

    return aiCheck;
  }

  /**
   * Use AI to check for subtle toxicity, pseudoscience, and misinformation
   */
  async checkWithAI(content) {
    try {
      if (!llmHelper.isAvailable()) {
        // If AI not available, pass with manual review flag
        return {
          safe: true,
          reason: 'AI check unavailable - flagged for manual review',
          confidence: 0.5,
          category: 'ai_unavailable',
          requiresManualReview: true,
        };
      }

      const systemPrompt = `You are a content safety expert for a scientific research platform. Analyze content for:
1. Conspiracy theories (flat earth, chemtrails, QAnon, etc.)
2. Pseudoscience (quantum healing, miracle cures, anti-vax)
3. Medical misinformation
4. Hate speech or toxicity
5. Harmful or dangerous content

Be especially strict about:
- Claims that "mainstream science doesn't want you to know"
- Unverified medical claims
- Anti-scientific rhetoric
- Dangerous health advice

Respond with JSON:
{
  "safe": true/false,
  "reason": "explanation",
  "confidence": 0.0-1.0,
  "category": "conspiracy|pseudoscience|misinformation|toxicity|safe",
  "concerns": ["specific concern 1", "concern 2"]
}`;

      const response = await llmHelper.chatCompletion({
        systemPrompt,
        userPrompt: `Analyze this content:\n\n${content}`,
        temperature: 0.3,
        maxTokens: 500,
      });

      const result = llmHelper.parseJsonResponse(response);

      return {
        safe: result.safe,
        reason: result.reason,
        confidence: result.confidence,
        category: result.category,
        concerns: result.concerns || [],
        method: 'ai',
      };
    } catch (error) {
      console.error('[ToxicityFilter] AI check error:', error.message);

      // Fail safe: if AI check fails, allow content but flag for manual review
      return {
        safe: true,
        reason: 'AI check unavailable - flagged for manual review',
        confidence: 0.5,
        category: 'ai_error',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Check if a tweet/post should be engaged with
   */
  async shouldEngage(tweetContent, author) {
    const contentCheck = await this.checkContent(tweetContent);

    if (!contentCheck.safe) {
      console.log(`[ToxicityFilter] Blocking engagement with tweet: ${contentCheck.reason}`);
      return {
        engage: false,
        reason: contentCheck.reason,
        confidence: contentCheck.confidence,
      };
    }

    // Additional check: is the author known for problematic content?
    // TODO: Implement author reputation tracking

    return {
      engage: true,
      reason: 'Content passed safety checks',
      confidence: contentCheck.confidence,
    };
  }

  /**
   * Filter a list of tweets/posts for safe engagement
   */
  async filterFeed(posts) {
    const safePosts = [];

    for (const post of posts) {
      const check = await this.checkContent(post.content);
      if (check.safe) {
        safePosts.push({
          ...post,
          safetyCheck: check,
        });
      } else {
        console.log(`[ToxicityFilter] Filtered out post: ${check.reason}`);
      }
    }

    return safePosts;
  }

  /**
   * Check if content contains religious or political debates
   * (which we want to avoid per the architecture)
   */
  isReligiousOrPolitical(content) {
    const contentLower = content.toLowerCase();

    const religiousKeywords = [
      'god is', 'atheism', 'christianity debate', 'islam debate',
      'religious war', 'faith vs science', 'bible proves', 'quran says',
    ];

    const politicalKeywords = [
      'democrat', 'republican', 'liberal', 'conservative',
      'left wing', 'right wing', 'election fraud', 'stolen election',
      'trump', 'biden', 'political party',
    ];

    const hasReligious = religiousKeywords.some(keyword =>
      contentLower.includes(keyword)
    );
    const hasPolitical = politicalKeywords.some(keyword =>
      contentLower.includes(keyword)
    );

    return {
      isReligious: hasReligious,
      isPolitical: hasPolitical,
      shouldAvoid: hasReligious || hasPolitical,
    };
  }

  /**
   * Get statistics on filtered content
   */
  getStats() {
    // TODO: Implement statistics tracking
    return {
      totalChecked: 0,
      blocked: 0,
      byCategory: {},
    };
  }
}

module.exports = ToxicityFilter;
