/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per window (increased since we now count all requests)
  // NOTE: skipSuccessfulRequests removed - was allowing unlimited successful auth attempts
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes',
  },
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Strict rate limiter for commit/reveal operations
 * 10 transactions per 5 minutes
 */
const blockchainLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 transactions per window
  message: {
    error: 'Too many blockchain operations, please slow down',
    retryAfter: '5 minutes',
  },
  handler: (req, res) => {
    console.warn(`[SECURITY] Blockchain rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many blockchain transactions',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Moderate rate limiter for IPFS uploads
 * 20 uploads per 10 minutes
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Max 20 uploads per window
  message: {
    error: 'Too many uploads, please try again later',
    retryAfter: '10 minutes',
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Upload rate limit exceeded',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Lenient rate limiter for read-only operations
 * 500 requests per 15 minutes
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Max 500 requests per window
  message: {
    error: 'Too many requests, please try again later',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  blockchainLimiter,
  uploadLimiter,
  readLimiter,
};
