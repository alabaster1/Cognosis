/**
 * IPFS Service - Pinata integration for decentralized storage
 */

import axios from 'axios';

class IPFSService {
  private apiKey: string;
  private apiSecret: string;
  private gatewayUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
    this.apiSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET || '';
    this.gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
  }

  /**
   * Upload JSON data to IPFS via Pinata
   */
  async uploadJSON(data: unknown, metadata?: { name?: string; keyvalues?: Record<string, string> }): Promise<string> {
    try {
      const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

      const body = {
        pinataContent: data,
        pinataMetadata: {
          name: metadata?.name || `Cognosis_${Date.now()}`,
          keyvalues: metadata?.keyvalues || {},
        },
      };

      const response = await axios.post(url, body, {
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
          'Content-Type': 'application/json',
        },
      });

      console.log('[IPFSService] Upload successful:', response.data.IpfsHash);
      return response.data.IpfsHash;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[IPFSService] Upload error:', err.response?.data || err.message);
      throw new Error('Failed to upload to IPFS: ' + (err.response?.data?.error || err.message));
    }
  }

  /**
   * Retrieve data from IPFS by CID
   */
  async retrieve(cid: string): Promise<unknown> {
    try {
      const url = `${this.gatewayUrl}/ipfs/${cid}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error: unknown) {
      console.error('[IPFSService] Retrieve error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Failed to retrieve from IPFS: ' + message);
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `${this.gatewayUrl}/ipfs/${cid}`;
  }

  /**
   * Unpin data from Pinata (optional cleanup)
   */
  async unpin(cid: string): Promise<void> {
    try {
      const url = `https://api.pinata.cloud/pinning/unpin/${cid}`;
      await axios.delete(url, {
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
        },
      });
      console.log('[IPFSService] Unpinned:', cid);
    } catch (error: unknown) {
      console.error('[IPFSService] Unpin error:', error);
      throw error;
    }
  }
}

export default new IPFSService();
