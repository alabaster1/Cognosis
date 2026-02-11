/**
 * Content Generator Module
 * Transforms scientific findings into accessible social content
 */

const config = require('../config');
const llmHelper = require('../utils/llmHelper');
const { getVectorStore } = require('../utils/vectorStore');
const ToxicityFilter = require('./ToxicityFilter');

class ContentGenerator {
  constructor(agentType = 'publicOutreach') {
    this.agentType = agentType;
    this.config = config.agents[agentType];
    this.vectorStore = getVectorStore();
    this.toxicityFilter = new ToxicityFilter();
    this.generationHistory = [];
  }

  /**
   * Generate social media post from experiment data
   * @param {Object} experimentData - Data about the experiment
   * @returns {Object} - Generated post with metadata
   */
  async generatePost(experimentData) {
    console.log(`[ContentGenerator] Generating ${this.agentType} post for ${experimentData.type}`);

    // Step 1: Retrieve similar successful posts from vector store
    const similarPosts = await this.vectorStore.search(
      `experiment ${experimentData.type} results ${experimentData.summary}`,
      3
    );

    // Step 2: Generate content with AI
    const generatedContent = await this.generateWithAI(experimentData, similarPosts);

    // Step 3: Pass through toxicity filter
    const safetyCheck = await this.toxicityFilter.checkContent(generatedContent.content);

    if (!safetyCheck.safe) {
      console.log(`[ContentGenerator] Content failed safety check: ${safetyCheck.reason}`);
      // Retry with stronger constraints
      return this.generateWithConstraints(experimentData, safetyCheck.concerns);
    }

    // Step 4: Calculate confidence score
    const confidence = this.calculateConfidence(generatedContent, safetyCheck);

    // Step 5: Store in history
    this.generationHistory.push({
      experimentData,
      content: generatedContent,
      safetyCheck,
      confidence,
      timestamp: new Date().toISOString(),
    });

    return {
      ...generatedContent,
      safetyCheck,
      confidence,
      requiresApproval: confidence < this.config.confidenceThreshold || this.config.requireApproval,
    };
  }

  /**
   * Generate content using AI
   */
  async generateWithAI(experimentData, similarPosts) {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getUserPrompt(experimentData, similarPosts);

    try {
      if (!llmHelper.isAvailable()) {
        console.warn('[ContentGenerator] LLM not available, using template');
        return this.generateWithTemplate(experimentData);
      }

      const response = await llmHelper.chatCompletion({
        systemPrompt: systemPrompt + '\n\nRespond with valid JSON only.',
        userPrompt,
        temperature: 0.7,
        maxTokens: 1000,
      });

      const result = llmHelper.parseJsonResponse(response);

      return {
        content: result.content,
        hashtags: result.hashtags || [],
        tone: result.tone,
        targetAudience: result.targetAudience,
        callToAction: result.callToAction,
        method: 'ai',
      };
    } catch (error) {
      console.error('[ContentGenerator] AI generation error:', error.message);

      // Fallback to template-based generation
      return this.generateWithTemplate(experimentData);
    }
  }

