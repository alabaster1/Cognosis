const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits for GCM
    this.saltLength = 64;
    this.tagLength = 16;
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {any} data - Data to encrypt
   * @param {string} password - Encryption password (from env or user)
   * @returns {Object} - Encrypted data with IV and salt
   */
  encrypt(data, password = null) {
    try {
      const encryptionKey = password || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      // Using CryptoJS for client-side compatibility
      const encrypted = CryptoJS.AES.encrypt(dataString, encryptionKey).toString();

      return {
        encrypted,
        algorithm: 'AES-256',
        version: '1.0'
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} password - Decryption password
   * @returns {any} - Decrypted data
   */
  decrypt(encryptedData, password = null) {
    try {
      const encryptionKey = password || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

      const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error('Decryption failed - invalid password or corrupted data');
      }

      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate hash of data for blockchain commitment
   * @param {any} data - Data to hash
   * @returns {string} - SHA-256 hash
   */
  hash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate a random encryption key
   * @returns {string} - Random hex key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Verify hash matches data
   * @param {any} data - Original data
   * @param {string} hash - Hash to verify
   * @returns {boolean} - True if hash matches
   */
  verifyHash(data, hash) {
    const computedHash = this.hash(data);
    return computedHash === hash;
  }
}

module.exports = new EncryptionService();
