/**
 * Community Highlights Agent
 * Generates anonymized, aggregated milestone posts
 * Celebrates community progress while respecting privacy
 */

const config = require('../config');
const llmHelper = require('../utils/llmHelper');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class CommunityHighlights {
  constructor() {
    this.config = config.agents.communityHighlights;
    this.stats = {
      postsGenerated: 0,
      lastGenerated: null,
    };
  }

  /**
   * Generate a community highlights post from aggregated data
   * @param {Object} options - Optional filters (timeWindow, experimentType)
   * @returns {Promise<Object>} Generated post with metadata
   */
  async generateHighlight(options = {}) {
    try {
      const { timeWindow = '7d' } = options;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = parseInt(timeWindow);
      startDate.setDate(startDate.getDate() - days);

      // Fetch aggregated data from database
      const aggregatedData = await this.fetchAggregatedData(startDate, endDate);

      // Check if we meet minimum activity threshold
      if (aggregatedData.totalSessions < this.config.minimumSessionsForPost) {
        return {
          success: false,
          reason: `Insufficient activity (${aggregatedData.totalSessions} < ${this.config.minimumSessionsForPost})`,
        };
      }

      // Generate post using AI
      const post = await this.generatePostWithAI(aggregatedData, timeWindow);

      // Update stats
      this.stats.postsGenerated++;
      this.stats.lastGenerated = new Date().toISOString();

      return {
        success: true,
        post,
        aggregatedData,
        requiresApproval: this.config.requireApproval,
        metadata: {
          timeWindow,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sessionCount: aggregatedData.totalSessions,
          participantCount: aggregatedData.uniqueParticipants,
        },
      };
    } catch (error) {
      console.error('[CommunityHighlights] Generation error:', error);
      throw error;
    }
  }

  /**
   * Fetch aggregated, anonymized data from database
   * NO personal identifiable information included
   */
  async fetchAggregatedData(startDate, endDate) {
    try {
      // Total sessions in timeframe
      const sessions = await prisma.experimentSession.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'completed',
        },
        select: {
          id: true,
          userId: true,
          experimentType: true,
          finalScore: true,
          createdAt: true,
        },
      });

      // Aggregate statistics
      const totalSessions = sessions.length;
      const uniqueParticipants = new Set(sessions.map(s => s.userId)).size;

      const averageScore = totalSessions > 0
        ? sessions.reduce((sum, s) => sum + (s.finalScore || 0), 0) / totalSessions
        : 0;

      // Breakdown by experiment type
      const byType = sessions.reduce((acc, s) => {
        const type = s.experimentType || 'unknown';
        if (!acc[type]) acc[type] = { count: 0, totalScore: 0 };
        acc[type].count++;
        acc[type].totalScore += s.finalScore || 0;
        return acc;
      }, {});

      const experimentBreakdown = Object.entries(byType).map(([type, data]) => ({
        type,
        count: data.count,
        averageScore: data.totalScore / data.count,
      }));

      // Check for milestones
      const milestones = await this.detectMilestones(totalSessions, uniqueParticipants);

      // Compare with previous period
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));

      const previousSessions = await prisma.experimentSession.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
          status: 'completed',
        },
      });

      const growthRate = previousSessions > 0
        ? ((totalSessions - previousSessions) / previousSessions) * 100
        : 0;

      return {
        totalSessions,
        uniqueParticipants,
        averageScore,
        experimentBreakdown,
        milestones,
        growthRate,
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    } catch (error) {
      console.error('[CommunityHighlights] Data fetch error:', error);
      throw error;
    }
  }

  /**
   * Detect special milestones worth celebrating
   */
  async detectMilestones(totalSessions, uniqueParticipants) {
    const milestones = [];

    // Total sessions milestones
    const sessionMilestones = [100, 500, 1000, 5000, 10000];
    const totalSessionsEver = await prisma.experimentSession.count({ where: { status: 'completed' } });

    for (const milestone of sessionMilestones) {
      if (totalSessionsEver >= milestone && totalSessionsEver - totalSessions < milestone) {
        milestones.push({ type: 'sessions', value: milestone, message: `${milestone} total experiments completed!` });
      }
    }

    // Participant milestones
    const participantMilestones = [50, 100, 500, 1000];
    const totalParticipants = await prisma.user.count();

    for (const milestone of participantMilestones) {
      if (totalParticipants >= milestone) {
        milestones.push({ type: 'participants', value: milestone, message: `${milestone}+ community members!` });
      }
    }

    return milestones;
  }

  /**
   * Generate post content using AI
   */
  async generatePostWithAI(data, timeWindow) {
    const systemPrompt = `You are the Community Highlights Agent for a psi research platform. Generate an encouraging, data-driven social media post celebrating community milestones.

**STRICT PRIVACY RULES:**
- NEVER mention individual users, names, or identifiers
- Only use aggregated, anonymized statistics
- Focus on collective progress, not individual performance

**Tone:** ${this.config.persona.tone}
**Voice:** ${this.config.persona.voice}

Generate a 2-3 tweet thread (280 chars each) that:
1. Celebrates the community's collective progress
2. Highlights interesting trends or milestones
3. Encourages continued participation
4. Maintains scientific credibility

Return as JSON: {"tweets": ["tweet1", "tweet2", "tweet3"], "hashtags": ["tag1", "tag2"]}`;

    const userPrompt = `**Data Summary:**
- Time Period: Last ${timeWindow}
- Total Sessions: ${data.totalSessions}
- Unique Participants: ${data.uniqueParticipants}
- Average Accuracy: ${(data.averageScore * 100).toFixed(1)}%
- Growth Rate: ${data.growthRate > 0 ? '+' : ''}${data.growthRate.toFixed(1)}%
${data.milestones.length > 0 ? `- Milestones: ${data.milestones.map(m => m.message).join(', ')}` : ''}

**Experiment Breakdown:**
${data.experimentBreakdown.map(e => `- ${e.type}: ${e.count} sessions (avg ${(e.averageScore * 100).toFixed(1)}%)`).join('\n')}`;

    try {
      if (!llmHelper.isAvailable()) {
        // Fallback to template
        return this.generateWithTemplate(data, timeWindow);
      }

      const response = await llmHelper.chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1024,
      });

      const result = llmHelper.parseJsonResponse(response);

      return {
        platform: 'twitter',
        content: result.tweets || [response],
        type: 'thread',
        hashtags: result.hashtags || ['PsiResearch', 'CognisInstitute', 'CommunityScience'],
      };
    } catch (error) {
      console.error('[CommunityHighlights] AI generation error:', error.message);
      return this.generateWithTemplate(data, timeWindow);
    }
  }

  /**
   * Fallback template-based generation
   */
  generateWithTemplate(data, timeWindow) {
    const tweets = [
      `Community Update: ${data.totalSessions} experiments completed this ${timeWindow}! ${data.uniqueParticipants} participants contributing to consciousness research.`,
      `Average accuracy: ${(data.averageScore * 100).toFixed(1)}%. Growth: ${data.growthRate > 0 ? '+' : ''}${data.growthRate.toFixed(1)}% from last period. Science in action!`,
      `Thank you to everyone participating. Together, we're building the world's largest psi research dataset. Join us at Cognosis.io`,
    ];

    return {
      platform: 'twitter',
      content: tweets,
      type: 'thread',
      hashtags: ['PsiResearch', 'CognisInstitute', 'CommunityScience'],
      method: 'template',
    };
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      postsGenerated: this.stats.postsGenerated,
      lastGenerated: this.stats.lastGenerated,
      enabled: this.config.enabled,
      requiresApproval: this.config.requireApproval,
    };
  }
}

module.exports = CommunityHighlights;
