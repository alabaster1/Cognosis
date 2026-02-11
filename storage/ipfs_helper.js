/**
 * IPFS Helper - Production Pinning Service
 *
 * Purpose: Upload blobs to IPFS and pin them using production pinning services.
 * Supports: Pinata, Blockfrost, local IPFS daemon
 *
 * Environment Variables:
 * - IPFS_GATEWAY - Gateway URL (default: https://ipfs.io)
 * - PINNING_SERVICE - Service name: pinata|blockfrost|local
 * - PINNING_API_KEY - API key for pinning service
 * - PINNING_API_SECRET - API secret (Pinata only)
 * - IPFS_HOST - Local daemon host (local mode only)
 * - IPFS_PORT - Local daemon port (local mode only)
 *
 * Usage:
 *   const ipfs = require('./storage/ipfs_helper');
 *   const result = await ipfs.uploadBuffer(buffer, 'filename.enc');
 *   console.log(result.cid); // bafybeig...
 */

const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

class IPFSHelper {
  constructor() {
    this.gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io';
    this.pinningService = process.env.PINNING_SERVICE || 'mock';
    this.apiKey = process.env.PINNING_API_KEY;
    this.apiSecret = process.env.PINNING_API_SECRET;
    this.host = process.env.IPFS_HOST || 'localhost';
    this.port = process.env.IPFS_PORT || 5001;

    // In-memory storage for mock mode
    this.mockStorage = new Map();

    console.log(`IPFS Helper initialized: ${this.pinningService} mode`);
  }

  /**
   * Upload buffer to IPFS and pin
   *
   * @param {Buffer} buffer - Data to upload
   * @param {string} filename - Optional filename
   * @returns {Promise<{cid: string, size: number, pinStatus: string}>}
   */
  async uploadBuffer(buffer, filename = 'file') {
    switch (this.pinningService) {
      case 'pinata':
        return await this._uploadToPinata(buffer, filename);
      case 'blockfrost':
        return await this._uploadToBlockfrost(buffer, filename);
      case 'local':
        return await this._uploadToLocal(buffer, filename);
      default:
        return await this._mockUpload(buffer, filename);
    }
  }

  /**
   * Upload to Pinata pinning service
   * Docs: https://docs.pinata.cloud/
   */
  async _uploadToPinata(buffer, filename) {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('Pinata credentials not configured');
      }

