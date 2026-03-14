/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enhanced Demo Seed Orchestrator
 *
 * Coordinates all generators and calculators to seed comprehensive demo data.
 * Phases:
 *   1. Generate data (users, topics, discussions, responses, engagement)
 *   2. Calculate derived data (trust scores, badges)
 *   3. Persist to database in batched transactions
 */

import type { PrismaClient } from '@prisma/client';
import { getScaleConfig, type ScaleProfile, type ScaleConfig } from './config/distribution.js';
import { createAIClient, type AIClient } from './generators/ai-client.js';
import { generateUserPersonas, type GeneratedUserPersona } from './generators/user-generator.js';
import {
  generateTopics,
  generateDiscussions,
  type GeneratedTopic,
  type GeneratedDiscussion,
} from './generators/topic-generator.js';
import { generateResponses, type GeneratedResponse } from './generators/response-generator.js';
import {
  generateEngagement,
  type GeneratedVote,
  type GeneratedReaction,
} from './generators/engagement-generator.js';
import { calculateTrustScores, type UserTrustData } from './calculators/trust-score-calculator.js';
import { calculateBadges, type UserBadges } from './calculators/badge-calculator.js';

// =============================================================================
// INTERFACES
// =============================================================================

export interface EnhancedSeedOptions {
  scale?: ScaleProfile;
  useAI?: boolean;
  batchSize?: number;
  verbose?: boolean;
}

interface GeneratedData {
  users: GeneratedUserPersona[];
  topics: GeneratedTopic[];
  discussions: GeneratedDiscussion[];
  responses: GeneratedResponse[];
  votes: GeneratedVote[];
  reactions: GeneratedReaction[];
}

interface DerivedData {
  trustData: UserTrustData[];
  badges: UserBadges[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert a day offset to an actual Date (offset days ago from now)
 */
function offsetToDate(offset: number): Date {
  const now = Date.now();
  return new Date(now - offset * 24 * 60 * 60 * 1000);
}

/**
 * Log progress if verbose mode is enabled
 */
function log(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(message);
  }
}

// =============================================================================
// PHASE 1: DATA GENERATION
// =============================================================================

async function generateAllData(
  config: ScaleConfig,
  aiClient: AIClient | undefined,
  useAI: boolean,
  verbose: boolean,
): Promise<GeneratedData> {
  log('Phase 1: Generating data...', verbose);

  // Generate user personas
  log('  Generating user personas...', verbose);
  const users = await generateUserPersonas(config, {
    aiClient: useAI ? aiClient : undefined,
    useMockData: !useAI,
  });
  log(`    Generated ${users.length} users`, verbose);

  // Generate topics
  log('  Generating topics...', verbose);
  const topics = await generateTopics(config, users, {
    aiClient: useAI ? aiClient : undefined,
    useMockData: !useAI,
  });
  log(`    Generated ${topics.length} topics`, verbose);

  // Generate discussions
  log('  Generating discussions...', verbose);
  const discussions = generateDiscussions(topics, users, config);
  log(`    Generated ${discussions.length} discussions`, verbose);

  // Generate responses
  log('  Generating responses...', verbose);
  const responses = await generateResponses(discussions, topics, users, config, {
    aiClient: useAI ? aiClient : undefined,
    useMockData: !useAI,
  });
  log(`    Generated ${responses.length} responses`, verbose);

  // Generate engagement (votes, reactions, bookmarks, connections)
  log('  Generating engagement...', verbose);
  // Map responses to include index field for engagement generator
  const responsesWithIndex = responses.map((r, idx) => ({
    ...r,
    index: idx,
  }));
  // Map topics to include index field for engagement generator
  const topicsWithIndex = topics.map((t) => ({
    id: t.id,
    index: t.topicIndex,
    category: t.category,
    creatorId: t.creatorId,
  }));
  const engagement = generateEngagement(users, responsesWithIndex, topicsWithIndex, config);
  log(`    Generated ${engagement.votes.length} votes`, verbose);
  log(`    Generated ${engagement.reactions.length} reactions`, verbose);

  return {
    users,
    topics,
    discussions,
    responses,
    votes: engagement.votes,
    reactions: engagement.reactions,
  };
}

// =============================================================================
// PHASE 2: DERIVED DATA CALCULATION
// =============================================================================

function calculateDerivedData(data: GeneratedData, verbose: boolean): DerivedData {
  log('Phase 2: Calculating derived data...', verbose);

  // Calculate trust scores
  log('  Calculating trust scores...', verbose);
  // Map responses to include responseType for trust calculator
  const responsesForTrust = data.responses.map((r) => ({
    ...r,
    index: 0, // Not used by trust calculator
  }));
  const trustData = calculateTrustScores(data.users, responsesForTrust, data.votes, data.reactions);
  log(`    Calculated trust scores for ${trustData.length} users`, verbose);

  // Calculate badges
  log('  Calculating badges...', verbose);
  const badges = calculateBadges(data.responses, trustData);
  log(`    Calculated badges for ${badges.length} users`, verbose);

  return { trustData, badges };
}

// =============================================================================
// PHASE 3: DATABASE PERSISTENCE
// =============================================================================

async function persistUsers(
  prisma: PrismaClient,
  users: GeneratedUserPersona[],
  trustData: UserTrustData[],
  batchSize: number,
  verbose: boolean,
): Promise<void> {
  log('  Persisting users...', verbose);

  // Build trust lookup map
  const trustByUser = new Map(trustData.map((t) => [t.userId, t]));

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((user) => {
        const trust = trustByUser.get(user.id);
        return prisma.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            bio: user.bio,
            cognitoSub: user.cognitoSub,
            passwordHash: user.passwordHash,
            emailVerified: true,
            accountStatus: 'ACTIVE',
            status: 'ACTIVE',
            authMethod: 'EMAIL_PASSWORD',
            trustScoreAbility: trust?.scores.ability ?? 0.5,
            trustScoreBenevolence: trust?.scores.benevolence ?? 0.5,
            trustScoreIntegrity: trust?.scores.integrity ?? 0.5,
            createdAt: offsetToDate(user.registrationOffset),
          },
          update: {
            displayName: user.displayName,
            bio: user.bio,
            trustScoreAbility: trust?.scores.ability ?? 0.5,
            trustScoreBenevolence: trust?.scores.benevolence ?? 0.5,
            trustScoreIntegrity: trust?.scores.integrity ?? 0.5,
          },
        });
      }),
    );

    log(`    Persisted ${Math.min(i + batchSize, users.length)}/${users.length} users`, verbose);
  }
}

