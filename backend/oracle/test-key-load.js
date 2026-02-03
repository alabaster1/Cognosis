// Test loading Oracle key with Lucid
import { Lucid, Blockfrost } from 'lucid-cardano';

async function testKeyLoad() {
  try {
    const lucid = await Lucid.new(
      new Blockfrost(
        'https://cardano-preprod.blockfrost.io/api/v0',
        'preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL'
      ),
      'Preprod'
    );

    // Try loading key
    const privateKey = '61d9477b332d4d480d42578751af0128bb770ac474f946fd7ef08b302e8c779c';
    
    console.log('Attempting to load private key...');
    console.log('Key:', privateKey);
    console.log('Key length:', privateKey.length);
    
    lucid.selectWalletFromPrivateKey(privateKey);
    
    const address = await lucid.wallet.address();
    console.log('✅ Success! Address:', address);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testKeyLoad();
