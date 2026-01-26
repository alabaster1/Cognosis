/**
 * Authentication Service
 * JWT-based authentication with Cardano wallet signature verification (CIP-8)
 */

const jwt = require('jsonwebtoken');
const { getPrismaClient } = require('./db');
const {
  verifyCIP8Signature,
  generateAuthChallenge,
  buildChallengeMessage,
  isChallengeExpired,
} = require('./utils/cardanoSignature');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// In-memory challenge store with TTL (Map<walletAddress, { nonce, timestamp }>)
const challengeStore = new Map();

// Cleanup expired challenges every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challengeStore.entries()) {
    if (isChallengeExpired(value.timestamp)) {
      challengeStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate JWT token for user
 */
function generateToken(userId, walletAddress) {
  return jwt.sign(
    {
      userId,
      walletAddress,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate a wallet authentication challenge
 * @param {string} walletAddress - Hex-encoded wallet address
 * @returns {{ nonce: string, timestamp: number, message: string }}
 */
function generateWalletChallenge(walletAddress) {
  const { nonce, timestamp } = generateAuthChallenge();
  const message = buildChallengeMessage(nonce, timestamp);

  // Store challenge keyed by wallet address
  challengeStore.set(walletAddress, { nonce, timestamp });

  return { nonce, timestamp, message };
}

/**
 * Authenticate with wallet address + CIP-8 signature
 * Verifies the signature against the stored challenge
 */
async function authenticateWithWallet(walletAddress, signature) {
  const prisma = getPrismaClient();

  // Retrieve and validate stored challenge
  const challenge = challengeStore.get(walletAddress);
  if (!challenge) {
    throw new Error('No authentication challenge found. Request a challenge first.');
  }

  if (isChallengeExpired(challenge.timestamp)) {
    challengeStore.delete(walletAddress);
    throw new Error('Challenge expired. Please request a new one.');
  }

  // Reconstruct the message that was signed
  const message = buildChallengeMessage(challenge.nonce, challenge.timestamp);
  const encoder = new TextEncoder();
  const payloadHex = Buffer.from(encoder.encode(message)).toString('hex');

  // Verify CIP-8 signature
  const valid = await verifyCIP8Signature(walletAddress, payloadHex, signature);
  if (!valid) {
    throw new Error('Invalid wallet signature');
  }

  // Challenge consumed - remove it
  challengeStore.delete(walletAddress);

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { walletAddress },
    include: { profile: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress,
        walletType: 'cardano',
        lastLoginAt: new Date(),
        profile: {
          create: {
            displayName: `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}`,
          },
        },
      },
      include: { profile: true },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const token = generateToken(user.id, user.walletAddress);

  return {
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      walletType: user.walletType,
      username: user.username,
      profile: user.profile,
    },
    token,
  };
}

/**
 * Middleware: Verify JWT token from request
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        walletAddress: decoded.walletAddress,
      };
    }
  } catch (error) {
    // Ignore auth errors, continue without user
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  generateWalletChallenge,
  authenticateWithWallet,
  authMiddleware,
  optionalAuthMiddleware,
};