async function persistTopics(
  prisma: PrismaClient,
  topics: GeneratedTopic[],
  batchSize: number,
  verbose: boolean,
): Promise<void> {
  log('  Persisting topics...', verbose);

  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((topic) => {
        return prisma.discussionTopic.upsert({
          where: { id: topic.id },
          create: {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            slug: topic.slug,
            creatorId: topic.creatorId,
            status: topic.status,
            crossCuttingThemes: topic.crossCuttingThemes,
            createdAt: offsetToDate(topic.createdAtOffset),
            activatedAt: topic.status === 'ACTIVE' ? offsetToDate(topic.createdAtOffset) : null,
            archivedAt: topic.status === 'ARCHIVED' ? offsetToDate(0) : null,
          },
          update: {
            title: topic.title,
            description: topic.description,
            status: topic.status,
            crossCuttingThemes: topic.crossCuttingThemes,
          },
        });
      }),
    );

    log(`    Persisted ${Math.min(i + batchSize, topics.length)}/${topics.length} topics`, verbose);
  }
}

async function persistResponses(
  prisma: PrismaClient,
  responses: GeneratedResponse[],
  batchSize: number,
  verbose: boolean,
): Promise<void> {
  log('  Persisting responses...', verbose);

  // Sort responses to ensure parents are created before children
  // Responses with no parentId come first, then sorted by createdAtOffset (oldest first)
  const sortedResponses = [...responses].sort((a, b) => {
    // Root responses (no parent) come first
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    // Then sort by createdAtOffset descending (older = higher offset = first)
    return b.createdAtOffset - a.createdAtOffset;
  });

  for (let i = 0; i < sortedResponses.length; i += batchSize) {
    const batch = sortedResponses.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((response) => {
        return prisma.response.upsert({
          where: { id: response.id },
          create: {
            id: response.id,
            topicId: response.topicId,
            discussionId: response.discussionId,
            authorId: response.authorId,
            parentId: response.parentId,
            content: response.content,
            citedSources:
              response.citedSources.length > 0
                ? JSON.parse(JSON.stringify(response.citedSources))
                : undefined,
            createdAt: offsetToDate(response.createdAtOffset),
          },
          update: {
            content: response.content,
            citedSources:
              response.citedSources.length > 0
                ? JSON.parse(JSON.stringify(response.citedSources))
                : undefined,
          },
        });
      }),
    );

    log(
      `    Persisted ${Math.min(i + batchSize, sortedResponses.length)}/${sortedResponses.length} responses`,
      verbose,
    );
  }
}

