/**
 * Cognosis Off-Chain Coordinator
 *
 * Purpose: Express server that coordinates Midnight blockchain interactions,
 * IPFS uploads, and commitment/reveal protocol.
 *
 * Endpoints:
 * - POST /api/pin - Upload encrypted blob to IPFS
 * - POST /api/commit - Create commitment on Midnight blockchain
 * - POST /api/reveal - Reveal commitment
 * - GET /api/commit/:hash - Get commitment status
 *
 * Environment Variables:
 * - MIDNIGHT_API_KEY - API key for Midnight testnet
 * - MIDNIGHT_NETWORK - Network (testnet/devnet)
 * - MIDNIGHT_CONTRACT_ADDRESS - Deployed contract address
 * - IPFS_GATEWAY - IPFS gateway URL
 * - PINNING_API_KEY - Pinata/Blockfrost API key
 * - PINNING_SERVICE - Service name (pinata/blockfrost/local)
 * - JWT_SECRET - Secret for JWT verification
 * - PORT - Server port (default 3001)
 *
 * Run: node index.js
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config({ path: '../../config/.env' });

const ipfsHelper = require('../../storage/ipfs_helper');
const { getMidnightClient } = require('./midnight-client');
const monitoring = require('./monitoring');
const { getPrismaClient } = require('../db');
const { authMiddleware, optionalAuthMiddleware } = require('../auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Initialize Midnight Client (real SDK with mock fallback)
const midnight = getMidnightClient();

// In-memory storage for demo (replace with database)
const commitmentStore = new Map();

/**
 * Helper: Compute commitment hash
 * commitment = SHA256(CID || metadata || nonce)
 */