  /**
   * Get system prompt based on agent type
   */
  getSystemPrompt() {
    if (this.agentType === 'publicOutreach') {
      return `You are the PublicOutreachAgent for Cognosis, a platform exploring consciousness and psi phenomena through rigorous scientific experiments.

PERSONA:
- Voice: ${this.config.persona.voice}
- Tone: ${this.config.persona.tone}
- Keywords: ${this.config.persona.keywords.join(', ')}

RULES:
1. Transform scientific findings into accessible, inspiring content
2. Use layman analogies and visually engaging language
3. Be enthusiastic but accurate - no hype or exaggeration
4. Include 1-2 relevant hashtags
5. Add a call-to-action (e.g., "Try this experiment yourself!")
6. Keep under 280 characters for Twitter, or structure as a thread
7. NEVER use forbidden phrases: ${this.config.persona.forbiddenPhrases.join(', ')}
8. Focus on the "why this matters" angle

Respond with JSON:
{
  "content": "the post text",
  "hashtags": ["#tag1", "#tag2"],
  "tone": "enthusiastic|educational|inspiring",
  "targetAudience": "general public",
  "callToAction": "what you want users to do"
}`;
    } else {
      // Scientific Communicator
      return `You are the ScientificCommunicatorAgent for Cognosis, communicating advanced research in quantum biology, consciousness studies, and parapsychology.

PERSONA:
- Voice: ${this.config.persona.voice}
- Tone: ${this.config.persona.tone}
- Keywords: ${this.config.persona.keywords.join(', ')}
- Citation Style: ${this.config.persona.citationStyle}

RULES:
1. Maintain academic rigor - cite sources with DOIs
2. Distinguish correlation from causation
3. Report p-values, effect sizes, and sample sizes
4. Flag speculative statements with "Hypothesis:" prefix
5. Link to blockchain proofs for data integrity
6. Target researchers and academics
7. Use precise scientific terminology
8. Include statistical details

Respond with JSON:
{
  "content": "the post text with citations",
  "hashtags": ["#research", "#consciousness"],
  "tone": "academic|exploratory",
  "targetAudience": "researchers",
  "citations": ["doi:10.xxxx/xxxx"],
  "statisticalDetails": "p < 0.05, n = 100, d = 0.6"
}`;
    }
  }

  /**
   * Get user prompt with experiment data
   */
  getUserPrompt(experimentData, similarPosts) {
    const examplesText = similarPosts.length > 0
      ? `\n\nSuccessful post examples:\n${similarPosts.map(p => `- ${p.text}`).join('\n')}`
      : '';

    return `Generate a ${this.agentType} post for this Cognosis experiment:

Experiment Type: ${experimentData.type}
Summary: ${experimentData.summary}
Total Participants: ${experimentData.totalParticipants || 'N/A'}
Average Score: ${experimentData.averageScore || 'N/A'}
Significance Level: ${experimentData.significanceLevel || 'N/A'}
Blockchain Proof: ${experimentData.blockchainProof ? 'Yes' : 'No'}
${experimentData.blockchainProof ? `Commitment Hash: ${experimentData.blockchainProof.commitmentHash}` : ''}
${examplesText}

Create an engaging post that resonates with the target audience.`;
  }

  /**
   * Generate content with additional constraints after safety failure
   */
  async generateWithConstraints(experimentData, concerns) {
    console.log('[ContentGenerator] Regenerating with safety constraints...');

    const constrainedPrompt = `IMPORTANT SAFETY CONSTRAINTS:
Previous attempt failed due to: ${concerns.join(', ')}

You MUST avoid:
- Conspiracy theories
- Pseudoscience claims
- Unverified medical advice
- Any forbidden phrases

Generate a completely safe, scientifically accurate post.`;

    // Retry with lower temperature and explicit constraints
    try {
      if (!llmHelper.isAvailable()) {
        return this.generateWithTemplate(experimentData);
      }

      const response = await llmHelper.chatCompletion({
        systemPrompt: this.getSystemPrompt() + '\n\n' + constrainedPrompt + '\n\nRespond with valid JSON only.',
        userPrompt: this.getUserPrompt(experimentData, []),
        temperature: 0.3, // Lower temperature for more conservative output
        maxTokens: 1000,
      });

      const result = llmHelper.parseJsonResponse(response);

      return {
        content: result.content,
        hashtags: result.hashtags || [],
        tone: result.tone,
        targetAudience: result.targetAudience,
        callToAction: result.callToAction,
        method: 'ai_constrained',
        retryReason: concerns,
      };
    } catch (error) {
      console.error('[ContentGenerator] Constrained generation failed:', error.message);
      return this.generateWithTemplate(experimentData);
    }
  }

