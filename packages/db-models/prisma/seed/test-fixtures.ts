/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Database seeding script for test fixtures
 *
 * Creates deterministic test data for E2E and integration tests.
 * All data uses fixed UUIDs and values to ensure reproducible tests.
 *
 * Usage:
 *   pnpm db:seed:test
 *
 * @module test-fixtures
 */

import { prisma } from '../../src/client.js';

// ============================================================================
// DETERMINISTIC IDS
// These UUIDs are fixed to ensure reproducible test data across runs.
// Format: 00000000-0000-4000-8000-00000000XXXX where XXXX is a sequential number
// ============================================================================

const TEST_IDS = {
  // Users
  USER_ALICE: '00000000-0000-4000-8000-000000000001',
  USER_BOB: '00000000-0000-4000-8000-000000000002',
  USER_CHARLIE: '00000000-0000-4000-8000-000000000003',
  USER_MODERATOR: '00000000-0000-4000-8000-000000000004',
  USER_ADMIN: '00000000-0000-4000-8000-000000000005',

  // Topics
  TOPIC_CLIMATE: '00000000-0000-4000-8000-000000000101',
  TOPIC_AI_ETHICS: '00000000-0000-4000-8000-000000000102',
  TOPIC_REMOTE_WORK: '00000000-0000-4000-8000-000000000103',

  // Discussions
  DISCUSSION_CLIMATE_1: '00000000-0000-4000-8000-000000000201',
  DISCUSSION_AI_SAFETY: '00000000-0000-4000-8000-000000000202',
  DISCUSSION_REMOTE_PRODUCTIVITY: '00000000-0000-4000-8000-000000000203',

  // Responses
  RESPONSE_1: '00000000-0000-4000-8000-000000000301',
  RESPONSE_2: '00000000-0000-4000-8000-000000000302',
  RESPONSE_3: '00000000-0000-4000-8000-000000000303',
  RESPONSE_4: '00000000-0000-4000-8000-000000000304',
  RESPONSE_5: '00000000-0000-4000-8000-000000000305',

  // Propositions
  PROP_CLIMATE_1: '00000000-0000-4000-8000-000000000401',
  PROP_CLIMATE_2: '00000000-0000-4000-8000-000000000402',
  PROP_AI_1: '00000000-0000-4000-8000-000000000403',
  PROP_REMOTE_1: '00000000-0000-4000-8000-000000000404',
  PROP_REMOTE_2: '00000000-0000-4000-8000-000000000405',

  // Tags
  TAG_ENVIRONMENT: '00000000-0000-4000-8000-000000000501',
  TAG_TECHNOLOGY: '00000000-0000-4000-8000-000000000502',
  TAG_ECONOMY: '00000000-0000-4000-8000-000000000503',
  TAG_SOCIETY: '00000000-0000-4000-8000-000000000504',
  TAG_ETHICS: '00000000-0000-4000-8000-000000000505',
} as const;

// Export IDs for use in tests
export { TEST_IDS };

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

/**
 * Seed test users with varying trust scores and verification levels
 */
