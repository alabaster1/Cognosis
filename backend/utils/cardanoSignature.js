/**
 * Cardano CIP-8 Signature Verification
 * Verifies COSE_Sign1 signatures from CIP-30 signData
 */

const nacl = require('tweetnacl');
const cbor = require('cbor');
const blake2b = require('blakejs').blake2b;
const crypto = require('crypto');

// Challenge expiry: 5 minutes
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Verify a CIP-8 (COSE_Sign1) signature from CIP-30 signData
 *
 * @param {string} addressHex - The hex-encoded address that was passed to signData
 * @param {string} payloadHex - The hex-encoded payload that was signed
 * @param {Object} dataSignature - { signature: hex, key: hex } from CIP-30 signData
 * @returns {boolean} - True if signature is valid and key matches address
 */
async function verifyCIP8Signature(addressHex, payloadHex, dataSignature) {
  try {
    const { signature: sigHex, key: keyHex } = dataSignature;

    // Decode COSE_Key to extract Ed25519 public key
    const coseKeyBytes = Buffer.from(keyHex, 'hex');
    const coseKey = cbor.decodeFirstSync(coseKeyBytes);

    // COSE_Key for Ed25519: { 1: 1 (OKP), 3: -8 (EdDSA), -1: 6 (Ed25519), -2: x (pubkey bytes) }
    const pubKeyBytes = coseKey.get(-2);
    if (!pubKeyBytes || pubKeyBytes.length !== 32) {
      throw new Error('Invalid public key in COSE_Key');
    }

    // Decode COSE_Sign1: [protected, unprotected, payload, signature]
    const coseSign1Bytes = Buffer.from(sigHex, 'hex');
    const coseSign1 = cbor.decodeFirstSync(coseSign1Bytes);

    // COSE_Sign1 is a CBOR tag (18) wrapping an array
    const coseArray = coseSign1.value || coseSign1;
    if (!Array.isArray(coseArray) || coseArray.length !== 4) {
      throw new Error('Invalid COSE_Sign1 structure');
    }

    const [protectedHeaders, , payload, signatureBytes] = coseArray;

    // Reconstruct Sig_structure: ["Signature1", protectedHeaders, externalAad, payload]
    const sigStructure = [
      'Signature1',
      protectedHeaders, // already CBOR-encoded bytes
      Buffer.alloc(0), // external_aad (empty)
      payload || Buffer.from(payloadHex, 'hex'), // payload
    ];
    const sigStructureBytes = cbor.encodeOne(sigStructure);

    // Verify Ed25519 signature
    const isValid = nacl.sign.detached.verify(
      new Uint8Array(sigStructureBytes),
      new Uint8Array(signatureBytes),
      new Uint8Array(pubKeyBytes)
    );

    if (!isValid) {
      return false;
    }

    // Verify the public key corresponds to the claimed address
    // Cardano address = header_byte + blake2b_224(pubkey)
    const pubKeyHash = Buffer.from(blake2b(pubKeyBytes, undefined, 28)); // 28 bytes = 224 bits

    // The address hex should contain the pubkey hash
    // For base addresses (type 0x00-0x0F): header(1) + payment_cred(28) + stake_cred(28)
    // For enterprise addresses (type 0x60-0x6F): header(1) + payment_cred(28)
    const addressBytes = Buffer.from(addressHex, 'hex');
    const paymentCredential = addressBytes.slice(1, 29);

    if (!pubKeyHash.equals(paymentCredential)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[CIP-8] Verification error:', error.message);
    return false;
  }
}

/**
 * Generate a random authentication challenge nonce
 * @returns {{ nonce: string, timestamp: number }}
 */
function generateAuthChallenge() {
  const nonce = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  return { nonce, timestamp };
}

/**
 * Build deterministic challenge message for wallet to sign
 * @param {string} nonce - Random hex nonce
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string} - Message string to sign
 */
function buildChallengeMessage(nonce, timestamp) {
  return `Cognosis Authentication\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/**
 * Check if a challenge has expired
 * @param {number} timestamp - Challenge timestamp in ms
 * @returns {boolean}
 */
function isChallengeExpired(timestamp) {
  return Date.now() - timestamp > CHALLENGE_EXPIRY_MS;
}

module.exports = {
  verifyCIP8Signature,
  generateAuthChallenge,
  buildChallengeMessage,
  isChallengeExpired,
};
