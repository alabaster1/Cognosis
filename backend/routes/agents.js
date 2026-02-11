/**
 * AI Agents API Routes
 * Provides endpoints for managing and interacting with AI agents
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { getVectorStore } = require('../agents/utils/vectorStore');
const ContentGenerator = require('../agents/modules/ContentGenerator');
const ToxicityFilter = require('../agents/modules/ToxicityFilter');
const FactVerificationLayer = require('../agents/modules/FactVerificationLayer');
const CommunityHighlights = require('../agents/modules/CommunityHighlights');
const FAQSupport = require('../agents/modules/FAQSupport');
const { getPrismaClient } = require('../db');

const prisma = getPrismaClient();

// Initialize modules
let vectorStore = null;
let publicOutreachGenerator = null;
let scientificGenerator = null;
let toxicityFilter = null;
let factVerifier = null;
let communityHighlights = null;
let faqSupport = null;

// Initialize on first request
async function ensureInitialized() {
  if (!vectorStore) {
    vectorStore = getVectorStore();
    await vectorStore.initialize();
  }
  if (!publicOutreachGenerator) {
    publicOutreachGenerator = new ContentGenerator('publicOutreach');
  }
  if (!scientificGenerator) {
    scientificGenerator = new ContentGenerator('scientificCommunicator');
  }
  if (!toxicityFilter) {
    toxicityFilter = new ToxicityFilter();
  }
  if (!factVerifier) {
    factVerifier = new FactVerificationLayer();
  }
  if (!communityHighlights) {
    communityHighlights = new CommunityHighlights();
  }
  if (!faqSupport) {
    faqSupport = new FAQSupport();
    await faqSupport.initialize();
  }
}

/**
 * GET /api/agents/status
 * Get status of all AI agents
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    res.json({
      success: true,
      agents: {
        publicOutreach: {
          enabled: true,
          stats: publicOutreachGenerator.getStats(),
        },
        scientificCommunicator: {
          enabled: true,
          stats: scientificGenerator.getStats(),
        },
        communityHighlights: {
          enabled: true,
          stats: communityHighlights.getStats(),
        },
        faqSupport: {
          enabled: true,
          stats: faqSupport.getStats(),
        },
      },
      vectorStore: {
        type: vectorStore.type,
        documentsCount: vectorStore.documents.length,
      },
      safety: {
        toxicityFilter: 'active',
        factVerifier: 'active',
      },
    });
  } catch (error) {
    console.error('[Agents API] Status error:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

/**
 * POST /api/agents/generate-post
 * Generate a social media post from experiment data
 */
router.post('/generate-post', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { agentType, experimentType } = req.body;

    // Validate agent type
    if (!['publicOutreach', 'scientificCommunicator'].includes(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }

    // Fetch experiment summary data from database
    const experiments = await prisma.experimentSession.findMany({
      where: experimentType ? { experimentType } : {},
      include: {
        responses: {
          include: {
            commitment: true,
          },
        },
      },
      take: 100,
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (experiments.length === 0) {
      return res.status(404).json({ error: 'No experiments found' });
    }

    // Aggregate data
    const totalParticipants = experiments.length;
    const completedExperiments = experiments.filter(e => e.status === 'completed');
    const averageScore = completedExperiments.reduce((sum, e) => sum + (e.finalScore || 0), 0) / completedExperiments.length || 0;

    // Calculate p-value (simplified chi-square test)
    const expectedChance = 0.25; // Assuming 4-choice experiments
    const observedSuccess = averageScore;
    const zScore = (observedSuccess - expectedChance) / Math.sqrt(expectedChance * (1 - expectedChance) / totalParticipants);
    const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

    const experimentData = {
      type: experimentType || 'general',
      summary: `Participants showed ${averageScore > expectedChance ? 'above-chance' : 'chance-level'} performance`,
      totalParticipants,
      averageScore: (averageScore * 100).toFixed(1) + '%',
      significanceLevel: pValue < 0.05 ? 'significant' : 'not significant',
      pValue: pValue.toFixed(4),
      blockchainProof: {
        commitmentHash: experiments[0].responses[0]?.commitment?.commitmentHash,
        timestamp: experiments[0].responses[0]?.commitment?.createdAt,
      },
    };

    // Generate post
    const generator = agentType === 'publicOutreach' ? publicOutreachGenerator : scientificGenerator;
    const post = await generator.generatePost(experimentData);

    res.json({
      success: true,
      post,
      experimentData,
      requiresApproval: post.requiresApproval,
    });
  } catch (error) {
    console.error('[Agents API] Generate post error:', error);
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

/**
 * POST /api/agents/verify-claim
 * Verify a scientific claim with FactVerificationLayer
 */
router.post('/verify-claim', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { claim } = req.body;

    if (!claim) {
      return res.status(400).json({ error: 'Claim text required' });
    }

    const verification = await factVerifier.verifyClaim(claim);

    res.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('[Agents API] Verify claim error:', error);
    res.status(500).json({ error: 'Failed to verify claim' });
  }
});

/**
 * POST /api/agents/check-toxicity
 * Check content for toxicity and safety
 */
router.post('/check-toxicity', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const safetyCheck = await toxicityFilter.checkContent(content);

    res.json({
      success: true,
      safetyCheck,
    });
  } catch (error) {
    console.error('[Agents API] Toxicity check error:', error);
    res.status(500).json({ error: 'Failed to check toxicity' });
  }
});