async function seedUsers(): Promise<void> {
  console.log('Creating test users...');

  const users = [
    {
      id: TEST_IDS.USER_ALICE,
      email: 'alice@test.reasonbridge.org',
      cognitoSub: 'test-cognito-alice',
      displayName: 'Alice Anderson',
      authMethod: 'EMAIL_PASSWORD' as const,
      emailVerified: true,
      phoneNumber: '+15551234001',
      phoneVerified: true,
      verificationLevel: 'VERIFIED_HUMAN' as const,
      trustScoreAbility: 0.85,
      trustScoreBenevolence: 0.9,
      trustScoreIntegrity: 0.88,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.USER_BOB,
      email: 'bob@test.reasonbridge.org',
      cognitoSub: 'test-cognito-bob',
      displayName: 'Bob Builder',
      authMethod: 'EMAIL_PASSWORD' as const,
      emailVerified: true,
      phoneNumber: '+15551234002',
      phoneVerified: false,
      verificationLevel: 'ENHANCED' as const,
      trustScoreAbility: 0.72,
      trustScoreBenevolence: 0.68,
      trustScoreIntegrity: 0.75,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.USER_CHARLIE,
      email: 'charlie@test.reasonbridge.org',
      cognitoSub: 'test-cognito-charlie',
      displayName: 'Charlie Chen',
      authMethod: 'GOOGLE_OAUTH' as const,
      emailVerified: true,
      phoneNumber: null,
      phoneVerified: false,
      verificationLevel: 'BASIC' as const,
      trustScoreAbility: 0.5,
      trustScoreBenevolence: 0.5,
      trustScoreIntegrity: 0.5,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.USER_MODERATOR,
      email: 'moderator@test.reasonbridge.org',
      cognitoSub: 'test-cognito-moderator',
      displayName: 'Mod Martinez',
      authMethod: 'EMAIL_PASSWORD' as const,
      emailVerified: true,
      phoneNumber: '+15551234004',
      phoneVerified: true,
      verificationLevel: 'VERIFIED_HUMAN' as const,
      trustScoreAbility: 0.95,
      trustScoreBenevolence: 0.95,
      trustScoreIntegrity: 0.95,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.USER_ADMIN,
      email: 'admin@test.reasonbridge.org',
      cognitoSub: 'test-cognito-admin',
      displayName: 'Admin Adams',
      authMethod: 'EMAIL_PASSWORD' as const,
      emailVerified: true,
      phoneNumber: '+15551234005',
      phoneVerified: true,
      verificationLevel: 'VERIFIED_HUMAN' as const,
      trustScoreAbility: 0.99,
      trustScoreBenevolence: 0.99,
      trustScoreIntegrity: 0.99,
      status: 'ACTIVE' as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  console.log(`  Created ${users.length} test users`);
}

/**
 * Seed tags for topic categorization
 */
async function seedTags(): Promise<void> {
  console.log('Creating tags...');

  const tags = [
    {
      id: TEST_IDS.TAG_ENVIRONMENT,
      name: 'Environment',
      slug: 'environment',
      usageCount: 15,
      aiSynonyms: ['climate', 'ecology', 'sustainability', 'green'],
    },
    {
      id: TEST_IDS.TAG_TECHNOLOGY,
      name: 'Technology',
      slug: 'technology',
      usageCount: 22,
      aiSynonyms: ['tech', 'digital', 'computing', 'innovation'],
    },
    {
      id: TEST_IDS.TAG_ECONOMY,
      name: 'Economy',
      slug: 'economy',
      usageCount: 18,
      aiSynonyms: ['economics', 'finance', 'business', 'market'],
    },
    {
      id: TEST_IDS.TAG_SOCIETY,
      name: 'Society',
      slug: 'society',
      usageCount: 12,
      aiSynonyms: ['social', 'community', 'culture', 'people'],
    },
    {
      id: TEST_IDS.TAG_ETHICS,
      name: 'Ethics',
      slug: 'ethics',
      usageCount: 8,
      aiSynonyms: ['morality', 'values', 'principles', 'philosophy'],
    },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: {},
      create: tag,
    });
  }

  console.log(`  Created ${tags.length} tags`);
}

/**
 * Seed discussion topics with varying activity levels
 */
