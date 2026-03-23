/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Environment Fixtures
 *
 * Main orchestrator for seeding demo environment data.
 * Seeds approximately 400 database entries including:
 * - 5 demo personas
 * - 10 topics with tags
 * - 52 responses
 * - 33 propositions
 * - 77 alignments
 * - 21 common ground analyses
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { DEMO_PERSONAS } from './demo-personas';
import { DEMO_TOPICS } from './demo-topics';
import { DEMO_TAGS } from './demo-tags';
import { DEMO_RESPONSES } from './demo-responses';
import { DEMO_PROPOSITIONS } from './demo-propositions';
import { DEMO_ALIGNMENTS } from './demo-alignments';
import { DEMO_COMMON_GROUND } from './demo-common-ground';
import { DEMO_AI_FEEDBACK } from './demo-ai-feedback';
import { generateDemoTimestamp } from './timestamp-generator';
import { GenerationOrchestrator } from './generators/orchestrator.js';
import type { CachedData } from './generators/types.js';
import type {
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  GeneratedCommonGround,
  GeneratedBridgingSuggestion,
} from './generators/types.js';

// Re-export for convenience
export { DEMO_PERSONAS } from './demo-personas';
export { DEMO_USER_IDS, DEMO_TOPIC_IDS, DEMO_TAG_IDS } from './demo-ids';

/**
 * Seed all demo personas into the database
 */
export async function seedDemoPersonas(prisma: PrismaClient): Promise<void> {
  console.log('🧑 Seeding demo personas...');

  for (const persona of DEMO_PERSONAS) {
    await prisma.user.upsert({
      where: { id: persona.id },
      update: {
        displayName: persona.displayName,
        email: persona.email,
        passwordHash: persona.passwordHash,
        verificationLevel: persona.verificationLevel,
        trustScoreAbility: persona.trustScoreAbility,
        trustScoreBenevolence: persona.trustScoreBenevolence,
        trustScoreIntegrity: persona.trustScoreIntegrity,
        moralFoundationProfile: persona.moralFoundationProfile as unknown as Prisma.InputJsonValue,
        phoneNumber: persona.phoneNumber,
        phoneVerified: persona.phoneVerified,
        status: persona.status,
        role: persona.userRole,
      },
      create: {
        id: persona.id,
        email: persona.email,
        displayName: persona.displayName,
        cognitoSub: persona.cognitoSub,
        authMethod: persona.authMethod,
        emailVerified: persona.emailVerified,
        passwordHash: persona.passwordHash,
        accountStatus: persona.accountStatus,
        phoneNumber: persona.phoneNumber,
        phoneVerified: persona.phoneVerified,
        verificationLevel: persona.verificationLevel,
        trustScoreAbility: persona.trustScoreAbility,
        trustScoreBenevolence: persona.trustScoreBenevolence,
        trustScoreIntegrity: persona.trustScoreIntegrity,
        moralFoundationProfile: persona.moralFoundationProfile as unknown as Prisma.InputJsonValue,
        status: persona.status,
        role: persona.userRole,
      },
    });

    console.log(`  ✓ ${persona.displayName} (${persona.role})`);
  }

  console.log(`✅ Seeded ${DEMO_PERSONAS.length} demo personas`);
}

/**
 * Seed demo tags
 */
export async function seedDemoTags(prisma: PrismaClient): Promise<void> {
  console.log('🏷️  Seeding demo tags...');

  for (const tag of DEMO_TAGS) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: {
        name: tag.name,
        slug: tag.slug,
        aiSynonyms: tag.aiSynonyms,
      },
      create: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        aiSynonyms: tag.aiSynonyms,
        usageCount: 0,
      },
    });
  }

  console.log(`✅ Seeded ${DEMO_TAGS.length} demo tags`);
}

/**
 * Seed demo topics with tag associations
 */
