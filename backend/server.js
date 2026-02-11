const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
// Load environment variables - try multiple paths for local dev, Cloud Run uses env vars directly
const dotenv = require('dotenv');
const path = require('path');

// Try loading from various locations (silent fail - Cloud Run sets env vars directly)
dotenv.config({ path: path.resolve(__dirname, '../config/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config(); // default .env

const { connectDatabase, healthCheck } = require('./db');
const {
  apiLimiter,
  authLimiter,
  blockchainLimiter,
  uploadLimiter,
  readLimiter,
} = require('./middleware/rateLimit');
const socketService = require('./services/socketService');

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(helmet());

const allowedOrigins = [
  'https://cognosispredict.com',
  'https://www.cognosispredict.com',
];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:4000');
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Routes
const authRoutes = require('./routes/auth');
const experimentRoutes = require('./routes/experiments');
const resultsRoutes = require('./routes/results');
const statsRoutes = require('./routes/stats');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const commitRevealRoutes = require('./routes/commitReveal');
const agentsRoutes = require('./routes/agents');
const gamificationRoutes = require('./routes/gamification');
const metaAnalysisRoutes = require('./routes/metaAnalysis');
const aiWebhooksRoutes = require('./routes/aiWebhooks');
const rvSessionsRoutes = require('./routes/rvSessions');
const surveyRoutes = require('./routes/survey');
const telepathyRoutes = require('./routes/telepathy');
const gameExperimentRoutes = require('./routes/gameExperiments');
const feedRoutes = require('./routes/feed');
const ipfsRoutes = require('./routes/ipfs');
const cardanoRoutes = require('./routes/cardano');

// Apply specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/results', uploadLimiter, resultsRoutes);
app.use('/api/stats', readLimiter, statsRoutes);
app.use('/api/leaderboard', readLimiter, leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/commit-reveal', blockchainLimiter, commitRevealRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/meta-analysis', readLimiter, metaAnalysisRoutes);
app.use('/api/webhooks', aiWebhooksRoutes);
app.use('/api/rv/sessions', rvSessionsRoutes);
app.use('/api/survey', readLimiter, surveyRoutes);
app.use('/api/telepathy', telepathyRoutes);
app.use('/api/experiments', gameExperimentRoutes);
app.use('/api/feed', readLimiter, feedRoutes);
app.use('/api/ipfs', uploadLimiter, ipfsRoutes);
app.use('/api/cardano', blockchainLimiter, cardanoRoutes);

// Health check with database status
app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({
    status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
    database: dbHealth,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log('========================================');
  console.log('  Cognosis Backend Server');
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Connect to database
  try {
    await connectDatabase();
  } catch (error) {
    console.error('⚠️  Database connection failed (continuing without DB)');
  }

  // Initialize WebSocket server
  socketService.initialize(httpServer);
  console.log('🔌 WebSocket server initialized');

  // Cleanup old sessions every hour
  setInterval(() => {
    socketService.cleanupSessions();
  }, 60 * 60 * 1000);


  console.log('========================================');
  console.log('Ready to accept requests');
});

module.exports = app;
