const { PrismaClient } = require('@prisma/client');

async function checkRevealed() {
  const prisma = new PrismaClient();

  try {
    const commitments = await prisma.commitment.findMany({
      where: {
        user: {
          walletAddress: 'mid_test1c10a37a05d320a97402df3ce54c2e0a082db16c2'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n=== COMMITMENT STATUS ===');
    commitments.forEach(c => {
      console.log(`ID: ${c.id.substring(0, 8)}...`);
      console.log(`Revealed: ${c.revealed}`);
      console.log(`Created: ${c.createdAt}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRevealed();
