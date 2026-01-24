/**
 * IPFS Service - Routes through backend proxy (Pinata secrets stay server-side)
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';

class IPFSService {
  private getAuthHeader(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Upload JSON data to IPFS via backend proxy
   */
  async uploadJSON(data: unknown, metadata?: { name?: string; keyvalues?: Record<string, string> }): Promise<string> {
    try {
      const response = await axios.post(
        `${API_URL}/api/ipfs/pin`,
        { content: data, metadata },
        { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } }
      );

      console.log('[IPFSService] Upload successful:', response.data.ipfsHash);
      return response.data.ipfsHash;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[IPFSService] Upload error:', err.response?.data || err.message);
      throw new Error('Failed to upload to IPFS: ' + (err.response?.data?.error || err.message));
    }
  }

  /**
   * Retrieve data from IPFS by CID (direct gateway fetch, no secrets needed)
   */
  async retrieve(cid: string): Promise<unknown> {
    try {
      const url = `${IPFS_GATEWAY}/ipfs/${cid}`;
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
    return `${IPFS_GATEWAY}/ipfs/${cid}`;
  }

  /**
   * Unpin data from IPFS via backend proxy
   */
  async unpin(cid: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/api/ipfs/unpin/${cid}`, {
        headers: this.getAuthHeader(),
      });
      console.log('[IPFSService] Unpinned:', cid);
    } catch (error: unknown) {
      console.error('[IPFSService] Unpin error:', error);
      throw error;
    }
  }
}

export default new IPFSService();
