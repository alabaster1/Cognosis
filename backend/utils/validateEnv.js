/**
 * Runtime environment validation.
 * Fail fast in production when required configuration is missing.
 */

function requiredEnvKeys() {
  const keys = ['DATABASE_URL', 'JWT_SECRET'];

  // Blockfrost is required in production unless explicitly allowing mock mode.
  const allowMock = process.env.ALLOW_MOCK_BLOCKCHAIN === 'true';
  if (!allowMock) {
    keys.push('BLOCKFROST_API_KEY');
  }

  return keys;
}

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const missing = requiredEnvKeys().filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

module.exports = { validateEnv };