export async function seedDemoTopics(prisma: PrismaClient): Promise<void> {
  console.log('📋 Seeding demo topics...');

  for (const topic of DEMO_TOPICS) {
    const createdAt = generateDemoTimestamp(`topic-${topic.id}`);

    await prisma.discussionTopic.upsert({
      where: { id: topic.id },
      update: {
        title: topic.title,
        description: topic.description,
        status: topic.status,
        crossCuttingThemes: topic.crossCuttingThemes,
      },
      create: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        slug: topic.slug,
        creatorId: topic.creatorId,
        status: topic.status,
        crossCuttingThemes: topic.crossCuttingThemes,
        createdAt,
        activatedAt: topic.status !== 'SEEDING' ? createdAt : null,
      },
    });

    // Create topic-tag associations
    for (const tagId of topic.tagIds) {
      await prisma.topicTag.upsert({
        where: {
          topicId_tagId: {
            topicId: topic.id,
            tagId: tagId,
          },
        },
        update: {},
        create: {
          topicId: topic.id,
          tagId: tagId,
          source: 'CREATOR',
        },
      });

      // Increment tag usage count
      await prisma.tag.update({
        where: { id: tagId },
        data: { usageCount: { increment: 1 } },
      });
    }

    console.log(`  ✓ ${topic.title.substring(0, 50)}...`);
  }

  console.log(`✅ Seeded ${DEMO_TOPICS.length} demo topics`);
}

/**
 * Seed demo responses with threading
 */
export async function seedDemoResponses(prisma: PrismaClient): Promise<void> {
  console.log('💬 Seeding demo responses...');

  // Sort responses to ensure parents are created before children
  const sortedResponses = [...DEMO_RESPONSES].sort((a, b) => {
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    return 0;
  });

  for (const response of sortedResponses) {
    const createdAt = generateDemoTimestamp(`response-${response.id}`);

    await prisma.response.upsert({
      where: { id: response.id },
      update: {
        content: response.content,
        citedSources: response.citedSources as unknown as Prisma.InputJsonValue,
        status: response.status || 'VISIBLE',
      },
      create: {
        id: response.id,
        topicId: response.topicId,
        authorId: response.authorId,
        parentId: response.parentId,
        content: response.content,
        citedSources: response.citedSources as unknown as Prisma.InputJsonValue,
        status: response.status || 'VISIBLE',
        createdAt,
      },
    });
  }

  // Update response counts on topics
  for (const topic of DEMO_TOPICS) {
    const count = DEMO_RESPONSES.filter((r) => r.topicId === topic.id).length;
    await prisma.discussionTopic.update({
      where: { id: topic.id },
      data: { responseCount: count },
    });
  }

  console.log(`✅ Seeded ${DEMO_RESPONSES.length} demo responses`);
}

/**
 * Seed demo propositions
 */
export async function seedDemoPropositions(prisma: PrismaClient): Promise<void> {
  console.log('📝 Seeding demo propositions...');

  for (const prop of DEMO_PROPOSITIONS) {
    const createdAt = generateDemoTimestamp(`proposition-${prop.id}`);

    await prisma.proposition.upsert({
      where: { id: prop.id },
      update: {
        statement: prop.statement,
        supportCount: prop.supportCount,
        opposeCount: prop.opposeCount,
        nuancedCount: prop.nuancedCount,
        consensusScore: prop.consensusScore,
        status: prop.status,
      },
      create: {
        id: prop.id,
        topicId: prop.topicId,
        statement: prop.statement,
        source: prop.source,
        supportCount: prop.supportCount,
        opposeCount: prop.opposeCount,
        nuancedCount: prop.nuancedCount,
        consensusScore: prop.consensusScore,
        status: prop.status,
        createdAt,
      },
    });
  }

  console.log(`✅ Seeded ${DEMO_PROPOSITIONS.length} demo propositions`);
}

/**
 * Seed demo alignments (user stances on propositions)
 */
export async function seedDemoAlignments(prisma: PrismaClient): Promise<void> {
  console.log('🎯 Seeding demo alignments...');

  for (const alignment of DEMO_ALIGNMENTS) {
    const createdAt = generateDemoTimestamp(
      `alignment-${alignment.userId}-${alignment.propositionId}`,
    );

    await prisma.alignment.upsert({
      where: {
        userId_propositionId: {
          userId: alignment.userId,
          propositionId: alignment.propositionId,
        },
      },
      update: {
        stance: alignment.stance,
        nuanceExplanation: alignment.nuanceExplanation,
      },
      create: {
        userId: alignment.userId,
        propositionId: alignment.propositionId,
        stance: alignment.stance,
        nuanceExplanation: alignment.nuanceExplanation,
        createdAt,
      },
    });
  }

  console.log(`✅ Seeded ${DEMO_ALIGNMENTS.length} demo alignments`);
}

