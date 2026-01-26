/**
 * IPFS Service - Pinata Integration
 *
 * Handles IPFS storage via Pinata for experiment data.
 * Falls back to in-memory storage when Pinata is not configured.
 */

const axios = require('axios');
const crypto = require('crypto');

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

class IPFSService {
  constructor() {
    this.usePinata = !!(PINATA_API_KEY && PINATA_API_SECRET);
    this.storage = new Map(); // Fallback in-memory storage
    this.initialized = false;
  }

  /**
   * SECURITY: Validate IPFS CID format to prevent path traversal
   * Valid CIDs: Qm... (CIDv0), bafy... bafk... (CIDv1)
   */
  validateCID(cid) {
    if (!cid || typeof cid !== 'string') {
      return false;
    }
    // CIDv0: Starts with Qm, 46 characters (base58btc encoded)
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    // CIDv1: Starts with bafy/bafk (base32 encoded), variable length
    const cidV1Regex = /^(bafy|bafk)[a-z2-7]{50,}$/i;
    // Also allow mock CIDs for development
    const mockCidRegex = /^mock_[a-f0-9]{64}$/;

    return cidV0Regex.test(cid) || cidV1Regex.test(cid) || mockCidRegex.test(cid);
  }

  async initialize() {
    if (this.initialized) return;

    if (this.usePinata) {
      try {
        // Test Pinata connection
        const response = await axios.get(
          'https://api.pinata.cloud/data/testAuthentication',
          {
            headers: {
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_API_SECRET,
            },
          }
        );
        console.log('[IPFS] Connected to Pinata:', response.data.message);
      } catch (error) {
        console.warn('[IPFS] Pinata connection failed, using mock mode:', error.message);
        this.usePinata = false;
      }
    } else {
      console.log('[IPFS] No Pinata credentials - using in-memory mock mode');
    }

    this.initialized = true;
  }

  /**
   * Upload JSON data to IPFS
   * @param {Object} data - JSON data to upload
   * @param {Object} metadata - Optional metadata (name, keyvalues)
   * @returns {Object} - { IpfsHash, PinSize, Timestamp }
   */
  async uploadJSON(data, metadata = {}) {
    await this.initialize();

    if (this.usePinata) {
      return this.pinataUploadJSON(data, metadata);
    }

    return this.mockUpload(data, metadata);
  }

  /**
   * Retrieve JSON data from IPFS
   * @param {string} cid - IPFS CID/hash
   * @returns {Object} - Retrieved data
   */
  async retrieve(cid) {
    await this.initialize();

    // SECURITY: Validate CID format to prevent path traversal
    if (!this.validateCID(cid)) {
      console.error('[IPFS] Invalid CID format rejected:', cid?.substring(0, 20));
      throw new Error('Invalid IPFS CID format');
    }

    if (this.usePinata) {
      return this.pinataRetrieve(cid);
    }

    return this.mockRetrieve(cid);
  }

  /**
   * Upload to Pinata
   */
  async pinataUploadJSON(data, metadata) {
    try {
      const body = {
        pinataContent: data,
        pinataMetadata: {
          name: metadata.name || `Cognosis_${Date.now()}`,
          keyvalues: metadata.keyvalues || {},
        },
        pinataOptions: {
          cidVersion: 1, // Use CIDv1 for better compatibility
        },
      };

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        body,
        {
          headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_API_SECRET,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[IPFS] Pinned to Pinata:', response.data.IpfsHash);

      return {
        IpfsHash: response.data.IpfsHash,
        PinSize: response.data.PinSize,
        Timestamp: response.data.Timestamp,
      };
    } catch (error) {
      console.error('[IPFS] Pinata upload error:', error.response?.data || error.message);
      throw new Error('Failed to upload to IPFS: ' + error.message);
    }
  }

  /**
   * Retrieve from Pinata/IPFS gateway
   */
  async pinataRetrieve(cid) {
    try {
      // Use Pinata gateway for retrieval
      const response = await axios.get(`${PINATA_GATEWAY}/ipfs/${cid}`, {
        timeout: 30000, // 30 second timeout
      });

      return response.data;
    } catch (error) {
      console.error('[IPFS] Retrieve error:', error.message);

      // Try public gateway as fallback
      try {
        const fallbackResponse = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
          timeout: 30000,
        });
        return fallbackResponse.data;
      } catch (fallbackError) {
        throw new Error('Failed to retrieve from IPFS: ' + error.message);
      }
    }
  }

  /**
   * Unpin from Pinata
   */
  async unpin(cid) {
    if (!this.usePinata) {
      this.storage.delete(cid);
      return { success: true };
    }

    try {
      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('[IPFS] Unpin error:', error.message);
      throw new Error('Failed to unpin: ' + error.message);
    }
  }

  /**
   * Mock upload (in-memory storage)
   */
  mockUpload(data, metadata) {
    // Generate a mock CID that looks like a real one
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(data) + Date.now())
      .digest('hex');
    const cid = `bafkreia${hash.substring(0, 52)}`;

    this.storage.set(cid, {
      data,
      metadata,
      timestamp: new Date().toISOString(),
    });

    return {
      IpfsHash: cid,
      PinSize: JSON.stringify(data).length,
      Timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mock retrieve (from in-memory storage)
   */
  mockRetrieve(cid) {
    const stored = this.storage.get(cid);
    if (!stored) {
      throw new Error('Data not found in mock IPFS storage');
    }
    return stored.data;
  }

  /**
   * Upload encrypted data
   */
  async encryptAndUpload(data, encryptionKey) {
    // This method expects data already encrypted by the client
    // Just upload it as-is
    return this.uploadJSON({ encryptedData: data }, {
      name: `Encrypted_${Date.now()}`,
      keyvalues: { encrypted: 'true' },
    });
  }

  /**
   * Download data (client handles decryption)
   */
  async download(cid) {
    return this.retrieve(cid);
  }

  /**
   * Upload plain data
   */
  async upload(data) {
    const result = await this.uploadJSON(data, {
      name: `Data_${Date.now()}`,
    });
    return result.IpfsHash;
  }

  /**
   * Check service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      usePinata: this.usePinata,
      mockStorageCount: this.storage.size,
    };
  }
}

module.exports = new IPFSService();
