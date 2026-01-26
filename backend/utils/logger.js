/**
 * Logger Utility
 *
 * Provides logging functions that mask sensitive data (PII).
 * Prevents wallet addresses, emails, and other sensitive info from appearing in logs.
 */

/**
 * Mask a wallet address for logging
 * Shows first 8 and last 4 characters: addr1q...xyz9
 */
function maskWallet(address) {
  if (!address || typeof address !== 'string') return '[no-wallet]';
  if (address.startsWith('guest_')) return '[guest]';
  if (address.length < 20) return '[invalid-addr]';
  return `${address.substring(0, 8)}...${address.slice(-4)}`;
}

/**
 * Mask an email address
 * Shows first 2 chars: jo***@example.com
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[no-email]';
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Mask a user ID (show first 8 chars)
 */
function maskUserId(userId) {
  if (!userId || typeof userId !== 'string') return '[no-id]';
  if (userId.length <= 8) return userId;
  return `${userId.substring(0, 8)}...`;
}

/**
 * Sanitize an object for logging by masking sensitive fields
 */
function sanitizeForLog(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };
  const sensitiveFields = ['walletAddress', 'wallet_address', 'address', 'email', 'password', 'secret', 'token', 'apiKey', 'privateKey'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      if (key.toLowerCase().includes('wallet') || key.toLowerCase().includes('address')) {
        sanitized[key] = maskWallet(sanitized[key]);
      } else if (key.toLowerCase().includes('email')) {
        sanitized[key] = maskEmail(sanitized[key]);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    }
  }

  return sanitized;
}

/**
 * Log levels
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * Logger object with methods for each level
 */
const logger = {
  debug: (tag, message, data = null) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      const sanitizedData = data ? sanitizeForLog(data) : '';
      console.log(`[DEBUG][${tag}] ${message}`, sanitizedData);
    }
  },

  info: (tag, message, data = null) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      const sanitizedData = data ? sanitizeForLog(data) : '';
      console.log(`[INFO][${tag}] ${message}`, sanitizedData);
    }
  },

  warn: (tag, message, data = null) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      const sanitizedData = data ? sanitizeForLog(data) : '';
      console.warn(`[WARN][${tag}] ${message}`, sanitizedData);
    }
  },

  error: (tag, message, error = null) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      const errorInfo = error instanceof Error
        ? { message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') }
        : error;
      console.error(`[ERROR][${tag}] ${message}`, errorInfo || '');
    }
  },

  // Convenience method for request logging
  request: (tag, req, message = '') => {
    const info = {
      method: req.method,
      path: req.path,
      user: maskUserId(req.user?.userId),
      wallet: maskWallet(req.user?.walletAddress),
    };
    logger.info(tag, message || 'Request', info);
  },
};

module.exports = {
  logger,
  maskWallet,
  maskEmail,
  maskUserId,
  sanitizeForLog,
};