async function persistEngagement(
  prisma: PrismaClient,
  votes: GeneratedVote[],
  reactions: GeneratedReaction[],
  batchSize: number,
  verbose: boolean,
): Promise<void> {
  log('  Persisting votes...', verbose);

  for (let i = 0; i < votes.length; i += batchSize) {
    const batch = votes.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((vote) => {
        return prisma.vote.upsert({
          where: {
            userId_responseId: {
              userId: vote.userId,
              responseId: vote.responseId,
            },
          },
          create: {
            id: vote.id,
            userId: vote.userId,
            responseId: vote.responseId,
            voteType: vote.value === 1 ? 'UPVOTE' : 'DOWNVOTE',
            createdAt: offsetToDate(vote.createdAtOffset),
          },
          update: {
            voteType: vote.value === 1 ? 'UPVOTE' : 'DOWNVOTE',
          },
        });
      }),
    );

    log(`    Persisted ${Math.min(i + batchSize, votes.length)}/${votes.length} votes`, verbose);
  }

  log('  Persisting reactions...', verbose);

  for (let i = 0; i < reactions.length; i += batchSize) {
    const batch = reactions.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((reaction) => {
        return prisma.responseReaction.upsert({
          where: {
            responseId_userId_emoji: {
              responseId: reaction.responseId,
              userId: reaction.userId,
              emoji: reaction.emoji,
            },
          },
          create: {
            id: reaction.id,
            responseId: reaction.responseId,
            userId: reaction.userId,
            emoji: reaction.emoji,
            createdAt: offsetToDate(reaction.createdAtOffset),
          },
          update: {
            // No updates needed for reactions
          },
        });
      }),
    );

    log(
      `    Persisted ${Math.min(i + batchSize, reactions.length)}/${reactions.length} reactions`,
      verbose,
    );
  }
}

async function persistAllData(
  prisma: PrismaClient,
  data: GeneratedData,
  derived: DerivedData,
  batchSize: number,
  verbose: boolean,
): Promise<void> {
  log('Phase 3: Persisting to database...', verbose);

  await persistUsers(prisma, data.users, derived.trustData, batchSize, verbose);
  await persistTopics(prisma, data.topics, batchSize, verbose);
  // Note: Discussions are embedded in topics (no separate persist needed for this implementation)
  await persistResponses(prisma, data.responses, batchSize, verbose);
  await persistEngagement(prisma, data.votes, data.reactions, batchSize, verbose);

  log('Phase 3 complete: All data persisted', verbose);
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Seed enhanced demo data with realistic user personas, topics, discussions,
 * responses, and engagement patterns.
 *
 * @param prisma - PrismaClient instance for database operations
 * @param options - Configuration options for seeding
 */
export async function seedEnhancedDemo(
  prisma: PrismaClient,
  options: EnhancedSeedOptions = {},
): Promise<void> {
  const { scale = 'large', useAI = true, batchSize = 100, verbose = true } = options;

  log(`Starting enhanced demo seed (scale: ${scale}, useAI: ${useAI})`, verbose);

  // Get scale configuration
  const config = getScaleConfig(scale);

  // Create AI client if needed
  const aiClient = useAI ? createAIClient() : undefined;

  // Phase 1: Generate all data
  const data = await generateAllData(config, aiClient, useAI, verbose);

  // Phase 2: Calculate derived data
  const derived = calculateDerivedData(data, verbose);

  // Phase 3: Persist to database
  await persistAllData(prisma, data, derived, batchSize, verbose);

  log('Enhanced demo seed complete!', verbose);
}

export default seedEnhancedDemo;
