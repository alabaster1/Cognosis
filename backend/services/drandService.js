/**
 * drand Service - Verifiable Randomness from drand Beacon
 * Uses drand quicknet chain (free, decentralized, 3-second rounds)
 */

const crypto = require('crypto');
const axios = require('axios');

const DRAND_URLS = [
  'https://api.drand.sh',
  'https://drand.cloudflare.com',
];

// drand quicknet chain hash
const QUICKNET_CHAIN_HASH = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';

class DrandService {
  constructor() {
    this.timeout = 3000;
  }

  /**
   * Get the latest beacon from drand quicknet
   * @returns {{ round: number, randomness: string, signature: string, source: string }}
   */
  async getLatestBeacon() {
    for (const baseUrl of DRAND_URLS) {
      try {
        const url = `${baseUrl}/${QUICKNET_CHAIN_HASH}/public/latest`;
        const response = await axios.get(url, { timeout: this.timeout });

        const { round, randomness, signature } = response.data;

        return {
          round,
          randomness,
          signature,
          source: 'drand_quicknet',
        };
      } catch (error) {
        console.warn(`[drand] Failed to fetch from ${baseUrl}:`, error.message);
        continue;
      }
    }

    // Fallback: cryptographic randomness
    console.warn('[drand] All endpoints unavailable, falling back to crypto.randomBytes');
    return {
      round: Date.now(),
      randomness: crypto.randomBytes(32).toString('hex'),
      signature: null,
      source: 'crypto_random',
    };
  }

  /**
   * Get a specific beacon round
   * @param {number} round - The round number to fetch
   */
  async getBeacon(round) {
    for (const baseUrl of DRAND_URLS) {
      try {
        const url = `${baseUrl}/${QUICKNET_CHAIN_HASH}/public/${round}`;
        const response = await axios.get(url, { timeout: this.timeout });

        return {
          round: response.data.round,
          randomness: response.data.randomness,
          signature: response.data.signature,
          source: 'drand_quicknet',
        };
      } catch (error) {
        continue;
      }
    }

    return {
      round,
      randomness: crypto.randomBytes(32).toString('hex'),
      signature: null,
      source: 'crypto_random',
    };
  }

  /**
   * Derive a deterministic index from beacon randomness using HMAC-SHA256
   * @param {string} randomnessHex - The beacon's randomness hex string
   * @param {string} purpose - A purpose string for domain separation
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} A deterministic index in [0, max)
   */
  deriveIndex(randomnessHex, purpose, max) {
    const hmac = crypto.createHmac('sha256', randomnessHex);
    hmac.update(purpose);
    const hash = hmac.digest();

    // Use first 4 bytes as uint32 and mod by max
    const value = hash.readUInt32BE(0);
    return value % max;
  }

  /**
   * Derive multiple unique indices from beacon randomness
   * @param {string} randomnessHex - The beacon's randomness hex string
   * @param {string} purpose - Base purpose string
   * @param {number} count - Number of indices to derive
   * @param {number} max - Maximum value (exclusive)
   * @returns {number[]} Array of unique indices
   */
  deriveUniqueIndices(randomnessHex, purpose, count, max) {
    if (count > max) {
      throw new Error(`Cannot derive ${count} unique indices from range [0, ${max})`);
    }

    const indices = new Set();
    let attempt = 0;

    while (indices.size < count) {
      const idx = this.deriveIndex(randomnessHex, `${purpose}-${attempt}`, max);
      indices.add(idx);
      attempt++;
    }

    return Array.from(indices);
  }

  /**
   * Derive a deterministic permutation (Fisher-Yates with drand seed)
   * @param {number} length - Length of array to permute
   * @param {string} randomnessHex - The beacon's randomness hex string
   * @param {string} purpose - Purpose string for domain separation
   * @returns {number[]} A permuted array of indices [0, length)
   */
  derivePermutation(length, randomnessHex, purpose) {
    const arr = Array.from({ length }, (_, i) => i);

    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.deriveIndex(randomnessHex, `${purpose}-shuffle-${i}`, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  /**
   * Check if drand is available (connectivity test)
   * @returns {boolean}
   */
  async isAvailable() {
    try {
      const url = `${DRAND_URLS[0]}/${QUICKNET_CHAIN_HASH}/info`;
      await axios.get(url, { timeout: this.timeout });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new DrandService();
