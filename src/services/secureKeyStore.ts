/**
 * Secure Key Store
 *
 * Secure storage for encryption keys with defense-in-depth:
 * 1. In-memory primary storage (safest, but lost on reload)
 * 2. sessionStorage backup (cleared on tab close)
 * 3. Optional encrypted backup to backend
 *
 * Security improvements over localStorage:
 * - Keys cleared on tab close (sessionStorage)
 * - In-memory cache prevents unnecessary storage access
 * - Keys obfuscated in storage (not plain hex)
 * - Automatic cleanup of expired keys
 */

import CryptoJS from 'crypto-js';

interface StoredKey {
  key: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  commitmentId: string;
}

// Key expiry: 7 days (matches typical reveal window)
const KEY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Storage key prefix (obfuscated)
const STORAGE_PREFIX = '_cg_k_';

class SecureKeyStore {
  private memoryCache: Map<string, StoredKey> = new Map();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized) return;

    // Load from sessionStorage into memory
    this.loadFromStorage();

    // Set up cleanup interval
    setInterval(() => this.cleanupExpired(), 60000); // Every minute

    // Warn user about page unload if they have pending experiments
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    this.initialized = true;
  }

  private handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.memoryCache.size > 0) {
      // User has unrevealed experiments - warn them
      const message = 'You have unrevealed experiments. Closing this tab may cause you to lose access to your experiment data.';
      e.preventDefault();
      e.returnValue = message;
      return message;
    }
  };

  /**
   * Store encryption key and nonce for an experiment
   */
  store(commitmentId: string, key: string, nonce: string, expiresAt?: number): void {
    const entry: StoredKey = {
      key: this.obfuscate(key),
      nonce: this.obfuscate(nonce),
      createdAt: Date.now(),
      expiresAt: expiresAt || Date.now() + KEY_EXPIRY_MS,
      commitmentId,
    };

    // Store in memory (primary)
    this.memoryCache.set(commitmentId, entry);

    // Backup to sessionStorage
    this.saveToStorage();
  }

  /**
   * Retrieve encryption key and nonce
   */
  retrieve(commitmentId: string): { key: string; nonce: string } | null {
    const entry = this.memoryCache.get(commitmentId);

    if (!entry) {
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      this.remove(commitmentId);
      return null;
    }

    return {
      key: this.deobfuscate(entry.key),
      nonce: this.deobfuscate(entry.nonce),
    };
  }

  /**
   * Remove key after successful reveal
   */
  remove(commitmentId: string): void {
    this.memoryCache.delete(commitmentId);
    this.saveToStorage();
  }

  /**
   * Check if key exists for commitment
   */
  has(commitmentId: string): boolean {
    return this.memoryCache.has(commitmentId);
  }

  /**
   * Get all pending commitment IDs
   */
  getPendingCommitments(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Get count of pending experiments
   */
  getPendingCount(): number {
    return this.memoryCache.size;
  }

  /**
   * Simple obfuscation (not encryption, just to prevent casual inspection)
   * Real protection comes from sessionStorage + in-memory storage
   */
  private obfuscate(value: string): string {
    // XOR with a fixed key and base64 encode
    const xorKey = 'cg_secure_2024';
    let result = '';
    for (let i = 0; i < value.length; i++) {
      result += String.fromCharCode(
        value.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length)
      );
    }
    return btoa(result);
  }

  private deobfuscate(value: string): string {
    const xorKey = 'cg_secure_2024';
    const decoded = atob(value);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length)
      );
    }
    return result;
  }

  /**
   * Save memory cache to sessionStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = JSON.stringify(Array.from(this.memoryCache.entries()));
      sessionStorage.setItem(STORAGE_PREFIX + 'data', this.obfuscate(data));
    } catch (error) {
      console.warn('[SecureKeyStore] Failed to save to sessionStorage:', error);
    }
  }

  /**
   * Load from sessionStorage to memory
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = sessionStorage.getItem(STORAGE_PREFIX + 'data');
      if (stored) {
        const data = JSON.parse(this.deobfuscate(stored));
        this.memoryCache = new Map(data);
        this.cleanupExpired();
      }
    } catch (error) {
      console.warn('[SecureKeyStore] Failed to load from sessionStorage:', error);
      this.memoryCache = new Map();
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(id);
      }
    }
    this.saveToStorage();
  }

  /**
   * Clear all stored keys (use with caution!)
   */
  clearAll(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_PREFIX + 'data');
    }
  }

  /**
   * Export keys for backup (encrypted with user password)
   * User should store this securely
   */
  exportEncrypted(password: string): string {
    const data = JSON.stringify(Array.from(this.memoryCache.entries()));
    return CryptoJS.AES.encrypt(data, password).toString();
  }

  /**
   * Import keys from encrypted backup
   */
  importEncrypted(encryptedData: string, password: string): boolean {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      this.memoryCache = new Map(data);
      this.saveToStorage();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
const secureKeyStore = new SecureKeyStore();
export default secureKeyStore;
