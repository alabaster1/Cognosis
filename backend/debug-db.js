const { PrismaClient } = require('@prisma/client');

async function debugDatabase() {
  const prisma = new PrismaClient();

  try {
    // Check users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('\n=== USERS ===');
    users.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`Wallet: ${u.walletAddress}`);
      console.log(`Type: ${u.walletType}`);
      console.log(`Created: ${u.createdAt}`);
      console.log('---');
    });

    // Check commitments
    const commitments = await prisma.commitment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: true
      }
    });
    console.log('\n=== COMMITMENTS ===');
    commitments.forEach(c => {
      console.log(`Commitment ID: ${c.id}`);
      console.log(`User ID: ${c.userId}`);
      console.log(`User Wallet: ${c.user?.walletAddress || 'USER NOT FOUND'}`);
      console.log(`Hash: ${c.commitmentHash.substring(0, 20)}...`);
      console.log(`Created: ${c.createdAt}`);
      console.log('---');
    });

    // Check for specific wallet
    const testWallet = 'mid_test1c10a37a05d320a97402df3ce54c2e0a082db16c2';
    const userByWallet = await prisma.user.findUnique({
      where: { walletAddress: testWallet },
      include: {
        commitments: true
      }
    });
    console.log('\n=== SPECIFIC WALLET ===');
    console.log(`Wallet: ${testWallet}`);
    if (userByWallet) {
      console.log(`User ID: ${userByWallet.id}`);
      console.log(`Commitments: ${userByWallet.commitments.length}`);
    } else {
      console.log('User NOT FOUND');
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();