/**
 * Seed demo common ground analyses
 */
export async function seedDemoCommonGround(prisma: PrismaClient): Promise<void> {
  console.log('🤝 Seeding demo common ground...');

  for (const cg of DEMO_COMMON_GROUND) {
    const createdAt = generateDemoTimestamp(`commonground-${cg.id}`);

    await prisma.commonGroundAnalysis.upsert({
      where: { id: cg.id },
      update: {
        agreementZones: cg.agreementZones as unknown as Prisma.InputJsonValue,
        misunderstandings: cg.misunderstandings as unknown as Prisma.InputJsonValue,
        genuineDisagreements: cg.genuineDisagreements as unknown as Prisma.InputJsonValue,
        overallConsensusScore: cg.overallConsensusScore,
      },
      create: {
        id: cg.id,
        topicId: cg.topicId,
        version: cg.version,
        agreementZones: cg.agreementZones as unknown as Prisma.InputJsonValue,
        misunderstandings: cg.misunderstandings as unknown as Prisma.InputJsonValue,
        genuineDisagreements: cg.genuineDisagreements as unknown as Prisma.InputJsonValue,
        overallConsensusScore: cg.overallConsensusScore,
        participantCountAtGeneration: cg.participantCountAtGeneration,
        responseCountAtGeneration: cg.responseCountAtGeneration,
        modelVersion: cg.modelVersion,
        createdAt,
      },
    });
  }

  console.log(`✅ Seeded ${DEMO_COMMON_GROUND.length} demo common ground analyses`);
}

/**
 * Seed demo AI feedback instances
 *
 * Seeds pre-computed AI feedback on demo responses including:
 * - Fallacy detection
 * - Tone analysis (affirmation)
 * - Unsourced claim detection
 * - Bias indicators
 */
export async function seedDemoAIFeedback(prisma: PrismaClient): Promise<void> {
  console.log('🤖 Seeding demo AI feedback...');

  for (const feedback of DEMO_AI_FEEDBACK) {
    const createdAt = generateDemoTimestamp(`feedback-${feedback.id}`);

    await prisma.feedback.upsert({
      where: { id: feedback.id },
      update: {
        type: feedback.type,
        subtype: feedback.subtype,
        suggestionText: feedback.suggestionText,
        reasoning: feedback.reasoning,
        confidenceScore: feedback.confidenceScore,
        educationalResources:
          feedback.educationalResources === null
            ? Prisma.DbNull
            : (feedback.educationalResources as unknown as Prisma.InputJsonValue),
        displayedToUser: feedback.displayedToUser,
        userAcknowledged: feedback.userAcknowledged,
        userRevised: feedback.userRevised,
      },
      create: {
        id: feedback.id,
        responseId: feedback.responseId,
        type: feedback.type,
        subtype: feedback.subtype,
        suggestionText: feedback.suggestionText,
        reasoning: feedback.reasoning,
        confidenceScore: feedback.confidenceScore,
        educationalResources:
          feedback.educationalResources === null
            ? Prisma.DbNull
            : (feedback.educationalResources as unknown as Prisma.InputJsonValue),
        displayedToUser: feedback.displayedToUser,
        userAcknowledged: feedback.userAcknowledged,
        userRevised: feedback.userRevised,
        createdAt,
      },
    });
  }

  console.log(`✅ Seeded ${DEMO_AI_FEEDBACK.length} demo AI feedback instances`);
}

/**
 * Truncate all demo-specific data
 * Uses ID prefix matching to delete both hand-crafted and LLM-generated demo data.
 * Demo IDs use the '11111111-' prefix.
 */