async function seedTopics(): Promise<void> {
  console.log('Creating discussion topics...');

  const topics = [
    {
      id: TEST_IDS.TOPIC_CLIMATE,
      title: 'Climate Change: Balancing Economic Growth and Environmental Protection',
      description:
        'A structured discussion exploring the trade-offs between economic development and environmental sustainability. How can we achieve growth while protecting our planet?',
      slug: 'climate-change-balancing-economic-growth-and-environmental-protection',
      creatorId: TEST_IDS.USER_ALICE,
      status: 'ACTIVE' as const,
      evidenceStandards: 'STANDARD' as const,
      minimumDiversityScore: 0.3,
      currentDiversityScore: 0.65,
      participantCount: 45,
      responseCount: 128,
      activeDiscussionCount: 3,
      activityLevel: 'HIGH' as const,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['sustainability', 'policy', 'science'],
    },
    {
      id: TEST_IDS.TOPIC_AI_ETHICS,
      title: 'AI Ethics: Navigating the Future of Artificial Intelligence',
      description:
        'Exploring ethical considerations in AI development, including bias, transparency, job displacement, and the alignment problem.',
      slug: 'ai-ethics-navigating-the-future-of-artificial-intelligence',
      creatorId: TEST_IDS.USER_BOB,
      status: 'ACTIVE' as const,
      evidenceStandards: 'RIGOROUS' as const,
      minimumDiversityScore: 0.35,
      currentDiversityScore: 0.58,
      participantCount: 32,
      responseCount: 87,
      activeDiscussionCount: 2,
      activityLevel: 'MEDIUM' as const,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['technology', 'ethics', 'future'],
    },
    {
      id: TEST_IDS.TOPIC_REMOTE_WORK,
      title: 'Remote Work: The Future of Employment?',
      description:
        'Examining the pros and cons of remote work for employees, employers, and society. What does the future of work look like?',
      slug: 'remote-work-the-future-of-employment',
      creatorId: TEST_IDS.USER_CHARLIE,
      status: 'ACTIVE' as const,
      evidenceStandards: 'STANDARD' as const,
      minimumDiversityScore: 0.25,
      currentDiversityScore: 0.52,
      participantCount: 28,
      responseCount: 65,
      activeDiscussionCount: 2,
      activityLevel: 'MEDIUM' as const,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['work', 'technology', 'lifestyle'],
    },
  ];

  for (const topic of topics) {
    await prisma.discussionTopic.upsert({
      where: { id: topic.id },
      update: {},
      create: topic,
    });
  }

  // Create topic-tag associations
  const topicTags = [
    {
      topicId: TEST_IDS.TOPIC_CLIMATE,
      tagId: TEST_IDS.TAG_ENVIRONMENT,
      source: 'CREATOR' as const,
    },
    {
      topicId: TEST_IDS.TOPIC_CLIMATE,
      tagId: TEST_IDS.TAG_ECONOMY,
      source: 'AI_SUGGESTED' as const,
    },
    {
      topicId: TEST_IDS.TOPIC_AI_ETHICS,
      tagId: TEST_IDS.TAG_TECHNOLOGY,
      source: 'CREATOR' as const,
    },
    { topicId: TEST_IDS.TOPIC_AI_ETHICS, tagId: TEST_IDS.TAG_ETHICS, source: 'CREATOR' as const },
    {
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      tagId: TEST_IDS.TAG_TECHNOLOGY,
      source: 'AI_SUGGESTED' as const,
    },
    {
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      tagId: TEST_IDS.TAG_SOCIETY,
      source: 'CREATOR' as const,
    },
  ];

  for (const topicTag of topicTags) {
    await prisma.topicTag.upsert({
      where: { topicId_tagId: { topicId: topicTag.topicId, tagId: topicTag.tagId } },
      update: {},
      create: topicTag,
    });
  }

  console.log(`  Created ${topics.length} topics with tags`);
}

/**
 * Seed discussions within topics
 */
async function seedDiscussions(): Promise<void> {
  console.log('Creating discussions...');

  const discussions = [
    {
      id: TEST_IDS.DISCUSSION_CLIMATE_1,
      topicId: TEST_IDS.TOPIC_CLIMATE,
      creatorId: TEST_IDS.USER_ALICE,
      title: 'Carbon Tax vs Cap-and-Trade: Which Approach is More Effective?',
      status: 'ACTIVE' as const,
      responseCount: 24,
      participantCount: 12,
    },
    {
      id: TEST_IDS.DISCUSSION_AI_SAFETY,
      topicId: TEST_IDS.TOPIC_AI_ETHICS,
      creatorId: TEST_IDS.USER_BOB,
      title: 'The AI Alignment Problem: Can We Ensure Beneficial AI?',
      status: 'ACTIVE' as const,
      responseCount: 18,
      participantCount: 8,
    },
    {
      id: TEST_IDS.DISCUSSION_REMOTE_PRODUCTIVITY,
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      creatorId: TEST_IDS.USER_CHARLIE,
      title: 'Measuring Productivity in Remote Work: Hours vs Output',
      status: 'ACTIVE' as const,
      responseCount: 15,
      participantCount: 10,
    },
  ];

  for (const discussion of discussions) {
    await prisma.discussion.upsert({
      where: { id: discussion.id },
      update: {},
      create: discussion,
    });
  }

  console.log(`  Created ${discussions.length} discussions`);
}

/**
 * Seed propositions (key claims within discussions)
 */
