/**
 * IPFS Helper Test Suite
 *
 * Tests for IPFS upload, pinning, and retrieval functionality.
 * Run with: npm test tests/test_ipfs_helper.js
 */

const ipfsHelper = require('../storage/ipfs_helper');

describe('IPFS Helper', () => {
  describe('Mock Mode', () => {
    test('should upload buffer and return CID', async () => {
      const buffer = Buffer.from('Hello, Cognosis!');
      const result = await ipfsHelper.uploadBuffer(buffer, 'test.txt');

      expect(result).toHaveProperty('cid');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('pinStatus');
      expect(result.size).toBe(buffer.length);
      expect(result.pinStatus).toContain('pinned');
      expect(result.cid).toMatch(/^bafy/); // CIDv1 format
    });

    test('should validate CID format', () => {
      const validCIDv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const validCIDv0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const invalidCID = 'not-a-valid-cid';

      expect(ipfsHelper.isValidCID(validCIDv1)).toBe(true);
      expect(ipfsHelper.isValidCID(validCIDv0)).toBe(true);
      expect(ipfsHelper.isValidCID(invalidCID)).toBe(false);
    });

    test('should download uploaded content', async () => {
      const originalContent = 'Test content for download';
      const buffer = Buffer.from(originalContent);

      const uploadResult = await ipfsHelper.uploadBuffer(buffer, 'download-test.txt');
      const downloadedBuffer = await ipfsHelper.download(uploadResult.cid);

      expect(downloadedBuffer.toString()).toBe(originalContent);
    });

    test('should check pin status', async () => {
      const buffer = Buffer.from('Pin status test');
      const uploadResult = await ipfsHelper.uploadBuffer(buffer, 'pin-test.txt');

      const status = await ipfsHelper.checkPinStatus(uploadResult.cid);

      expect(status).toHaveProperty('pinned');
      expect(status).toHaveProperty('service');
      expect(status.pinned).toBe(true);
    });

    test('should unpin content', async () => {
      const buffer = Buffer.from('Unpin test');
      const uploadResult = await ipfsHelper.uploadBuffer(buffer, 'unpin-test.txt');

      const unpinResult = await ipfsHelper.unpin(uploadResult.cid);

      expect(unpinResult).toHaveProperty('success');
      expect(unpinResult.success).toBe(true);

      // Verify it's unpinned
      const status = await ipfsHelper.checkPinStatus(uploadResult.cid);
      expect(status.pinned).toBe(false);
    });

    test('should get gateway URL for CID', () => {
      const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const url = ipfsHelper.getGatewayUrl(cid);

      expect(url).toContain('ipfs.io/ipfs/');
      expect(url).toContain(cid);
    });

    test('should handle large files', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      largeBuffer.fill('x');

      const result = await ipfsHelper.uploadBuffer(largeBuffer, 'large-file.bin');

      expect(result.cid).toBeDefined();
      expect(result.size).toBe(largeBuffer.length);
    });

    test('should handle binary data', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);
      const result = await ipfsHelper.uploadBuffer(binaryData, 'binary.dat');

      expect(result.cid).toBeDefined();

      const downloaded = await ipfsHelper.download(result.cid);
      expect(downloaded).toEqual(binaryData);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid CID on download', async () => {
      await expect(
        ipfsHelper.download('invalid-cid-12345')
      ).rejects.toThrow();
    });

    test('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await ipfsHelper.uploadBuffer(emptyBuffer, 'empty.txt');

      expect(result.cid).toBeDefined();
      expect(result.size).toBe(0);
    });
  });

  describe('Gateway Configuration', () => {
    test('should use configured gateway', () => {
      const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io';
      const cid = 'bafytest123';
      const url = ipfsHelper.getGatewayUrl(cid);

      expect(url).toContain(gateway);
    });
  });
});

// Integration tests (only run if pinning service is configured)
if (process.env.PINNING_SERVICE && process.env.PINNING_SERVICE !== 'mock') {
  describe('Production Pinning Service Integration', () => {
    test('should upload to real pinning service', async () => {
      const buffer = Buffer.from('Production pinning test');
      const result = await ipfsHelper.uploadBuffer(buffer, 'prod-test.txt');

      expect(result.cid).toMatch(/^(Qm|bafy)/);
      expect(result.pinStatus).toBe('pinned');

      // Clean up
      await ipfsHelper.unpin(result.cid);
    }, 30000); // 30s timeout for network operations

    test('should retrieve from public gateway', async () => {
      const testContent = `Test at ${Date.now()}`;
      const buffer = Buffer.from(testContent);

      const uploadResult = await ipfsHelper.uploadBuffer(buffer, 'gateway-test.txt');

      // Wait a moment for pinning to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));

      const downloaded = await ipfsHelper.download(uploadResult.cid);
      expect(downloaded.toString()).toBe(testContent);

      // Clean up
      await ipfsHelper.unpin(uploadResult.cid);
    }, 30000);
  });
}

// Export for use in integration tests
module.exports = {
  testIPFSUpload: async () => {
    const buffer = Buffer.from('Integration test data');
    return await ipfsHelper.uploadBuffer(buffer, 'integration-test.enc');
  }
};
