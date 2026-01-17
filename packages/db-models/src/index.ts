/**
 * @unite-discord/db-models
 *
 * Prisma database models and client for uniteDiscord.
 * This package provides the generated Prisma client and re-exports
 * all model types for use across the monorepo.
 */

// Re-export all Prisma types and enums
export * from '@prisma/client';

// Re-export the client factory
export { prisma, createPrismaClient, disconnectPrisma } from './client.js';
