/**
 * AI Agents Configuration
 * Configuration for PublicOutreachAgent and ScientificCommunicatorAgent
 */

require('dotenv').config({ path: '../../config/.env' });

module.exports = {
  // AI Models - Gemini (primary) or OpenAI (fallback)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  },

  // Vector Store Configuration
  vectorStore: {
    type: process.env.VECTOR_STORE_TYPE || 'faiss', // 'faiss' or 'pinecone'
    faiss: {
      indexPath: process.env.FAISS_INDEX_PATH || './backend/agents/data/faiss_index',
      dimension: 1536, // OpenAI embedding dimension
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
      indexName: process.env.PINECONE_INDEX || 'cognosis-knowledge',
    },
  },

  // Agent Configuration
  agents: {
    publicOutreach: {
      enabled: true,
      autoPost: process.env.AUTO_POST === 'true',
      requireApproval: process.env.REQUIRE_HUMAN_APPROVAL !== 'false',
      confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.8,
      persona: {
        voice: 'Optimistic, educational, and community-driven',
        tone: 'Enthusiastic yet informative',
        keywords: ['mind', 'AI', 'science', 'blockchain', 'innovation'],
        forbiddenPhrases: [
          'quantum healing',
          'pseudoscience claims',
          'unverified medical advice',
          'conspiracy theories',
        ],
      },
      sentimentRange: [0.3, 0.8], // Positive but not manic
      professionalismMin: 0.7,
    },

    scientificCommunicator: {
      enabled: true,
      autoPost: false, // Always require approval for scientific posts
      requireApproval: true,
      confidenceThreshold: 0.85, // Higher threshold for scientific content
      persona: {
        voice: 'Professional, exploratory, and deeply curious',
        tone: 'Balanced between academic rigor and visionary curiosity',
        keywords: [
          'quantum coherence',
          'biophotons',
          'consciousness field',
          'entanglement',
          'psi phenomena',
          'neuroquantology',
          'zero-point energy',
          'vacuum fluctuations',
          'UAP physics',
          'advanced propulsion',
          'spacetime metrics',
          'Alcubierre drive',
          'metamaterials',
          'exotic matter',
          'anomalous aerospace phenomena',
        ],
        specializations: [
          'UAP/UFO scientific discourse',
          'Zero-point energy extraction theories',
          'Quantum vacuum engineering',
          'Breakthrough propulsion concepts',
          'Consciousness-matter interaction',
          'Non-local phenomena',
        ],
        citationStyle: 'APA 7th edition with DOI links',
      },
      statisticalRequirements: {
        minimumSampleSize: 30,
        significanceThreshold: 0.05,
        effectSizeRequired: true,
      },
    },

    communityHighlights: {
      enabled: true,
      autoPost: false,
      requireApproval: true,
      confidenceThreshold: 0.75,
      persona: {
        voice: 'Celebratory, data-driven, privacy-respecting',
        tone: 'Encouraging and milestone-focused',
        keywords: ['community', 'milestone', 'progress', 'collective'],
      },
      aggregationWindow: '7d', // Weekly highlights
      minimumSessionsForPost: 50, // Only post if significant activity
    },

    faqSupport: {
      enabled: true,
      autoPost: true, // Can auto-respond to FAQs
      requireApproval: false, // FAQ responses don't need approval
      confidenceThreshold: 0.9, // High confidence required for auto-response
      persona: {
        voice: 'Helpful, clear, and patient',
        tone: 'Supportive and educational',
        keywords: ['help', 'tutorial', 'guide', 'how-to'],
      },
      responseCategories: [
        'technical_issues',
        'experiment_instructions',
        'privacy_questions',
        'token_system',
        'baseline_profile',
        'scoring_methodology',
      ],
      fallbackToHuman: true, // Escalate if confidence < threshold
    },
  },

  // Safety & Moderation
  safety: {
    toxicityThreshold: 0.7, // Perspective API threshold
    perspectiveApiKey: process.env.PERSPECTIVE_API_KEY,
    enableToxicityFilter: true,
    enableFactVerification: true,
    maxRetries: 3,
  },

  // Backend Integration
  backend: {
    url: process.env.COGNOSIS_BACKEND_URL || 'http://localhost:3001',
    apiKey: process.env.COGNOSIS_API_KEY,
    endpoints: {
      experiments: '/api/experiments/summary',
      blockchainProof: '/api/blockchain/verify_commitment',
      stats: '/api/stats/aggregated',
    },
  },

  // Social Media (disabled by default, enable when ready)
  socialMedia: {
    twitter: {
      enabled: false,
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    },
    reddit: {
      enabled: false,
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD,
      targetSubreddits: [
        'r/consciousness',
        'r/ParapsychologyPapers',
        'r/neuroscience',
        'r/CryptoTechnology',
      ],
    },
    lens: {
      enabled: false,
      profileId: process.env.LENS_PROFILE_ID,
      privateKey: process.env.LENS_PRIVATE_KEY,
    },
  },

  // Research Platforms (disabled by default)
  research: {
    researchGate: {
      enabled: false,
      apiKey: process.env.RESEARCHGATE_API_KEY,
    },
    semanticScholar: {
      enabled: process.env.SEMANTIC_SCHOLAR_API_KEY ? true : false,
      apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY,
    },
  },

  // Blockchain Integration
  blockchain: {
    midnight: {
      rpcUrl: process.env.MIDNIGHT_RPC_URL,
      privateKey: process.env.MIDNIGHT_PRIVATE_KEY,
    },
    nftBadgeCriteria: {
      statisticalSignificance: 0.01, // p < 0.01
      sampleSize: 100, // n > 100
      effectSize: 0.5, // Cohen's d > 0.5
      replicationGold: 2, // 2+ independent replications for gold badge
    },
  },

  // Server Configuration
  server: {
    port: process.env.AGENTS_PORT || 3002,
    cors: {
      origin: process.env.WEB_URL || 'http://localhost:3000',
      credentials: true,
    },
  },

  // Logging & Monitoring
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN,
  },

  // Knowledge Base
  knowledgeBase: {
    verifiedTheories: [
      {
        name: 'Orchestrated Objective Reduction (Orch-OR)',
        authors: 'Hameroff, Penrose',
        status: 'Controversial but peer-reviewed',
        keyPapers: ['doi:10.1016/j.plrev.2013.08.002'],
      },
      {
        name: 'Quantum Brain Dynamics',
        authors: 'Umezawa, Vitiello, Ricciardi',
        status: 'Established theoretical framework',
        keyPapers: ['doi:10.1142/9789812813268_0001'],
      },
      {
        name: 'Global Consciousness Project',
        authors: 'Nelson, Radin',
        status: 'Ongoing research with mixed results',
        keyPapers: ['doi:10.1016/j.explore.2011.03.004'],
      },
      {
        name: 'Zero-Point Energy (Quantum Vacuum Fluctuations)',
        authors: 'Casimir, Puthoff, Haisch',
        status: 'Experimentally verified (Casimir effect), engineering applications speculative',
        keyPapers: ['doi:10.1103/PhysRev.73.360', 'arxiv:1204.4218'],
      },
      {
        name: 'Alcubierre Warp Drive',
        authors: 'Alcubierre, White',
        status: 'Theoretically consistent with GR, requires exotic matter',
        keyPapers: ['doi:10.1088/0264-9381/11/5/001'],
      },
      {
        name: 'UAP/Anomalous Aerospace Phenomena',
        authors: 'Elizondo, Mellon, Vallée (AATIP/UAPTF)',
        status: 'Official government acknowledgment, physics unexplained',
        keyPapers: ['ODNI UAP Report 2021', 'arxiv:1208.6172'],
      },
    ],
    redFlags: [
      'Never cite: quantum healing without peer review',
      'Never cite: commercial consciousness products',
      'Never cite: unverified perpetual motion machines',
      'Never engage: conspiracy theories without scientific basis',
      'Auto-reject: papers from predatory journals',
      'Avoid sensationalism: "aliens confirmed" without evidence',
      'Clarify speculation: distinguish theory from experimental validation',
    ],
    allowedSpeculation: [
      'Zero-point energy extraction (Puthoff et al.)',
      'Warp drive metrics (Alcubierre, Lentz)',
      'Metamaterial interactions with quantum vacuum',
      'UAP propulsion hypotheses (within physics constraints)',
      'Consciousness-quantum field theories (academic discourse)',
    ],
  },
};
