/**
 * Input Validation Middleware
 *
 * Provides reusable validation rules for API endpoints.
 * Uses express-validator for sanitization and validation.
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Common validation rules
 */
const rules = {
  // Wallet address validation (Cardano bech32 or hex)
  walletAddress: body('walletAddress')
    .trim()
    .notEmpty().withMessage('Wallet address is required')
    .isLength({ min: 20, max: 200 }).withMessage('Invalid wallet address length')
    .matches(/^(addr|stake)?[a-z0-9_]+$|^[a-f0-9]+$/i).withMessage('Invalid wallet address format'),

  // Optional wallet address
  walletAddressOptional: body('walletAddress')
    .optional()
    .trim()
    .isLength({ min: 20, max: 200 }).withMessage('Invalid wallet address length')
    .matches(/^(addr|stake)?[a-z0-9_]+$|^[a-f0-9]+$/i).withMessage('Invalid wallet address format'),

  // Experiment type validation
  experimentType: body('experimentType')
    .trim()
    .notEmpty().withMessage('Experiment type is required')
    .isIn([
      'remote-viewing', 'card-prediction', 'telepathy', 'precognition',
      'dice-influence', 'coin-flip', 'zener-oracle', 'ganzfeld',
      'emotion-echo', 'pattern-oracle', 'mind-pulse', 'retro-roulette',
      'quantum-coin-arena', 'timeline-racer', 'psi-poker', 'pk-influence',
      'precog-explorer', 'synchronicity-bingo', 'global-consciousness',
      'remote-viewing-images', 'remote-viewing-locations', 'remote-viewing-objects',
      'telepathy-ghost', 'telepathy-live', 'telepathy-emotions', 'ai-telepathy',
      'multi-party-telepathy', 'dream-journal', 'synchronicity', 'intuition',
      'retrocausality', 'memory-field', 'time-loop', 'psychokinesis', 'event-forecasting',
      'rv-crv-protocol',
    ]).withMessage('Invalid experiment type'),

  // Prediction text
  prediction: body('prediction')
    .trim()
    .notEmpty().withMessage('Prediction is required')
    .isLength({ max: 10000 }).withMessage('Prediction too long (max 10000 chars)')
    .escape(),

  // Commitment hash (64 char hex)
  commitmentHash: body('commitmentHash')
    .trim()
    .notEmpty().withMessage('Commitment hash is required')
    .isHexadecimal().withMessage('Commitment hash must be hexadecimal')
    .isLength({ min: 64, max: 64 }).withMessage('Commitment hash must be 64 characters'),

  // IPFS CID
  ipfsCid: body('ipfsCID')
    .optional()
    .trim()
    .matches(/^(Qm[a-zA-Z0-9]{44}|baf[a-z0-9]+)$/i).withMessage('Invalid IPFS CID format'),

  // Nonce (hex string)
  nonce: body('nonce')
    .trim()
    .notEmpty().withMessage('Nonce is required')
    .isHexadecimal().withMessage('Nonce must be hexadecimal')
    .isLength({ min: 32, max: 128 }).withMessage('Invalid nonce length'),

  // Score (0-100)
  score: body('score')
    .notEmpty().withMessage('Score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),

  // UUID parameter
  uuidParam: param('id')
    .trim()
    .notEmpty().withMessage('ID is required')
    .isLength({ min: 10, max: 100 }).withMessage('Invalid ID format'),

  // Session ID parameter
  sessionIdParam: param('sessionId')
    .trim()
    .notEmpty().withMessage('Session ID is required')
    .isLength({ min: 10, max: 100 }).withMessage('Invalid session ID format'),

  // Commitment ID parameter
  commitmentIdParam: param('commitmentId')
    .trim()
    .notEmpty().withMessage('Commitment ID is required')
    .isLength({ min: 10, max: 100 }).withMessage('Invalid commitment ID format'),

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],

  // Signature object (CIP-8)
  signature: body('signature')
    .notEmpty().withMessage('Signature is required')
    .isObject().withMessage('Signature must be an object'),

  signatureFields: [
    body('signature.signature')
      .notEmpty().withMessage('Signature.signature is required')
      .isHexadecimal().withMessage('Signature must be hexadecimal'),
    body('signature.key')
      .notEmpty().withMessage('Signature.key is required')
      .isHexadecimal().withMessage('Key must be hexadecimal'),
  ],

  // Metadata object
  metadata: body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object'),

  // Boolean verified flag
  verified: body('verified')
    .optional()
    .isBoolean().withMessage('Verified must be a boolean')
    .toBoolean(),

  // Stake amount in lovelace
  stakeLovelace: body('stakeLovelace')
    .optional()
    .isInt({ min: 1000000, max: 1000000000000 }).withMessage('Stake must be between 1 ADA and 1M ADA')
    .toInt(),

  // Transaction hash
  txHash: body('txHash')
    .optional()
    .trim()
    .isHexadecimal().withMessage('Transaction hash must be hexadecimal')
    .isLength({ min: 64, max: 64 }).withMessage('Transaction hash must be 64 characters'),

  // Target value (for reveal)
  targetValue: body('targetValue')
    .trim()
    .notEmpty().withMessage('Target value is required')
    .isLength({ max: 10000 }).withMessage('Target value too long'),

  // Impressions text
  impressions: body('impressions')
    .optional()
    .isLength({ max: 50000 }).withMessage('Impressions too long (max 50000 chars)'),
};

/**
 * Pre-built validation chains for common endpoints
 */
const validators = {
  // Auth - wallet challenge
  walletChallenge: [
    rules.walletAddress,
    validate,
  ],

  // Auth - wallet authentication
  walletAuth: [
    rules.walletAddress,
    rules.signature,
    ...rules.signatureFields,
    validate,
  ],

  // Create commitment
  createCommitment: [
    rules.walletAddressOptional,
    rules.experimentType,
    rules.prediction,
    rules.commitmentHash,
    rules.ipfsCid,
    rules.metadata,
    rules.verified,
    validate,
  ],

  // Reveal commitment
  revealCommitment: [
    rules.commitmentIdParam,
    rules.prediction,
    rules.nonce,
    rules.verified,
    validate,
  ],

  // Submit score
  submitScore: [
    rules.sessionIdParam,
    rules.score,
    validate,
  ],

  // Cardano session create
  cardanoSessionCreate: [
    rules.walletAddress,
    body('gameType').trim().notEmpty().withMessage('Game type is required'),
    rules.targetValue,
    rules.stakeLovelace,
    validate,
  ],

  // Generic ID param
  idParam: [
    rules.uuidParam,
    validate,
  ],

  // Pagination
  paginated: [
    ...rules.pagination,
    validate,
  ],
};

module.exports = {
  validate,
  rules,
  validators,
  body,
  param,
  query,
  validationResult,
};