/**
 * POST /api/agents/search-knowledge
 * Search the vector store knowledge base
 */
router.post('/search-knowledge', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { query, limit = 5, filter = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const results = await vectorStore.search(query, limit, filter);

    res.json({
      success: true,
      results,
      query,
    });
  } catch (error) {
    console.error('[Agents API] Search error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

/**
 * POST /api/agents/add-knowledge
 * Add a document to the knowledge base
 */
router.post('/add-knowledge', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { id, text, metadata = {} } = req.body;

    if (!id || !text) {
      return res.status(400).json({ error: 'ID and text required' });
    }

    const document = await vectorStore.addDocument(id, text, metadata);
    vectorStore.saveToFile();

    res.json({
      success: true,
      document: {
        id: document.id,
        text: document.text,
        metadata: document.metadata,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error('[Agents API] Add knowledge error:', error);
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

/**
 * GET /api/agents/knowledge
 * Get all documents in the knowledge base
 */
router.get('/knowledge', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const documents = vectorStore.getAllDocuments().map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    }));

    res.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('[Agents API] Get knowledge error:', error);
    res.status(500).json({ error: 'Failed to get knowledge base' });
  }
});

/**
 * GET /api/agents/stats
 * Get comprehensive statistics for all agents
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    res.json({
      success: true,
      stats: {
        publicOutreach: publicOutreachGenerator.getStats(),
        scientificCommunicator: scientificGenerator.getStats(),
        communityHighlights: communityHighlights.getStats(),
        faqSupport: faqSupport.getStats(),
        toxicityFilter: toxicityFilter.getStats(),
        factVerifier: factVerifier.getStats(),
        vectorStore: {
          documentsCount: vectorStore.documents.length,
          type: vectorStore.type,
        },
      },
    });
  } catch (error) {
    console.error('[Agents API] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get agent statistics' });
  }
});

/**
 * POST /api/agents/generate-highlight
 * Generate a community highlights post
 */
router.post('/generate-highlight', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { timeWindow = '7d' } = req.body;

    const result = await communityHighlights.generateHighlight({ timeWindow });

    res.json(result);
  } catch (error) {
    console.error('[Agents API] Generate highlight error:', error);
    res.status(500).json({ error: 'Failed to generate community highlight' });
  }
});

/**
 * POST /api/agents/ask-faq
 * Ask the FAQ support agent a question
 */
router.post('/ask-faq', async (req, res) => {
  try {
    await ensureInitialized();

    const { question, context = {} } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question required' });
    }

    const result = await faqSupport.answerQuestion(question, context);

    res.json(result);
  } catch (error) {
    console.error('[Agents API] FAQ answer error:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

/**
 * POST /api/agents/add-faq
 * Add a new FAQ to the database
 */
router.post('/add-faq', authMiddleware, async (req, res) => {
  try {
    await ensureInitialized();

    const { category, question, answer, keywords } = req.body;

    if (!category || !question || !answer || !keywords) {
      return res.status(400).json({ error: 'Category, question, answer, and keywords required' });
    }

    const result = await faqSupport.addFAQ(category, question, answer, keywords);

    res.json(result);
  } catch (error) {
    console.error('[Agents API] Add FAQ error:', error);
    res.status(500).json({ error: 'Failed to add FAQ' });
  }
});

// Helper function for normal CDF (cumulative distribution function)
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

module.exports = router;