  /**
   * Fallback template-based generation
   */
  generateWithTemplate(experimentData) {
    const templates = {
      publicOutreach: [
        `New findings from Cognosis! Our ${experimentData.type} experiment with ${experimentData.totalParticipants} participants shows fascinating patterns. Try it yourself! #consciousness #science`,
        `Exploring ${experimentData.type} through decentralized science. ${experimentData.totalParticipants}+ participants contributing to consciousness research. Join us! #Cognosis #AI`,
        `Latest ${experimentData.type} results are in! Our community is pushing the boundaries of consciousness science. Participate today! #research #innovation`,
      ],
      scientificCommunicator: [
        `New data from Cognosis ${experimentData.type} protocol (n=${experimentData.totalParticipants}, blockchain-verified). Results suggest ${experimentData.summary}. #consciousness #research`,
        `Replication study: ${experimentData.type} with ${experimentData.totalParticipants} participants. All data IPFS-stored, Midnight-verified. Preliminary findings: ${experimentData.summary}`,
      ],
    };

    const templateList = templates[this.agentType] || templates.publicOutreach;
    const content = templateList[Math.floor(Math.random() * templateList.length)];

    return {
      content,
      hashtags: ['#Cognosis', '#consciousness'],
      tone: this.agentType === 'publicOutreach' ? 'enthusiastic' : 'academic',
      targetAudience: this.agentType === 'publicOutreach' ? 'general public' : 'researchers',
      callToAction: 'Visit Cognosis.io to participate',
      method: 'template',
    };
  }

  /**
   * Calculate confidence score for generated content
   */
  calculateConfidence(content, safetyCheck) {
    let confidence = 1.0;

    // Reduce confidence if safety concerns exist
    if (safetyCheck.concerns && safetyCheck.concerns.length > 0) {
      confidence -= 0.1 * safetyCheck.concerns.length;
    }

    // Reduce confidence if safety check confidence is low
    if (safetyCheck.confidence < 0.9) {
      confidence *= safetyCheck.confidence;
    }

    // Reduce confidence if using fallback methods
    if (content.method === 'template') {
      confidence *= 0.7;
    } else if (content.method === 'ai_constrained') {
      confidence *= 0.8;
    }

    // Reduce confidence if content is too short (< 50 chars)
    if (content.content.length < 50) {
      confidence *= 0.6;
    }

    // Reduce confidence if no hashtags
    if (!content.hashtags || content.hashtags.length === 0) {
      confidence *= 0.9;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate a thread of posts (for longer content)
   */
  async generateThread(experimentData, numTweets = 3) {
    console.log(`[ContentGenerator] Generating ${numTweets}-tweet thread`);

    const threadPrompt = `Generate a ${numTweets}-tweet thread about this experiment.
Each tweet should build on the previous one:
1. Hook/attention grabber
2. Key findings
3. Call to action

${this.getUserPrompt(experimentData, [])}`;

    try {
      if (!llmHelper.isAvailable()) {
        return {
          tweets: [this.generateWithTemplate(experimentData).content],
          hashtags: ['#Cognosis'],
          method: 'template',
        };
      }

      const response = await llmHelper.chatCompletion({
        systemPrompt: this.getSystemPrompt() + '\n\nRespond with valid JSON only.',
        userPrompt: threadPrompt,
        temperature: 0.7,
        maxTokens: 1500,
      });

      const result = llmHelper.parseJsonResponse(response);

      return {
        tweets: result.tweets || [result.content],
        hashtags: result.hashtags || [],
        method: 'ai',
      };
    } catch (error) {
      console.error('[ContentGenerator] Thread generation error:', error.message);
      return {
        tweets: [this.generateWithTemplate(experimentData).content],
        hashtags: ['#Cognosis'],
        method: 'template',
      };
    }
  }

  /**
   * Get generation statistics
   */
  getStats() {
    return {
      totalGenerated: this.generationHistory.length,
      averageConfidence: this.generationHistory.reduce((sum, item) => sum + item.confidence, 0) / this.generationHistory.length || 0,
      approvalRequired: this.generationHistory.filter(item => item.confidence < this.config.confidenceThreshold).length,
      safetyFailures: this.generationHistory.filter(item => !item.safetyCheck.safe).length,
    };
  }
}

module.exports = ContentGenerator;