      const formData = new FormData();
      formData.append('file', buffer, { filename });

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          },
          maxBodyLength: Infinity
        }
      );

      console.log(`✓ Uploaded to Pinata: ${response.data.IpfsHash}`);

      return {
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        pinStatus: 'pinned',
        gateway: `${this.gateway}/ipfs/${response.data.IpfsHash}`
      };
    } catch (error) {
      console.error('Pinata upload error:', error.message);
      throw new Error(`Pinata upload failed: ${error.message}`);
    }
  }

  /**
   * Upload to Blockfrost IPFS service
   * Docs: https://docs.blockfrost.io/
   */
  async _uploadToBlockfrost(buffer, filename) {
    try {
      if (!this.apiKey) {
        throw new Error('Blockfrost API key not configured');
      }

      const formData = new FormData();
      formData.append('file', buffer, { filename });

      const response = await axios.post(
        'https://ipfs.blockfrost.io/api/v0/ipfs/add',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'project_id': this.apiKey
          },
          maxBodyLength: Infinity
        }
      );

      console.log(`✓ Uploaded to Blockfrost: ${response.data.ipfs_hash}`);

      return {
        cid: response.data.ipfs_hash,
        size: response.data.size,
        pinStatus: 'pinned',
        gateway: `${this.gateway}/ipfs/${response.data.ipfs_hash}`
      };
    } catch (error) {
      console.error('Blockfrost upload error:', error.message);
      throw new Error(`Blockfrost upload failed: ${error.message}`);
    }
  }

  /**
   * Upload to local IPFS daemon
   * Requires: ipfs daemon running on localhost:5001
   */
  async _uploadToLocal(buffer, filename) {
    try {
      const formData = new FormData();
      formData.append('file', buffer, { filename });

      const response = await axios.post(
        `http://${this.host}:${this.port}/api/v0/add`,
        formData,
        {
          headers: formData.getHeaders(),
          params: {
            pin: true,
            'cid-version': 1
          }
        }
      );

      const data = response.data;
      const cid = data.Hash;

      console.log(`✓ Uploaded to local IPFS: ${cid}`);

      return {
        cid,
        size: data.Size,
        pinStatus: 'pinned',
        gateway: `http://${this.host}:8080/ipfs/${cid}`
      };
    } catch (error) {
      console.error('Local IPFS upload error:', error.message);
      throw new Error(`Local IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Mock upload for development/testing
   * Stores in memory and returns mock CID
   */
  async _mockUpload(buffer, filename) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const mockCID = `bafybei${hash.substring(0, 52)}`;

    this.mockStorage.set(mockCID, {
      buffer,
      filename,
      timestamp: Date.now()
    });

    console.log(`✓ Mock upload: ${mockCID} (${buffer.length} bytes)`);

    return {
      cid: mockCID,
      size: buffer.length,
      pinStatus: 'pinned (mock)',
      gateway: `${this.gateway}/ipfs/${mockCID}`
    };
  }

  /**
   * Download from IPFS by CID
   *
   * @param {string} cid - Content identifier
   * @returns {Promise<Buffer>}
   */
  async download(cid) {
    // Try mock storage first
    if (this.mockStorage.has(cid)) {
      return this.mockStorage.get(cid).buffer;
    }

    try {
      const response = await axios.get(`${this.gateway}/ipfs/${cid}`, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('IPFS download error:', error.message);
      throw new Error(`Failed to download from IPFS: ${error.message}`);
    }
  }

  /**
   * Check pin status
   *
   * @param {string} cid - Content identifier
   * @returns {Promise<{pinned: boolean, service: string}>}
   */
  async checkPinStatus(cid) {
    switch (this.pinningService) {
      case 'pinata':
        return await this._checkPinataPinStatus(cid);
      case 'blockfrost':
        return await this._checkBlockfrostPinStatus(cid);
      case 'local':
        return await this._checkLocalPinStatus(cid);
      default:
        return {
          pinned: this.mockStorage.has(cid),
          service: 'mock'
        };
    }
  }

  async _checkPinataPinStatus(cid) {
    try {
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?hashContains=${cid}`,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          }
        }
      );

      return {
        pinned: response.data.count > 0,
        service: 'pinata'
      };
    } catch (error) {
      console.error('Pinata pin status error:', error.message);
      return { pinned: false, service: 'pinata', error: error.message };
    }
  }

  async _checkBlockfrostPinStatus(cid) {
    try {
      const response = await axios.get(
        `https://ipfs.blockfrost.io/api/v0/ipfs/pin/list/${cid}`,
        {
          headers: {
            'project_id': this.apiKey
          }
        }
      );

      return {
        pinned: response.data.state === 'pinned',
        service: 'blockfrost'
      };
    } catch (error) {
      console.error('Blockfrost pin status error:', error.message);
      return { pinned: false, service: 'blockfrost', error: error.message };
    }
  }

  async _checkLocalPinStatus(cid) {
    try {
      const response = await axios.post(
        `http://${this.host}:${this.port}/api/v0/pin/ls`,
        null,
        {
          params: { arg: cid, type: 'recursive' }
        }
      );

      return {
        pinned: Object.keys(response.data.Keys || {}).includes(cid),
        service: 'local'
      };
    } catch (error) {
      console.error('Local IPFS pin status error:', error.message);
      return { pinned: false, service: 'local', error: error.message };
    }
  }

  /**
   * Unpin from IPFS (for cleanup)
   *
   * @param {string} cid - Content identifier
   */
  async unpin(cid) {
    switch (this.pinningService) {
      case 'pinata':
        return await this._unpinFromPinata(cid);
      case 'blockfrost':
        return await this._unpinFromBlockfrost(cid);
      case 'local':
        return await this._unpinFromLocal(cid);
      default:
        this.mockStorage.delete(cid);
        return { success: true, service: 'mock' };
    }
  }

  async _unpinFromPinata(cid) {
    try {
      await axios.delete(
        `https://api.pinata.cloud/pinning/unpin/${cid}`,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          }
        }
      );

      return { success: true, service: 'pinata' };
    } catch (error) {
      throw new Error(`Pinata unpin failed: ${error.message}`);
    }
  }

  async _unpinFromBlockfrost(cid) {
    try {
      await axios.post(
        `https://ipfs.blockfrost.io/api/v0/ipfs/pin/remove/${cid}`,
        null,
        {
          headers: {
            'project_id': this.apiKey
          }
        }
      );

      return { success: true, service: 'blockfrost' };
    } catch (error) {
      throw new Error(`Blockfrost unpin failed: ${error.message}`);
    }
  }

  async _unpinFromLocal(cid) {
    try {
      await axios.post(
        `http://${this.host}:${this.port}/api/v0/pin/rm`,
        null,
        {
          params: { arg: cid }
        }
      );

      return { success: true, service: 'local' };
    } catch (error) {
      throw new Error(`Local IPFS unpin failed: ${error.message}`);
    }
  }

  /**
   * Get gateway URL for a CID
   *
   * @param {string} cid - Content identifier
   * @returns {string} - Full gateway URL
   */
  getGatewayUrl(cid) {
    return `${this.gateway}/ipfs/${cid}`;
  }

  /**
   * Validate CID format
   *
   * @param {string} cid - Content identifier
   * @returns {boolean}
   */
  isValidCID(cid) {
    // Basic CID validation (CIDv0 or CIDv1)
    const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidv1Regex = /^bafy[a-z0-9]{50,}$/;

    return cidv0Regex.test(cid) || cidv1Regex.test(cid);
  }
}

// Export singleton instance
module.exports = new IPFSHelper();
