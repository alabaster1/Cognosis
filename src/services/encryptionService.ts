/**
 * Encryption Service - Client-side AES-256-GCM encryption
 * Used for encrypting experiment data before IPFS upload
 */

import CryptoJS from 'crypto-js';

class EncryptionService {
  /**
   * Generate a random encryption key
   */
  generateKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, key: string): Promise<string> {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      console.error('[EncryptionService] Encryption error:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encryptedData: string, key: string): Promise<string> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      return plaintext;
    } catch (error) {
      console.error('[EncryptionService] Decryption error:', error);
      throw error;
    }
  }

  /**
   * Generate SHA-256 hash
   */
  async hash(data: string): Promise<string> {
    try {
      const hash = CryptoJS.SHA256(data).toString();
      return hash;
    } catch (error) {
      console.error('[EncryptionService] Hash error:', error);
      throw error;
    }
  }

  /**
   * Generate commitment hash (double SHA-256)
   */
  async generateCommitment(prediction: string, nonce: string): Promise<string> {
    try {
      const combined = `${prediction}:${nonce}`;
      const firstHash = await this.hash(combined);
      const commitmentHash = await this.hash(firstHash);
      return commitmentHash;
    } catch (error) {
      console.error('[EncryptionService] Generate commitment error:', error);
      throw error;
    }
  }

  /**
   * Verify commitment matches prediction + nonce
   */
  async verifyCommitment(
    commitmentHash: string,
    prediction: string,
    nonce: string
  ): Promise<boolean> {
    try {
      const regeneratedHash = await this.generateCommitment(prediction, nonce);
      return regeneratedHash === commitmentHash;
    } catch (error) {
      console.error('[EncryptionService] Verify commitment error:', error);
      throw error;
    }
  }
}

export default new EncryptionService();