function computeCommitment(cid, metadata, nonce) {
  const data = `${cid}${JSON.stringify(metadata)}${nonce}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Helper: Verify device signature
 * Verifies that the request was signed by the claimed device
 */
function verifyDeviceSignature(message, signature, publicKey) {
  // TODO: Implement real signature verification
  // const { verifySignature } = require('@midnight-ntwrk/crypto');
  // return verifySignature({ message, signature, publicKey });

  // Mock verification
  console.log(`✓ Device signature verified (MOCK)`);
  return true;
}

/**
 * Helper: Hash metadata for on-chain storage
 */
function hashMetadata(metadata) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(metadata))
    .digest('hex');
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/pin
 *
 * Upload encrypted blob to IPFS and pin it.
 *
 * Request body:
 * {
 *   "blobBase64": "base64-encoded-encrypted-data",
 *   "filename": "trial_response_12345.enc"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "cid": "bafybeig...",
 *   "size": 12345,
 *   "pinStatus": "pinned"
 * }
 */
app.post('/api/pin', async (req, res) => {
  const startTime = Date.now();
  try {
    const { blobBase64, filename } = req.body;

    if (!blobBase64) {
      return res.status(400).json({ error: 'Missing blobBase64' });
    }

    // Decode base64
    const buffer = Buffer.from(blobBase64, 'base64');

    // Upload to IPFS
    const result = await ipfsHelper.uploadBuffer(buffer, filename || 'encrypted_blob');

    monitoring.recordIPFSUpload(true, result.size);

    res.json({
      success: true,
      cid: result.cid,
      size: result.size,
      pinStatus: result.pinStatus
    });
  } catch (error) {
    console.error('Pin error:', error);
    monitoring.recordIPFSUpload(false);
    monitoring.recordError(error, {
      operation: 'pin',
      filename: req.body.filename,
      size: req.body.blobBase64?.length
    });
    res.status(500).json({
      success: false,
      error: 'Failed to pin to IPFS',
      message: error.message
    });
  }
});

/**
 * POST /api/commit
 *
 * Create commitment on Midnight blockchain.
 *
 * Request body:
 * {
 *   "cid": "bafybeig...",
 *   "metadata": {
 *     "experimentType": "remote_viewing",
 *     "timestamp": 1234567890,
 *     "targetHash": "abc123..."
 *   },
 *   "nonce": "hex-random-nonce",
 *   "deviceSig": "hex-signature",
 *   "devicePubKey": "hex-pubkey"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "commitTxId": "midnight:abc123...",
 *   "commitmentHash": "def456...",
 *   "blockHeight": 123456
 * }
 */
app.post('/api/commit', optionalAuthMiddleware, async (req, res) => {
  const startTime = Date.now();
  const prisma = getPrismaClient();

  try {
    const { cid, metadata, nonce, deviceSig, devicePubKey, sessionId, responseId } = req.body;

    // Validate inputs
    if (!cid || !metadata || !nonce || !deviceSig || !devicePubKey) {
      return res.status(400).json({
        error: 'Missing required fields: cid, metadata, nonce, deviceSig, devicePubKey'
      });
    }

    // Verify device signature
    const message = `${cid}${JSON.stringify(metadata)}${nonce}`;
    const signatureValid = verifyDeviceSignature(message, deviceSig, devicePubKey);

    if (!signatureValid) {
      return res.status(401).json({ error: 'Invalid device signature' });
    }

    // Compute commitment hash
    const commitmentHash = computeCommitment(cid, metadata, nonce);

    // Check if commitment already exists
    if (commitmentStore.has(commitmentHash)) {
      return res.status(409).json({ error: 'Commitment already exists' });
    }

    // Hash metadata for on-chain storage
    const metadataHash = hashMetadata(metadata);

    // Set reveal window (e.g., 100 blocks from now)
    const revealWindow = 100; // blocks

    // Define access policy
    const accessPolicy = {
      publicRead: false,
      authorizedKeys: [devicePubKey],
      requireProof: false
    };

    // Submit to Midnight blockchain
    const result = await midnight.submitCommit({
      commitment: commitmentHash,
      metadataHash,
      revealWindow,
      accessPolicy,
      callerPubKey: devicePubKey
    });

    // Store commitment in database if responseId provided
    if (responseId && req.user) {
      try {
        await prisma.commitment.create({
          data: {
            responseId,
            userId: req.user.userId,
            commitmentHash,
            nonce,
            metadataHash,
            commitTxId: result.commitTxId,
            commitBlockHeight: result.blockHeight,
            commitTimestamp: new Date(result.timestamp),
            cid,
            revealed: false,
          }
        });
      } catch (dbError) {
        console.warn('Database storage failed, using in-memory fallback:', dbError.message);
      }
    }

    // Store commitment in memory (fallback/legacy)
    commitmentStore.set(commitmentHash, {
      cid,
      metadata,
      nonce,
      devicePubKey,
      commitTxId: result.commitTxId,
      blockHeight: result.blockHeight,
      timestamp: result.timestamp,
      revealed: false
    });

    const responseTime = Date.now() - startTime;
    monitoring.recordCommit(true, responseTime);

    res.json({
      success: true,
      commitTxId: result.commitTxId,
      commitmentHash,
      blockHeight: result.blockHeight,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error('Commit error:', error);
    const responseTime = Date.now() - startTime;
    monitoring.recordCommit(false, responseTime);
    monitoring.recordError(error, {
      operation: 'commit',
      cid: req.body.cid,
      metadata: req.body.metadata
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create commitment',
      message: error.message
    });
  }
});

/**
 * POST /api/reveal
 *
 * Reveal commitment on Midnight blockchain.
 *
 * Request body:
 * {
 *   "commitmentHash": "abc123...",
 *   "cid": "bafybeig...",
 *   "nonce": "hex-nonce",
 *   "deviceSig": "hex-signature",
 *   "devicePubKey": "hex-pubkey"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "revealTxId": "midnight:def456...",
 *   "blockHeight": 123556
 * }
 */
app.post('/api/reveal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { commitmentHash, cid, nonce, deviceSig, devicePubKey } = req.body;

    // Validate inputs
    if (!commitmentHash || !cid || !nonce || !deviceSig || !devicePubKey) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Get commitment from store
    const commitment = commitmentStore.get(commitmentHash);
    if (!commitment) {
      return res.status(404).json({ error: 'Commitment not found' });
    }

    // Check if already revealed
    if (commitment.revealed) {
      return res.status(409).json({ error: 'Already revealed' });
    }

    // Verify device signature
    const message = `${commitmentHash}${cid}${nonce}`;
    const signatureValid = verifyDeviceSignature(message, deviceSig, devicePubKey);

    if (!signatureValid) {
      return res.status(401).json({ error: 'Invalid device signature' });
    }

    // Verify reveal matches commitment
    const recomputedHash = computeCommitment(cid, commitment.metadata, nonce);
    if (recomputedHash !== commitmentHash) {
      return res.status(400).json({ error: 'Reveal does not match commitment' });
    }

    // Submit reveal to Midnight blockchain
    const result = await midnight.submitReveal({
      commitmentHash,
      cid,
      nonce,
      signature: deviceSig,
      callerPubKey: devicePubKey
    });

    // Update commitment store
    commitment.revealed = true;
    commitment.revealTxId = result.revealTxId;
    commitment.revealBlockHeight = result.blockHeight;
    commitmentStore.set(commitmentHash, commitment);

    const responseTime = Date.now() - startTime;
    monitoring.recordReveal(true, responseTime);

    res.json({
      success: true,
      revealTxId: result.revealTxId,
      blockHeight: result.blockHeight,
      cid,
      metadata: commitment.metadata
    });
  } catch (error) {
    console.error('Reveal error:', error);
    const responseTime = Date.now() - startTime;
    monitoring.recordReveal(false, responseTime);
    monitoring.recordError(error, {
      operation: 'reveal',
      commitmentHash: req.body.commitmentHash
    });
    res.status(500).json({
      success: false,
      error: 'Failed to reveal commitment',
      message: error.message
    });
  }
});

/**
 * GET /api/commit/:commitmentHash
 *
 * Get commitment status and details.
 *
 * Response:
 * {
 *   "success": true,
 *   "commitment": {
 *     "commitmentHash": "abc123...",
 *     "revealed": false,
 *     "timestamp": 1234567890,
 *     "blockHeight": 123456
 *   }
 * }
 */
app.get('/api/commit/:commitmentHash', async (req, res) => {
  try {
    const { commitmentHash } = req.params;

    // Check local store first
    const localCommitment = commitmentStore.get(commitmentHash);

    // Query Midnight blockchain
    const chainStatus = await midnight.getCommitmentStatus(commitmentHash);

    res.json({
      success: true,
      commitment: {
        commitmentHash,
        revealed: localCommitment?.revealed || false,
        timestamp: localCommitment?.timestamp || chainStatus.timestamp,
        blockHeight: localCommitment?.blockHeight || chainStatus.blockHeight,
        metadata: localCommitment?.revealed ? localCommitment.metadata : null,
        cid: localCommitment?.revealed ? localCommitment.cid : null
      }
    });
  } catch (error) {
    console.error('Get commitment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get commitment',
      message: error.message
    });
  }
});

/**
 * GET /health
 *
 * Health check endpoint with monitoring integration.
 */
app.get('/health', (req, res) => {
  const health = monitoring.getHealth();
  res.json({
    ...health,
    service: 'offchain-coordinator',
    midnight: {
      initialized: midnight.initialized,
      network: midnight.network
    }
  });
});

/**
 * GET /metrics
 *
 * Get detailed metrics and monitoring data.
 */
app.get('/metrics', (req, res) => {
  res.json(monitoring.getMetrics());
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  monitoring.recordError(err, {
    operation: 'unhandled',
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('========================================');
  console.log('  Cognosis Off-Chain Coordinator');
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Network: ${process.env.MIDNIGHT_NETWORK || 'testnet'}`);
  console.log(`🔗 IPFS Gateway: ${process.env.IPFS_GATEWAY || 'not configured'}`);

  // Initialize Midnight SDK
  try {
    await midnight.initialize();
  } catch (error) {
    console.error('⚠️  Midnight SDK initialization failed (running in mock mode)');
  }

  console.log('========================================');
  console.log('Ready to accept requests');
});

module.exports = app;
