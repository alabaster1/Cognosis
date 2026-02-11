/**
 * Guest Data Cleanup Utility
 * Removes old guest commitments and related data after a configurable TTL.
 *
 * Guest commitments (walletType: 'guest') are stored server-side without
 * blockchain verification. They should be cleaned up after a reasonable
 * period to prevent unbounded storage growth.
 */

const { PrismaClient } = require('@prisma/client');
const { logger, maskWallet } = require('./logger');

const prisma = new PrismaClient();

// Default TTL: 30 days (in milliseconds)
const DEFAULT_GUEST_TTL_DAYS = parseInt(process.env.GUEST_DATA_TTL_DAYS || '30', 10);
const GUEST_TTL_MS = DEFAULT_GUEST_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Clean up old guest commitments
 * @param {number} ttlDays - Number of days after which to delete guest data
 * @returns {Promise<{deletedCommitments: number, deletedUsers: number}>}
 */
async function cleanupGuestData(ttlDays = DEFAULT_GUEST_TTL_DAYS) {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - ttlMs);

  logger.info('GuestCleanup', `Starting cleanup for data older than ${ttlDays} days (before ${cutoffDate.toISOString()})`);

  try {
    // Find guest users
    const guestUsers = await prisma.user.findMany({
      where: {
        walletType: 'guest',
      },
      select: {
        id: true,
        walletAddress: true,
        createdAt: true,
      },
    });

    logger.info('GuestCleanup', `Found ${guestUsers.length} guest users`);

    let deletedCommitments = 0;
    let deletedUsers = 0;

    for (const user of guestUsers) {
      // Delete old commitments for this guest user
      const result = await prisma.commitment.deleteMany({
        where: {
          userId: user.id,
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      deletedCommitments += result.count;

      // Check if user has any remaining commitments
      const remainingCommitments = await prisma.commitment.count({
        where: {
          userId: user.id,
        },
      });

      // If no remaining commitments and user is old, delete the user too
      if (remainingCommitments === 0 && user.createdAt < cutoffDate) {
        await prisma.user.delete({
          where: { id: user.id },
        });
        deletedUsers += 1;
        logger.debug('GuestCleanup', `Deleted guest user: ${maskWallet(user.walletAddress)}`);
      }
    }

    logger.info('GuestCleanup', `Cleanup complete: ${deletedCommitments} commitments, ${deletedUsers} users deleted`);

    return { deletedCommitments, deletedUsers };
  } catch (error) {
    logger.error('[GuestCleanup] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Get cleanup statistics without deleting
 * @returns {Promise<{guestUsers: number, oldCommitments: number}>}
 */
async function getCleanupStats() {
  const cutoffDate = new Date(Date.now() - GUEST_TTL_MS);

  const guestUsers = await prisma.user.count({
    where: { walletType: 'guest' },
  });

  const oldCommitments = await prisma.commitment.count({
    where: {
      user: {
        walletType: 'guest',
      },
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return { guestUsers, oldCommitments, ttlDays: DEFAULT_GUEST_TTL_DAYS };
}

/**
 * Schedule cleanup to run periodically
 * @param {number} intervalHours - Hours between cleanup runs (default: 24)
 */
function scheduleCleanup(intervalHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info(`[GuestCleanup] Scheduling cleanup every ${intervalHours} hours`);

  // Run immediately on startup
  cleanupGuestData().catch(err => {
    logger.error('[GuestCleanup] Initial cleanup failed:', err);
  });

  // Then run periodically
  setInterval(() => {
    cleanupGuestData().catch(err => {
      logger.error('[GuestCleanup] Scheduled cleanup failed:', err);
    });
  }, intervalMs);
}

module.exports = {
  cleanupGuestData,
  getCleanupStats,
  scheduleCleanup,
  GUEST_TTL_MS,
  DEFAULT_GUEST_TTL_DAYS,
};