async function seedPropositions(): Promise<void> {
  console.log('Creating propositions...');

  const propositions = [
    {
      id: TEST_IDS.PROP_CLIMATE_1,
      topicId: TEST_IDS.TOPIC_CLIMATE,
      statement:
        'Carbon pricing is the most effective market-based solution for reducing emissions',
      source: 'AI_IDENTIFIED' as const,
      supportCount: 28,
      opposeCount: 12,
      nuancedCount: 8,
      consensusScore: 0.58,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.PROP_CLIMATE_2,
      topicId: TEST_IDS.TOPIC_CLIMATE,
      statement: 'Nuclear energy should be part of the clean energy transition',
      source: 'USER_CREATED' as const,
      creatorId: TEST_IDS.USER_BOB,
      supportCount: 22,
      opposeCount: 18,
      nuancedCount: 5,
      consensusScore: 0.49,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.PROP_AI_1,
      topicId: TEST_IDS.TOPIC_AI_ETHICS,
      statement: 'AI systems should be required to explain their decision-making processes',
      source: 'AI_IDENTIFIED' as const,
      supportCount: 35,
      opposeCount: 5,
      nuancedCount: 10,
      consensusScore: 0.7,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.PROP_REMOTE_1,
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      statement: 'Remote work significantly improves work-life balance for most employees',
      source: 'AI_IDENTIFIED' as const,
      supportCount: 32,
      opposeCount: 8,
      nuancedCount: 6,
      consensusScore: 0.7,
      status: 'ACTIVE' as const,
    },
    {
      id: TEST_IDS.PROP_REMOTE_2,
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      statement: 'In-person collaboration is essential for creative and innovative work',
      source: 'USER_CREATED' as const,
      creatorId: TEST_IDS.USER_ALICE,
      supportCount: 18,
      opposeCount: 20,
      nuancedCount: 12,
      consensusScore: 0.36,
      status: 'ACTIVE' as const,
    },
  ];

  for (const prop of propositions) {
    await prisma.proposition.upsert({
      where: { id: prop.id },
      update: {},
      create: prop,
    });
  }

  console.log(`  Created ${propositions.length} propositions`);
}

/**
 * Seed responses (comments in discussions)
 */
async function seedResponses(): Promise<void> {
  console.log('Creating responses...');

  const responses = [
    {
      id: TEST_IDS.RESPONSE_1,
      topicId: TEST_IDS.TOPIC_CLIMATE,
      discussionId: TEST_IDS.DISCUSSION_CLIMATE_1,
      authorId: TEST_IDS.USER_ALICE,
      content:
        'I believe carbon taxes are more transparent and easier to implement than cap-and-trade systems. The price signal is clear, and it allows businesses to plan their investments accordingly.',
      citedSources: [
        { url: 'https://example.com/carbon-tax-study', title: 'Carbon Tax Effectiveness Study' },
      ],
      containsOpinion: true,
      containsFactualClaims: true,
      status: 'VISIBLE' as const,
    },
    {
      id: TEST_IDS.RESPONSE_2,
      topicId: TEST_IDS.TOPIC_CLIMATE,
      discussionId: TEST_IDS.DISCUSSION_CLIMATE_1,
      authorId: TEST_IDS.USER_BOB,
      parentId: TEST_IDS.RESPONSE_1,
      content:
        'While transparency is important, cap-and-trade systems provide certainty about emissions outcomes. With a cap, we know exactly how much emissions will be reduced.',
      citedSources: [],
      containsOpinion: true,
      containsFactualClaims: true,
      status: 'VISIBLE' as const,
    },
    {
      id: TEST_IDS.RESPONSE_3,
      topicId: TEST_IDS.TOPIC_AI_ETHICS,
      discussionId: TEST_IDS.DISCUSSION_AI_SAFETY,
      authorId: TEST_IDS.USER_BOB,
      content:
        'The alignment problem is fundamentally about ensuring AI systems pursue goals that are beneficial to humanity. Current approaches like RLHF show promise but have limitations.',
      citedSources: [
        {
          url: 'https://example.com/ai-alignment-overview',
          title: 'AI Alignment Research Overview',
        },
      ],
      containsOpinion: true,
      containsFactualClaims: true,
      status: 'VISIBLE' as const,
    },
    {
      id: TEST_IDS.RESPONSE_4,
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      discussionId: TEST_IDS.DISCUSSION_REMOTE_PRODUCTIVITY,
      authorId: TEST_IDS.USER_CHARLIE,
      content:
        'We should focus on measuring outcomes rather than hours worked. Knowledge work productivity is notoriously difficult to measure, but output-based metrics are fairer and more accurate.',
      citedSources: [],
      containsOpinion: true,
      containsFactualClaims: false,
      status: 'VISIBLE' as const,
    },
    {
      id: TEST_IDS.RESPONSE_5,
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      discussionId: TEST_IDS.DISCUSSION_REMOTE_PRODUCTIVITY,
      authorId: TEST_IDS.USER_ALICE,
      parentId: TEST_IDS.RESPONSE_4,
      content:
        'I agree that output-based metrics are important, but we also need to consider collaboration and mentorship aspects that are harder to measure but equally valuable.',
      citedSources: [],
      containsOpinion: true,
      containsFactualClaims: false,
      status: 'VISIBLE' as const,
    },
  ];

  for (const response of responses) {
    await prisma.response.upsert({
      where: { id: response.id },
      update: {},
      create: response,
    });
  }

  console.log(`  Created ${responses.length} responses`);
}

