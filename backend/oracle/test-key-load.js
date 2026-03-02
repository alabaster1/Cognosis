// Test loading Oracle key with Lucid
import { Lucid, Blockfrost } from 'lucid-cardano';

async function testKeyLoad() {
  try {
    const blockfrostProjectId = process.env.BLOCKFROST_PROJECT_ID;
    const privateKey = process.env.ORACLE_PRIVATE_KEY;

    if (!blockfrostProjectId) {
      throw new Error('BLOCKFROST_PROJECT_ID is required');
    }
    if (!privateKey) {
      throw new Error('ORACLE_PRIVATE_KEY is required');
    }

    const lucid = await Lucid.new(
      new Blockfrost(
        'https://cardano-preprod.blockfrost.io/api/v0',
        blockfrostProjectId
      ),
      'Preprod'
    );

    console.log('Attempting to load private key from environment...');
    console.log('Key length:', privateKey.length);
    
    lucid.selectWalletFromPrivateKey(privateKey);
    
    const address = await lucid.wallet.address();
    console.log('✅ Success! Address:', address);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testKeyLoad();
