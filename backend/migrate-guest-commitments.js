const { PrismaClient } = require('@prisma/client');

/**
 * Migration script to consolidate guest commitments to the real Midnight wallet
 * Run this once to fix the database after the guest ID bug
 */
async function migrateGuestCommitments() {
  const prisma = new PrismaClient();

  try {
    // The actual Midnight wallet address
    const realWalletAddress = 'mid_test1c10a37a05d320a97402df3ce54c2e0a082db16c2';

    // 1. Find or create the real user
    const realUser = await prisma.user.upsert({
      where: { walletAddress: realWalletAddress },
      update: {},
      create: {
        walletAddress: realWalletAddress,
        walletType: 'midnight'
      }
    });

    console.log(`Real user: ${realUser.id} (${realUser.walletAddress})`);

    // 2. Find all guest users
    const guestUsers = await prisma.user.findMany({
      where: {
        walletAddress: {
          startsWith: 'guest_'
        }
      },
      include: {
        commitments: true
      }
    });

    console.log(`\nFound ${guestUsers.length} guest users with commitments`);

    // 3. Update all commitments to point to real user
    let totalCommitments = 0;
    for (const guestUser of guestUsers) {
      if (guestUser.commitments.length > 0) {
        console.log(`\nMigrating ${guestUser.commitments.length} commitments from ${guestUser.walletAddress}`);

        await prisma.commitment.updateMany({
          where: { userId: guestUser.id },
          data: { userId: realUser.id }
        });

        totalCommitments += guestUser.commitments.length;
      }
    }

    console.log(`\nTotal commitments migrated: ${totalCommitments}`);

    // 4. Delete guest users (now that their commitments are moved)
    const deleteResult = await prisma.user.deleteMany({
      where: {
        walletAddress: {
          startsWith: 'guest_'
        }
      }
    });

    console.log(`Deleted ${deleteResult.count} guest users`);

    // 5. Verify migration
    const userCommitments = await prisma.commitment.findMany({
      where: { userId: realUser.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\nFinal verification: User ${realWalletAddress} has ${userCommitments.length} commitments`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateGuestCommitments();
