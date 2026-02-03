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
 * Used by environment reset functionality
 */
export async function truncateDemoData(prisma: PrismaClient): Promise<void> {
  console.log('🗑️  Truncating demo data...');

  // Delete in reverse dependency order
  // Using deleteMany with ID filters for demo data

  // Delete feedback for demo responses
  await prisma.feedback.deleteMany({
    where: {
      id: { in: DEMO_AI_FEEDBACK.map((f) => f.id) },
    },
  });
  console.log('  ✓ Deleted demo AI feedback');

  // Delete alignments for demo users
  await prisma.alignment.deleteMany({
    where: {
      userId: { in: DEMO_PERSONAS.map((p) => p.id) },
    },
  });
  console.log('  ✓ Deleted demo alignments');

  // Delete common ground analyses for demo topics
  await prisma.commonGroundAnalysis.deleteMany({
    where: {
      topicId: { in: DEMO_TOPICS.map((t) => t.id) },
    },
  });
  console.log('  ✓ Deleted demo common ground analyses');

  // Delete propositions for demo topics
  await prisma.proposition.deleteMany({
    where: {
      topicId: { in: DEMO_TOPICS.map((t) => t.id) },
    },
  });
  console.log('  ✓ Deleted demo propositions');

  // Delete responses from demo users
  await prisma.response.deleteMany({
    where: {
      authorId: { in: DEMO_PERSONAS.map((p) => p.id) },
    },
  });
  console.log('  ✓ Deleted demo responses');

  // Delete topic-tag associations
  await prisma.topicTag.deleteMany({
    where: {
      topicId: { in: DEMO_TOPICS.map((t) => t.id) },
    },
  });
  console.log('  ✓ Deleted demo topic-tag associations');

  // Delete demo topics
  await prisma.discussionTopic.deleteMany({
    where: {
      id: { in: DEMO_TOPICS.map((t) => t.id) },
    },
  });
  console.log('  ✓ Deleted demo topics');

  // Delete demo tags
  await prisma.tag.deleteMany({
    where: {
      id: { in: DEMO_TAGS.map((t) => t.id) },
    },
  });
  console.log('  ✓ Deleted demo tags');

  // Delete demo users
  await prisma.user.deleteMany({
    where: {
      id: { in: DEMO_PERSONAS.map((p) => p.id) },
    },
  });
  console.log('  ✓ Deleted demo users');

  console.log('✅ Demo data truncated');
}

/**
 * Main demo seed orchestrator
 *
 * Seeds all demo data in the correct dependency order:
 * 1. Personas (users)
 * 2. Tags
 * 3. Topics
 * 4. Responses
 * 5. Propositions
 * 6. Alignments
 * 7. Common ground
 * 8. AI feedback
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

  // Phase 2: Foundational
  await seedDemoPersonas(prisma);
  console.log('');

  // Phase 3: User Story 1
  await seedDemoTags(prisma);
  await seedDemoTopics(prisma);
  await seedDemoResponses(prisma);
  await seedDemoPropositions(prisma);
  await seedDemoAlignments(prisma);
  await seedDemoCommonGround(prisma);
  console.log('');

  // Phase 5: User Story 3
  await seedDemoAIFeedback(prisma);
  console.log('');

  // Summary
  console.log('🎉 Demo environment seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  • ${DEMO_PERSONAS.length} personas`);
  console.log(`  • ${DEMO_TAGS.length} tags`);
  console.log(`  • ${DEMO_TOPICS.length} topics`);
  console.log(`  • ${DEMO_RESPONSES.length} responses`);
  console.log(`  • ${DEMO_PROPOSITIONS.length} propositions`);
  console.log(`  • ${DEMO_ALIGNMENTS.length} alignments`);
  console.log(`  • ${DEMO_COMMON_GROUND.length} common ground analyses`);
  console.log(`  • ${DEMO_AI_FEEDBACK.length} AI feedback instances`);
  console.log('');
  console.log('🔑 Demo credentials:');
  for (const persona of DEMO_PERSONAS) {
    console.log(`  ${persona.displayName}: ${persona.email}`);
  }
}

export default seedDemo;