/**
 * Seed user alignments on propositions
 */
async function seedAlignments(): Promise<void> {
  console.log('Creating alignments...');

  const alignments = [
    // Climate carbon pricing proposition
    {
      userId: TEST_IDS.USER_ALICE,
      propositionId: TEST_IDS.PROP_CLIMATE_1,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_BOB,
      propositionId: TEST_IDS.PROP_CLIMATE_1,
      stance: 'OPPOSE' as const,
    },
    {
      userId: TEST_IDS.USER_CHARLIE,
      propositionId: TEST_IDS.PROP_CLIMATE_1,
      stance: 'NUANCED' as const,
      nuanceExplanation: 'Effective but needs complementary policies',
    },

    // Nuclear energy proposition
    {
      userId: TEST_IDS.USER_ALICE,
      propositionId: TEST_IDS.PROP_CLIMATE_2,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_BOB,
      propositionId: TEST_IDS.PROP_CLIMATE_2,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_CHARLIE,
      propositionId: TEST_IDS.PROP_CLIMATE_2,
      stance: 'OPPOSE' as const,
    },

    // AI explainability proposition
    { userId: TEST_IDS.USER_ALICE, propositionId: TEST_IDS.PROP_AI_1, stance: 'SUPPORT' as const },
    { userId: TEST_IDS.USER_BOB, propositionId: TEST_IDS.PROP_AI_1, stance: 'SUPPORT' as const },
    {
      userId: TEST_IDS.USER_CHARLIE,
      propositionId: TEST_IDS.PROP_AI_1,
      stance: 'NUANCED' as const,
      nuanceExplanation: 'Important but may limit capabilities',
    },

    // Remote work propositions
    {
      userId: TEST_IDS.USER_ALICE,
      propositionId: TEST_IDS.PROP_REMOTE_1,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_BOB,
      propositionId: TEST_IDS.PROP_REMOTE_1,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_CHARLIE,
      propositionId: TEST_IDS.PROP_REMOTE_1,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_ALICE,
      propositionId: TEST_IDS.PROP_REMOTE_2,
      stance: 'NUANCED' as const,
      nuanceExplanation: 'Depends on the type of work and team',
    },
    {
      userId: TEST_IDS.USER_BOB,
      propositionId: TEST_IDS.PROP_REMOTE_2,
      stance: 'SUPPORT' as const,
    },
    {
      userId: TEST_IDS.USER_CHARLIE,
      propositionId: TEST_IDS.PROP_REMOTE_2,
      stance: 'OPPOSE' as const,
    },
  ];

  for (const alignment of alignments) {
    await prisma.alignment.upsert({
      where: {
        userId_propositionId: {
          userId: alignment.userId,
          propositionId: alignment.propositionId,
        },
      },
      update: {},
      create: alignment,
    });
  }

  console.log(`  Created ${alignments.length} alignments`);
}

/**
 * Seed common ground analyses
 */
