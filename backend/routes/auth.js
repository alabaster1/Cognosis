/**
 * Authentication Routes - Wallet Only (CIP-8)
 * /api/auth/*
 */

const express = require('express');
const {
  generateWalletChallenge,
  authenticateWithWallet,
  authMiddleware,
} = require('../auth');
const { getPrismaClient } = require('../db');
const { validators } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/auth/wallet/challenge
 * Request a challenge nonce for wallet signature
 */
router.post('/wallet/challenge', validators.walletChallenge, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const challenge = generateWalletChallenge(walletAddress);
    res.json({ success: true, ...challenge });
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/wallet
 * Authenticate with wallet address + CIP-8 signature
 * Body: { walletAddress, signature: { signature: hex, key: hex } }
 */
router.post('/wallet', validators.walletAuth, async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    const result = await authenticateWithWallet(walletAddress, signature);
    res.json({ success: true, user: result.user, token: result.token });
  } catch (error) {
    console.error('Wallet auth error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        profile: true,
        _count: { select: { experiments: true, responses: true, commitments: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        walletType: user.walletType,
        createdAt: user.createdAt,
        profile: user.profile,
        stats: {
          experiments: user._count.experiments,
          responses: user._count.responses,
          commitments: user._count.commitments,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
