/**
 * Embedding Service - OpenAI text-embedding-3-small
 * Provides semantic similarity scoring via cosine similarity of embeddings
 */

const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

class EmbeddingService {
  constructor() {
    // LRU cache (max 500 entries)
    this.cache = new Map();
    this.maxCacheSize = 500;
  }

  /**
   * Check if the embedding service is available (has API key)
   */
  isAvailable() {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Get embedding for a single text
   * @param {string} text
   * @returns {number[]} 1536-dimensional vector
   */
  async getEmbedding(text) {
    const normalized = text.trim().toLowerCase();

    // Check cache
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized);
    }

    const embeddings = await this._callAPI([normalized]);
    const vector = embeddings[0];

    this._cacheSet(normalized, vector);
    return vector;
  }

  /**
   * Get embeddings for multiple texts in a single API call
   * @param {string[]} texts
   * @returns {number[][]} Array of 1536-dimensional vectors
   */
  async getEmbeddings(texts) {
    const normalized = texts.map(t => t.trim().toLowerCase());

    // Check which need API calls
    const uncached = [];
    const uncachedIndices = [];

    for (let i = 0; i < normalized.length; i++) {
      if (!this.cache.has(normalized[i])) {
        uncached.push(normalized[i]);
        uncachedIndices.push(i);
      }
    }

    // Fetch uncached embeddings
    if (uncached.length > 0) {
      const newEmbeddings = await this._callAPI(uncached);
      for (let i = 0; i < uncached.length; i++) {
        this._cacheSet(uncached[i], newEmbeddings[i]);
      }
    }

    // Build result from cache
    return normalized.map(t => this.cache.get(t));
  }

  /**
   * Compute cosine similarity between two vectors
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number} Similarity in [-1, 1]
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  /**
   * Convert cosine similarity to warmth level
   * Calibrated thresholds for text-embedding-3-small:
   *   Random pairs average ~0.20-0.25 similarity
   *   Related concepts ~0.40-0.60
   *   Synonyms/paraphrases ~0.60-0.80
   *   Near-identical ~0.80+
   */
  similarityToWarmth(sim) {
    if (sim >= 0.75) return 'burning';
    if (sim >= 0.60) return 'veryWarm';
    if (sim >= 0.50) return 'warm';
    if (sim >= 0.40) return 'lukewarm';
    if (sim >= 0.30) return 'cool';
    return 'cold';
  }

  /**
   * Convert warmth to numeric score (0-100)
   */
  warmthToScore(warmth) {
    const scores = {
      burning: 100,
      veryWarm: 80,
      warm: 60,
      lukewarm: 40,
      cool: 20,
      cold: 0,
    };
    return scores[warmth] || 0;
  }

  /**
   * Compute similarity between text and a target, returning warmth + raw score
   * @param {string} text - User's guess/response
   * @param {string} target - The target concept
   * @returns {{ similarity: number, warmth: string, score: number }}
   */
  async computeSimilarity(text, target) {
    const [textEmb, targetEmb] = await this.getEmbeddings([text, target]);
    const similarity = this.cosineSimilarity(textEmb, targetEmb);
    const warmth = this.similarityToWarmth(similarity);
    const score = this.warmthToScore(warmth);

    return { similarity, warmth, score };
  }

  /**
   * Call OpenAI embeddings API
   * @private
   */
  async _callAPI(texts) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          input: texts,
          model: MODEL,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      // Sort by index to ensure correct order
      const sorted = response.data.data.sort((a, b) => a.index - b.index);
      return sorted.map(item => item.embedding);
    } catch (error) {
      console.error('[EmbeddingService] API error:', error.response?.data || error.message);
      throw new Error(`Embedding API failed: ${error.message}`);
    }
  }

  /**
   * LRU cache set with eviction
   * @private
   */
  _cacheSet(key, value) {
    // If at max, delete oldest entry
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

module.exports = new EmbeddingService();