export async function truncateDemoData(prisma: PrismaClient): Promise<void> {
  console.log('🗑️  Truncating demo data...');

  // Delete in reverse dependency order
  // Using raw SQL for prefix-based matching to catch all demo data (hand-crafted + LLM-generated)
  const DEMO_PREFIX = '11111111-%';

  // Delete feedback for demo responses (by response ID prefix)
  await prisma.$executeRaw`DELETE FROM feedback WHERE response_id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo AI feedback');

  // Delete alignments for demo users (by user ID prefix)
  await prisma.$executeRaw`DELETE FROM alignments WHERE user_id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo alignments');

  // Delete common ground analyses for demo topics (by topic ID prefix)
  await prisma.$executeRaw`DELETE FROM common_ground_analyses WHERE topic_id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo common ground analyses');

  // Delete propositions for demo topics (by topic ID prefix)
  await prisma.$executeRaw`DELETE FROM propositions WHERE topic_id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo propositions');

  // Delete responses by author ID prefix or topic ID prefix
  await prisma.$executeRaw`DELETE FROM responses WHERE author_id::text LIKE ${DEMO_PREFIX} OR topic_id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo responses');

  // Delete topic-tag associations for demo topics (by topic ID prefix)
  await prisma.$executeRaw`DELETE FROM topic_tags WHERE topic_id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo topic-tag associations');

  // Delete demo topics (by ID prefix)
  await prisma.$executeRaw`DELETE FROM discussion_topics WHERE id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo topics');

  // Delete demo tags (by ID prefix)
  await prisma.$executeRaw`DELETE FROM tags WHERE id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo tags');

  // Delete demo users (by ID prefix)
  await prisma.$executeRaw`DELETE FROM users WHERE id::text LIKE ${DEMO_PREFIX}`;
  console.log('  ✓ Deleted demo users');

  console.log('✅ Demo data truncated');
}

// =============================================================================
// GENERATED CONTENT INTEGRATION
// =============================================================================

/**
 * Get generated content (from cache or LLM)
 */
async function getGeneratedContent(options: { force?: boolean } = {}): Promise<CachedData | null> {
  const useGenerated = process.env['USE_GENERATED_CONTENT'] !== 'false';
  if (!useGenerated) {
    console.log('USE_GENERATED_CONTENT=false, using hand-crafted data only');
    return null;
  }

  try {
    const orchestrator = new GenerationOrchestrator();
    const data = await orchestrator.getData({ forceRegenerate: options.force });
    orchestrator.destroy();
    return data;
  } catch (error) {
    console.warn('Failed to get generated content, falling back to hand-crafted:', error);
    return null;
  }
}

/**
 * Seed LLM-generated topics into the database
 */
async function seedGeneratedTopics(prisma: PrismaClient, topics: GeneratedTopic[]): Promise<void> {
  console.log('📋 Seeding generated topics...');

  for (const topic of topics) {
    const createdAt = generateDemoTimestamp(`topic-${topic.id}`);

    await prisma.discussionTopic.upsert({
      where: { id: topic.id },
      update: {
        title: topic.title,
        description: topic.description,
        status: topic.status,
        crossCuttingThemes: topic.crossCuttingThemes,
      },
      create: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        slug: topic.slug,
        creatorId: topic.creatorId,
        status: topic.status,
        crossCuttingThemes: topic.crossCuttingThemes,
        createdAt,
        activatedAt: topic.status !== 'SEEDING' ? createdAt : null,
      },
    });

    // Create topic-tag associations
    for (const tagId of topic.tagIds) {
      await prisma.topicTag.upsert({
        where: {
          topicId_tagId: {
            topicId: topic.id,
            tagId: tagId,
          },
        },
        update: {},
        create: {
          topicId: topic.id,
          tagId: tagId,
          source: 'CREATOR',
        },
      });

      // Increment tag usage count
      await prisma.tag.update({
        where: { id: tagId },
        data: { usageCount: { increment: 1 } },
      });
    }

    console.log(`  ✓ ${topic.title.substring(0, 50)}...`);
  }

  console.log(`✅ Seeded ${topics.length} generated topics`);
}

/**
 * Seed LLM-generated responses into the database
 */
