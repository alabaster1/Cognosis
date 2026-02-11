/**
 * LLM Helper for Agents
 * Provides lazy-initialized LLM access using OpenAI
 */

const config = require('../config');
const OpenAI = require('openai');

let client = null;

/**
 * Get OpenAI client instance (lazy initialization)
 */
function getClient() {
  if (!client) {
    const apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[LLMHelper] OPENAI_API_KEY not set - AI features will be limited');
      return null;
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/**
 * Parse JSON from LLM response
 */
function parseJsonResponse(text) {
  let content = text.trim();
  if (content.startsWith('```')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  return JSON.parse(content);
}

/**
 * Generate chat completion
 */
async function chatCompletion({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000 }) {
  const openai = getClient();
  if (!openai) {
    throw new Error('LLM not available - OPENAI_API_KEY not configured');
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const result = await openai.chat.completions.create({
    model: config.openai?.model || 'gpt-4o-mini',
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return result.choices[0].message.content;
}

/**
 * Generate embeddings (using simple hash-based fallback since this is a utility)
 * For production, consider using a dedicated embedding service
 */
async function generateEmbedding(text) {
  // Simple hash-based pseudo-embedding for MVP
  // In production, use a proper embedding API
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(text).digest();

  // Convert to 1536-dimension vector (simulating OpenAI embedding size)
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < hash.length && i < embedding.length; i++) {
    embedding[i] = (hash[i] / 255) - 0.5; // Normalize to -0.5 to 0.5 range
  }

  // Add some variation based on text content
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length && i < 100; i++) {
    const wordHash = crypto.createHash('md5').update(words[i]).digest();
    for (let j = 0; j < Math.min(16, wordHash.length); j++) {
      const idx = (i * 16 + j) % embedding.length;
      embedding[idx] += (wordHash[j] / 255 - 0.5) * 0.1;
    }
  }

  return embedding;
}

/**
 * Check if LLM is available
 */
function isAvailable() {
  return !!(config.openai?.apiKey || process.env.OPENAI_API_KEY);
}

module.exports = {
  getModel: getClient,
  parseJsonResponse,
  chatCompletion,
  generateEmbedding,
  isAvailable,
};