async function seedCommonGroundAnalyses(): Promise<void> {
  console.log('Creating common ground analyses...');

  const analyses = [
    {
      topicId: TEST_IDS.TOPIC_REMOTE_WORK,
      version: 1,
      agreementZones: [
        {
          proposition: 'Flexibility in work arrangements benefits employees',
          agreementPercentage: 85,
          supportingEvidence: ['Employee satisfaction surveys', 'Retention data'],
          participantCount: 28,
        },
        {
          proposition: 'Clear communication is critical for remote teams',
          agreementPercentage: 92,
          supportingEvidence: ['Team performance metrics', 'Manager feedback'],
          participantCount: 28,
        },
      ],
      misunderstandings: [
        {
          topic: 'Productivity measurement',
          interpretations: [
            { interpretation: 'Hours worked', participantCount: 10 },
            { interpretation: 'Output delivered', participantCount: 18 },
          ],
          clarification: 'Distinguish between time-based and results-based productivity metrics',
        },
      ],
      genuineDisagreements: [
        {
          proposition: 'Optimal work arrangement',
          viewpoints: [
            {
              position: 'Fully remote',
              participantCount: 8,
              reasoning: ['Better work-life balance', 'No commute', 'More focus time'],
            },
            {
              position: 'Hybrid (2-3 days office)',
              participantCount: 14,
              reasoning: [
                'Face-to-face collaboration',
                'Social connection',
                'Work-life separation',
              ],
            },
            {
              position: 'Mostly in-office',
              participantCount: 6,
              reasoning: ['Team culture', 'Mentorship opportunities', 'Spontaneous innovation'],
            },
          ],
          underlyingValues: ['Individual autonomy', 'Team cohesion', 'Productivity'],
        },
      ],
      overallConsensusScore: 0.62,
      participantCountAtGeneration: 28,
      responseCountAtGeneration: 65,
      modelVersion: 'claude-3-5-sonnet-20241022',
    },
  ];

  for (const analysis of analyses) {
    // Check if exists first (no unique constraint on topicId+version)
    const existing = await prisma.commonGroundAnalysis.findFirst({
      where: {
        topicId: analysis.topicId,
        version: analysis.version,
      },
    });

    if (!existing) {
      await prisma.commonGroundAnalysis.create({
        data: analysis,
      });
    }
  }

  console.log(`  Created ${analyses.length} common ground analyses`);
}

/**
 * Seed participant activities
 */
async function seedParticipantActivities(): Promise<void> {
  console.log('Creating participant activities...');

  const activities = [
    {
      discussionId: TEST_IDS.DISCUSSION_CLIMATE_1,
      userId: TEST_IDS.USER_ALICE,
      responseCount: 5,
    },
    {
      discussionId: TEST_IDS.DISCUSSION_CLIMATE_1,
      userId: TEST_IDS.USER_BOB,
      responseCount: 3,
    },
    {
      discussionId: TEST_IDS.DISCUSSION_AI_SAFETY,
      userId: TEST_IDS.USER_BOB,
      responseCount: 4,
    },
    {
      discussionId: TEST_IDS.DISCUSSION_REMOTE_PRODUCTIVITY,
      userId: TEST_IDS.USER_CHARLIE,
      responseCount: 3,
    },
    {
      discussionId: TEST_IDS.DISCUSSION_REMOTE_PRODUCTIVITY,
      userId: TEST_IDS.USER_ALICE,
      responseCount: 2,
    },
  ];

  for (const activity of activities) {
    await prisma.participantActivity.upsert({
      where: {
        discussionId_userId: {
          discussionId: activity.discussionId,
          userId: activity.userId,
        },
      },
      update: {},
      create: activity,
    });
  }

  console.log(`  Created ${activities.length} participant activities`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main seeding function - orchestrates all seeders
 */
async function main(): Promise<void> {
  console.log('');
  console.log('='.repeat(60));
  console.log('  Database Test Fixtures Seeding');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Seed in order of dependencies
    await seedUsers();
    await seedTags();
    await seedTopics();
    await seedDiscussions();
    await seedPropositions();
    await seedResponses();
    await seedAlignments();
    await seedCommonGroundAnalyses();
    await seedParticipantActivities();

    console.log('');
    console.log('='.repeat(60));
    console.log('  Test fixtures seeded successfully!');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('  Error seeding test fixtures');
    console.error('='.repeat(60));
    console.error('');
    throw error;
  }
}

// Run main function
main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