async function seedGeneratedResponses(
  prisma: PrismaClient,
  responses: GeneratedResponse[],
): Promise<void> {
  console.log('💬 Seeding generated responses...');

  // Sort responses to ensure parents are created before children
  const sortedResponses = [...responses].sort((a, b) => {
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    return 0;
  });

  for (const response of sortedResponses) {
    const createdAt = generateDemoTimestamp(`response-${response.id}`);

    await prisma.response.upsert({
      where: { id: response.id },
      update: {
        content: response.content,
        citedSources: response.citedSources as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: response.id,
        topicId: response.topicId,
        authorId: response.authorId,
        parentId: response.parentId,
        content: response.content,
        citedSources: response.citedSources as unknown as Prisma.InputJsonValue,
        createdAt,
      },
    });
  }

  // Update response counts on topics
  const topicResponseCounts = new Map<string, number>();
  for (const response of responses) {
    const count = topicResponseCounts.get(response.topicId) ?? 0;
    topicResponseCounts.set(response.topicId, count + 1);
  }

  for (const [topicId, count] of topicResponseCounts) {
    await prisma.discussionTopic.update({
      where: { id: topicId },
      data: { responseCount: { increment: count } },
    });
  }

  console.log(`✅ Seeded ${responses.length} generated responses`);
}

/**
 * Seed LLM-generated propositions into the database
 */
async function seedGeneratedPropositions(
  prisma: PrismaClient,
  propositions: GeneratedProposition[],
): Promise<void> {
  console.log('📝 Seeding generated propositions...');

  for (const prop of propositions) {
    const createdAt = generateDemoTimestamp(`proposition-${prop.id}`);

    await prisma.proposition.upsert({
      where: { id: prop.id },
      update: {
        statement: prop.statement,
        supportCount: prop.supportCount,
        opposeCount: prop.opposeCount,
        nuancedCount: prop.nuancedCount,
        consensusScore: prop.consensusScore,
        status: prop.status,
      },
      create: {
        id: prop.id,
        topicId: prop.topicId,
        statement: prop.statement,
        source: prop.source,
        supportCount: prop.supportCount,
        opposeCount: prop.opposeCount,
        nuancedCount: prop.nuancedCount,
        consensusScore: prop.consensusScore,
        status: prop.status,
        createdAt,
      },
    });
  }

  console.log(`✅ Seeded ${propositions.length} generated propositions`);
}

/**
 * Seed LLM-generated common ground analyses into the database
 */
async function seedGeneratedCommonGround(
  prisma: PrismaClient,
  commonGroundList: GeneratedCommonGround[],
): Promise<void> {
  console.log('🤝 Seeding generated common ground...');

  for (const cg of commonGroundList) {
    const createdAt = generateDemoTimestamp(`commonground-${cg.id}`);

    await prisma.commonGroundAnalysis.upsert({
      where: { id: cg.id },
      update: {
        agreementZones: cg.agreementZones as unknown as Prisma.InputJsonValue,
        misunderstandings: cg.misunderstandings as unknown as Prisma.InputJsonValue,
        genuineDisagreements: cg.genuineDisagreements as unknown as Prisma.InputJsonValue,
        overallConsensusScore: cg.overallConsensusScore,
      },
      create: {
        id: cg.id,
        topicId: cg.topicId,
        version: cg.version,
        agreementZones: cg.agreementZones as unknown as Prisma.InputJsonValue,
        misunderstandings: cg.misunderstandings as unknown as Prisma.InputJsonValue,
        genuineDisagreements: cg.genuineDisagreements as unknown as Prisma.InputJsonValue,
        overallConsensusScore: cg.overallConsensusScore,
        participantCountAtGeneration: cg.participantCountAtGeneration,
        responseCountAtGeneration: cg.responseCountAtGeneration,
        modelVersion: cg.modelVersion,
        createdAt,
      },
    });
  }

  console.log(`✅ Seeded ${commonGroundList.length} generated common ground analyses`);
}

/**
 * Log LLM-generated bridging suggestions (no DB table yet)
 */
function seedGeneratedBridging(bridgingList: GeneratedBridgingSuggestion[]): void {
  console.log(`🌉 Bridging suggestions: ${bridgingList.length} (cache only, no DB table yet)`);
}

/**
 * Main demo seed orchestrator
 *
 * Seeds all demo data in the correct dependency order:
 * 1. Personas (users)
 * 2. Tags
 * 3. Topics (hand-crafted + generated)
 * 4. Responses (hand-crafted + generated)
 * 5. Propositions (hand-crafted + generated)
 * 6. Alignments
 * 7. Common ground (hand-crafted + generated)
 * 8. AI feedback
 * 9. Bridging suggestions (generated, cache only)
 */
