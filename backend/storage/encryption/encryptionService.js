const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 12; // 96 bits recommended for GCM
    this.tagLength = 16;
  }

  /**
   * Get the encryption key from environment, throw if missing
   */
  _getKey(password) {
    const key = password || process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required. Cannot encrypt/decrypt without it.');
    }
    // Derive a proper 32-byte key from the provided key material
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt data using AES-256-GCM (native crypto)
   * @param {any} data - Data to encrypt
   * @param {string} password - Encryption password (from env or user)
   * @returns {Object} - Encrypted data with IV, tag, and version
   */
  encrypt(data, password = null) {
    try {
      const key = this._getKey(password);
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(dataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: 'AES-256-GCM',
        version: '2.0',
      };
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt data - handles both v2.0 (native GCM) and legacy v1.0 (CryptoJS)
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} password - Decryption password
   * @returns {any} - Decrypted data
   */
  decrypt(encryptedData, password = null) {
    if (encryptedData.version === '2.0') {
      return this._decryptNative(encryptedData, password);
    }
    // Legacy path for data encrypted with CryptoJS (version 1.0 or unversioned)
    return this._decryptLegacy(encryptedData, password);
  }

  /**
   * Decrypt using native AES-256-GCM (v2.0)
   */
  _decryptNative(encryptedData, password) {
    try {
      const key = this._getKey(password);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error (v2):', error.message);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Decrypt legacy CryptoJS AES data (v1.0)
   */
  _decryptLegacy(encryptedData, password) {
    try {
      const key = password || process.env.ENCRYPTION_KEY;
      if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required for legacy decryption.');
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key);
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
      console.error('Decryption error (legacy):', error.message);
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
