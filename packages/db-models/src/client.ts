/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Prisma client singleton and factory functions.
 *
 * This module provides:
 * - A singleton Prisma client instance for typical use
 * - A factory function for creating isolated clients (useful for testing)
 * - Graceful disconnect handling
 *
 * Prisma 7.x requires using an adapter for database connections.
 * We use @prisma/adapter-pg for PostgreSQL.
 */

import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Connection pool for database
let pool: Pool | null = null;

// Singleton instance
let prismaInstance: PrismaClient | null = null;

/**
 * Create a PostgreSQL connection pool
 */
function createPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
    });
  }
  return pool;
}

/**
 * Get or create the singleton Prisma client instance.
 * This is the recommended way to access the database in production code.
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const pgPool = createPool();
    const adapter = new PrismaPg(pgPool);

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
  options?: ConstructorParameters<typeof PrismaClient>[0],
): PrismaClient {
  // Create a new pool for this client instance
  const pgPool = new Pool({
    connectionString: process.env['DATABASE_URL'],
  });
  const adapter = new PrismaPg(pgPool);

  return new PrismaClient({
    ...options,
    adapter,
  });
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

  // Close the connection pool
  if (pool) {
    await pool.end();
    pool = null;
  }
}
