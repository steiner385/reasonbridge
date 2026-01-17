/**
 * Prisma client singleton and factory functions.
 *
 * This module provides:
 * - A singleton Prisma client instance for typical use
 * - A factory function for creating isolated clients (useful for testing)
 * - Graceful disconnect handling
 */

import { PrismaClient } from '@prisma/client';

// Singleton instance
let prismaInstance: PrismaClient | null = null;

/**
 * Get or create the singleton Prisma client instance.
 * This is the recommended way to access the database in production code.
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log:
        process.env['NODE_ENV'] === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * The default singleton Prisma client.
 * Use this for most database operations.
 */
export const prisma = getPrismaClient();

/**
 * Create a new Prisma client instance.
 * Useful for:
 * - Testing with isolated database connections
 * - Worker processes that need their own connection
 * - Scenarios requiring different logging configuration
 */
export function createPrismaClient(
  options?: ConstructorParameters<typeof PrismaClient>[0]
): PrismaClient {
  return new PrismaClient(options);
}

/**
 * Gracefully disconnect the singleton Prisma client.
 * Call this during application shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
