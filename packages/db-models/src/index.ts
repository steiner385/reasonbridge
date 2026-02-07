/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @reason-bridge/db-models
 *
 * Prisma database models and client for reasonBridge.
 * This package provides the generated Prisma client and re-exports
 * all model types for use across the monorepo.
 */

// Re-export all Prisma types and enums
export * from './generated/client';

// Re-export the client factory
export { prisma, createPrismaClient, disconnectPrisma } from './client.js';

// Re-export demo seed functions and types
export {
  seedDemo,
  truncateDemoData,
  seedDemoPersonas,
  seedDemoTopics,
  seedDemoResponses,
  seedDemoPropositions,
  seedDemoAlignments,
  seedDemoCommonGround,
  seedDemoAIFeedback,
  seedDemoTags,
} from '../prisma/seed/demo-fixtures.js';

export {
  DEMO_USER_IDS,
  DEMO_TOPIC_IDS,
  DEMO_TAG_IDS,
  isDemoId,
  isDemoEmail,
  generateResponseId,
  generatePropositionId,
} from '../prisma/seed/demo-ids.js';

export { DEMO_PERSONAS, getPersonaByRole, getPersonaById } from '../prisma/seed/demo-personas.js';