export async function seedDemo(
  prisma: PrismaClient,
  options: { force?: boolean } = {},
): Promise<void> {
  console.log('🌱 Starting demo environment seed...');
  console.log('');

  if (options.force) {
    await truncateDemoData(prisma);
    console.log('');
  }

  // Get generated content (from cache or LLM)
  const generatedContent = await getGeneratedContent(options);
  if (generatedContent) {
    console.log('');
  }

  // Phase 2: Foundational
  await seedDemoPersonas(prisma);
  console.log('');

  // Phase 3: User Story 1
  await seedDemoTags(prisma);

  // Seed hand-crafted topics
  await seedDemoTopics(prisma);
  // Seed generated topics
  if (generatedContent) {
    await seedGeneratedTopics(prisma, generatedContent.topics);
  }

  // Seed hand-crafted responses
  await seedDemoResponses(prisma);
  // Seed generated responses
  if (generatedContent) {
    await seedGeneratedResponses(prisma, generatedContent.responses);
  }

  // Seed hand-crafted propositions
  await seedDemoPropositions(prisma);
  // Seed generated propositions
  if (generatedContent) {
    await seedGeneratedPropositions(prisma, generatedContent.propositions);
  }

  await seedDemoAlignments(prisma);

  // Seed hand-crafted common ground
  await seedDemoCommonGround(prisma);
  // Seed generated common ground and bridging
  if (generatedContent) {
    await seedGeneratedCommonGround(prisma, generatedContent.commonGround);
    seedGeneratedBridging(generatedContent.bridging);
  }
  console.log('');

  // Phase 5: User Story 3
  await seedDemoAIFeedback(prisma);
  console.log('');

  // Update participant counts for all demo topics
  console.log('📊 Updating participant counts...');
  const allTopicIds = [
    ...DEMO_TOPICS.map((t) => t.id),
    ...(generatedContent?.topics.map((t) => t.id) ?? []),
  ];

  for (const topicId of allTopicIds) {
    const uniqueParticipants = await prisma.response.groupBy({
      by: ['authorId'],
      where: { topicId },
    });

    await prisma.discussionTopic.update({
      where: { id: topicId },
      data: { participantCount: uniqueParticipants.length },
    });
  }
  console.log(`✅ Updated participant counts for ${allTopicIds.length} topics`);
  console.log('');

  // Calculate totals
  const totalTopics = DEMO_TOPICS.length + (generatedContent?.topics.length ?? 0);
  const totalResponses = DEMO_RESPONSES.length + (generatedContent?.responses.length ?? 0);
  const totalPropositions = DEMO_PROPOSITIONS.length + (generatedContent?.propositions.length ?? 0);
  const totalCommonGround =
    DEMO_COMMON_GROUND.length + (generatedContent?.commonGround.length ?? 0);
  const totalBridging = generatedContent?.bridging.length ?? 0;

  // Summary
  console.log('🎉 Demo environment seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  • ${DEMO_PERSONAS.length} personas`);
  console.log(`  • ${DEMO_TAGS.length} tags`);
  console.log(
    `  • ${totalTopics} topics (${DEMO_TOPICS.length} hand-crafted${generatedContent ? ` + ${generatedContent.topics.length} generated` : ''})`,
  );
  console.log(
    `  • ${totalResponses} responses (${DEMO_RESPONSES.length} hand-crafted${generatedContent ? ` + ${generatedContent.responses.length} generated` : ''})`,
  );
  console.log(
    `  • ${totalPropositions} propositions (${DEMO_PROPOSITIONS.length} hand-crafted${generatedContent ? ` + ${generatedContent.propositions.length} generated` : ''})`,
  );
  console.log(`  • ${DEMO_ALIGNMENTS.length} alignments`);
  console.log(
    `  • ${totalCommonGround} common ground analyses (${DEMO_COMMON_GROUND.length} hand-crafted${generatedContent ? ` + ${generatedContent.commonGround.length} generated` : ''})`,
  );
  console.log(`  • ${DEMO_AI_FEEDBACK.length} AI feedback instances`);
  if (totalBridging > 0) {
    console.log(`  • ${totalBridging} bridging suggestions (cache only)`);
  }
  console.log('');
  console.log('🔑 Demo credentials:');
  for (const persona of DEMO_PERSONAS) {
    console.log(`  ${persona.displayName}: ${persona.email}`);
  }
}

export default seedDemo;
