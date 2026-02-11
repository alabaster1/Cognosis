/**
 * Database Client - Prisma ORM
 *
 * Provides singleton Prisma client for database access
 */

const { PrismaClient } = require('@prisma/client');

// Singleton instance
let prisma;

/**
 * Get Prisma client instance
 * Creates new instance if it doesn't exist
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty',
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }

  return prisma;
}

/**
 * Connect to database
 */
async function connectDatabase() {
  try {
    const client = getPrismaClient();
    await client.$connect();
    console.log('✓ Database connected');
    return client;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from database
 */
async function disconnectDatabase() {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('✓ Database disconnected');
    }
  } catch (error) {
    console.error('✗ Database disconnection error:', error);
    throw error;
  }
}

/**
 * Health check - test database connection
 */
async function healthCheck() {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  getPrismaClient,
  connectDatabase,
  disconnectDatabase,
  healthCheck,
};
