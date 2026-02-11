/**
 * Off-Chain Coordinator Endpoint Tests
 *
 * Tests for Midnight integration API endpoints.
 * Run with: npm test tests/test_offchain_endpoints.js
 */

const request = require('supertest');
const crypto = require('crypto');

// Mock app for testing
let app;

beforeAll(() => {
  // Start the coordinator app
  process.env.MIDNIGHT_NETWORK = 'testnet';
  process.env.PINNING_SERVICE = 'mock';
  app = require('../backend/offchain_coordinator/index');
});

describe('Off-Chain Coordinator API', () => {
  describe('Health Check', () => {
    test('GET /health should return ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'offchain-coordinator');
      expect(response.body).toHaveProperty('midnight');
      expect(response.body.midnight).toHaveProperty('initialized');
    });
  });

  describe('POST /api/pin', () => {
    test('should upload blob to IPFS and return CID', async () => {
      const testData = 'Hello Midnight!';
      const blobBase64 = Buffer.from(testData).toString('base64');

      const response = await request(app)
        .post('/api/pin')
        .send({
          blobBase64,
          filename: 'test.enc'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('cid');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('pinStatus');
      expect(response.body.cid).toMatch(/^bafy/);
    });

    test('should reject request without blobBase64', async () => {
      const response = await request(app)
        .post('/api/pin')
        .send({ filename: 'test.enc' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle large blobs', async () => {
      const largeData = 'x'.repeat(1024 * 1024); // 1MB
      const blobBase64 = Buffer.from(largeData).toString('base64');

      const response = await request(app)
        .post('/api/pin')
        .send({ blobBase64, filename: 'large.enc' })
        .expect(200);

      expect(response.body.success).toBe(true);
    }, 10000); // 10s timeout
  });

  describe('POST /api/commit', () => {
    let testCID;
    let testNonce;
    let testDevicePubKey;

    beforeEach(() => {
      testCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      testNonce = crypto.randomBytes(32).toString('hex');
      testDevicePubKey = crypto.randomBytes(32).toString('hex');
    });

    test('should create commitment on Midnight blockchain', async () => {
      const metadata = {
        experimentType: 'remote_viewing',
        timestamp: Date.now(),
        targetHash: crypto.randomBytes(32).toString('hex')
      };

      // Generate device signature
      const message = `${testCID}${JSON.stringify(metadata)}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(message + testDevicePubKey).digest('hex');

      const response = await request(app)
        .post('/api/commit')
        .send({
          cid: testCID,
          metadata,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('commitTxId');
      expect(response.body).toHaveProperty('commitmentHash');
      expect(response.body).toHaveProperty('blockHeight');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.commitTxId).toMatch(/^midnight:/);
    });

    test('should reject commitment with missing fields', async () => {
      const response = await request(app)
        .post('/api/commit')
        .send({
          cid: testCID
          // Missing metadata, nonce, etc.
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate commitment', async () => {
      const metadata = { experimentType: 'test', timestamp: Date.now() };
      const message = `${testCID}${JSON.stringify(metadata)}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(message + testDevicePubKey).digest('hex');

      // First commit
      await request(app)
        .post('/api/commit')
        .send({
          cid: testCID,
          metadata,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(200);

      // Second commit (duplicate)
      const response = await request(app)
        .post('/api/commit')
        .send({
          cid: testCID,
          metadata,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/reveal', () => {
    let commitmentHash;
    let testCID;
    let testNonce;
    let testDevicePubKey;

    beforeEach(async () => {
      // Create a commitment first
      testCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      testNonce = crypto.randomBytes(32).toString('hex');
      testDevicePubKey = crypto.randomBytes(32).toString('hex');

      const metadata = {
        experimentType: 'remote_viewing',
        timestamp: Date.now()
      };

      const message = `${testCID}${JSON.stringify(metadata)}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(message + testDevicePubKey).digest('hex');

      const commitResponse = await request(app)
        .post('/api/commit')
        .send({
          cid: testCID,
          metadata,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        });

      commitmentHash = commitResponse.body.commitmentHash;
    });

    test('should reveal commitment', async () => {
      const revealMessage = `${commitmentHash}${testCID}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(revealMessage + testDevicePubKey).digest('hex');

      const response = await request(app)
        .post('/api/reveal')
        .send({
          commitmentHash,
          cid: testCID,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('revealTxId');
      expect(response.body).toHaveProperty('blockHeight');
      expect(response.body).toHaveProperty('cid', testCID);
      expect(response.body).toHaveProperty('metadata');
    });

    test('should reject reveal with invalid commitment hash', async () => {
      const invalidHash = 'invalid-commitment-hash';
      const revealMessage = `${invalidHash}${testCID}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(revealMessage + testDevicePubKey).digest('hex');

      const response = await request(app)
        .post('/api/reveal')
        .send({
          commitmentHash: invalidHash,
          cid: testCID,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    test('should reject reveal with mismatched data', async () => {
      const wrongCID = 'bafybeigwrongcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const revealMessage = `${commitmentHash}${wrongCID}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(revealMessage + testDevicePubKey).digest('hex');

      const response = await request(app)
        .post('/api/reveal')
        .send({
          commitmentHash,
          cid: wrongCID,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(400);

      expect(response.body.error).toContain('does not match');
    });

    test('should reject duplicate reveal', async () => {
      const revealMessage = `${commitmentHash}${testCID}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(revealMessage + testDevicePubKey).digest('hex');

      // First reveal
      await request(app)
        .post('/api/reveal')
        .send({
          commitmentHash,
          cid: testCID,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(200);

      // Second reveal (duplicate)
      const response = await request(app)
        .post('/api/reveal')
        .send({
          commitmentHash,
          cid: testCID,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        })
        .expect(409);

      expect(response.body.error).toContain('Already revealed');
    });
  });

  describe('GET /api/commit/:commitmentHash', () => {
    test('should get commitment status', async () => {
      // Create a commitment
      const testCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const testNonce = crypto.randomBytes(32).toString('hex');
      const testDevicePubKey = crypto.randomBytes(32).toString('hex');
      const metadata = { experimentType: 'test', timestamp: Date.now() };
      const message = `${testCID}${JSON.stringify(metadata)}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(message + testDevicePubKey).digest('hex');

      const commitResponse = await request(app)
        .post('/api/commit')
        .send({
          cid: testCID,
          metadata,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        });

      const commitmentHash = commitResponse.body.commitmentHash;

      // Get status
      const response = await request(app)
        .get(`/api/commit/${commitmentHash}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('commitment');
      expect(response.body.commitment).toHaveProperty('commitmentHash', commitmentHash);
      expect(response.body.commitment).toHaveProperty('revealed', false);
      expect(response.body.commitment).toHaveProperty('timestamp');
      expect(response.body.commitment).toHaveProperty('blockHeight');
    });

    test('should return null metadata before reveal', async () => {
      const testCID = 'bafybeigtest123';
      const testNonce = crypto.randomBytes(32).toString('hex');
      const testDevicePubKey = crypto.randomBytes(32).toString('hex');
      const metadata = { experimentType: 'test', timestamp: Date.now() };
      const message = `${testCID}${JSON.stringify(metadata)}${testNonce}`;
      const deviceSig = crypto.createHash('sha256').update(message + testDevicePubKey).digest('hex');

      const commitResponse = await request(app)
        .post('/api/commit')
        .send({
          cid: testCID,
          metadata,
          nonce: testNonce,
          deviceSig,
          devicePubKey: testDevicePubKey
        });

      const response = await request(app)
        .get(`/api/commit/${commitResponse.body.commitmentHash}`);

      expect(response.body.commitment.metadata).toBeNull();
      expect(response.body.commitment.cid).toBeNull();
    });
  });

  describe('End-to-End Flow', () => {
    test('should complete full commit-reveal cycle', async () => {
      // 1. Upload encrypted blob
      const responseText = 'I see mountains and water';
      const blobBase64 = Buffer.from(responseText).toString('base64');

      const pinResponse = await request(app)
        .post('/api/pin')
        .send({ blobBase64, filename: 'e2e-test.enc' });

      expect(pinResponse.body.success).toBe(true);
      const cid = pinResponse.body.cid;

      // 2. Create commitment
      const nonce = crypto.randomBytes(32).toString('hex');
      const devicePubKey = crypto.randomBytes(32).toString('hex');
      const metadata = {
        experimentType: 'remote_viewing',
        timestamp: Date.now(),
        targetHash: crypto.randomBytes(32).toString('hex')
      };

      const commitMessage = `${cid}${JSON.stringify(metadata)}${nonce}`;
      const commitSig = crypto.createHash('sha256').update(commitMessage + devicePubKey).digest('hex');

      const commitResponse = await request(app)
        .post('/api/commit')
        .send({
          cid,
          metadata,
          nonce,
          deviceSig: commitSig,
          devicePubKey
        });

      expect(commitResponse.body.success).toBe(true);
      const commitmentHash = commitResponse.body.commitmentHash;

      // 3. Check status (should be committed but not revealed)
      const statusResponse1 = await request(app)
        .get(`/api/commit/${commitmentHash}`);

      expect(statusResponse1.body.commitment.revealed).toBe(false);
      expect(statusResponse1.body.commitment.metadata).toBeNull();

      // 4. Reveal commitment
      const revealMessage = `${commitmentHash}${cid}${nonce}`;
      const revealSig = crypto.createHash('sha256').update(revealMessage + devicePubKey).digest('hex');

      const revealResponse = await request(app)
        .post('/api/reveal')
        .send({
          commitmentHash,
          cid,
          nonce,
          deviceSig: revealSig,
          devicePubKey
        });

      expect(revealResponse.body.success).toBe(true);
      expect(revealResponse.body.cid).toBe(cid);
      expect(revealResponse.body.metadata).toEqual(metadata);

      // 5. Check status (should be revealed)
      const statusResponse2 = await request(app)
        .get(`/api/commit/${commitmentHash}`);

      expect(statusResponse2.body.commitment.revealed).toBe(true);
    });
  });
});

module.exports = {
  app
};
