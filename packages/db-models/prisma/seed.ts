/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { seedDemo } from './seed/demo-fixtures';
import { prisma } from '../src/client.js';

// Parse command line arguments
const args = process.argv.slice(2);
const isDemoSeed = args.includes('--demo');
const isForceReset = args.includes('--force');

async function main() {
  // Handle --demo flag for demo environment seeding
  if (isDemoSeed) {
    console.log('🎭 Demo Environment Seed Mode');
    console.log('');
    await seedDemo(prisma, { force: isForceReset });
    return;
  }

  console.log('🌱 Seeding E2E database...');

  // Create test users
  console.log('Creating test users...');
  const testUser1 = await prisma.user.upsert({
    where: { cognitoSub: 'test-user-1' },
    update: {},
    create: {
      email: 'testuser1@example.com',
      cognitoSub: 'test-user-1',
      displayName: 'Test User 1',
      authMethod: 'EMAIL_PASSWORD',
      trustScoreAbility: 0.75,
      trustScoreBenevolence: 0.8,
      trustScoreIntegrity: 0.85,
      verificationLevel: 'BASIC',
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { cognitoSub: 'test-user-2' },
    update: {},
    create: {
      email: 'verifieduser@example.com',
      cognitoSub: 'test-user-2',
      displayName: 'Verified User',
      authMethod: 'EMAIL_PASSWORD',
      trustScoreAbility: 0.9,
      trustScoreBenevolence: 0.92,
      trustScoreIntegrity: 0.88,
      verificationLevel: 'VERIFIED_HUMAN',
    },
  });

  console.log(`✅ Created users: ${testUser1.displayName}, ${testUser2.displayName}`);

  // Create test topics (check if they exist first by title since we can't use custom IDs)
  console.log('Creating test topics...');
  const existingTopic1 = await prisma.discussionTopic.findFirst({
    where: { title: 'Should renewable energy be prioritized over fossil fuels?' },
  });
  const topic1 =
    existingTopic1 ||
    (await prisma.discussionTopic.create({
      data: {
        title: 'Should renewable energy be prioritized over fossil fuels?',
        slug: 'renewable-energy-vs-fossil-fuels',
        description:
          'Discuss the transition to renewable energy sources and their impact on the environment and economy.',
        creatorId: testUser1.id,
        crossCuttingThemes: [],
      },
    }));

  const existingTopic2 = await prisma.discussionTopic.findFirst({
    where: { title: 'Universal Basic Income: Viable or Unsustainable?' },
  });
  const topic2 =
    existingTopic2 ||
    (await prisma.discussionTopic.create({
      data: {
        title: 'Universal Basic Income: Viable or Unsustainable?',
        slug: 'universal-basic-income',
        description:
          'Explore the feasibility and potential impact of implementing universal basic income policies.',
        creatorId: testUser2.id,
        crossCuttingThemes: [],
      },
    }));

  const existingTopic3 = await prisma.discussionTopic.findFirst({
    where: { title: 'Remote Work: The Future of Employment?' },
  });
  const topic3 =
    existingTopic3 ||
    (await prisma.discussionTopic.create({
      data: {
        title: 'Remote Work: The Future of Employment?',
        slug: 'remote-work-future-employment',
        description:
          'Debate the long-term effects of remote work on productivity, work-life balance, and urban development.',
        creatorId: testUser1.id,
        crossCuttingThemes: [],
      },
    }));

  console.log(`✅ Created topics: "${topic1.title}", "${topic2.title}", "${topic3.title}"`);

  // Create some test responses
  console.log('Creating test responses...');
  const existingResponse1 = await prisma.response.findFirst({
    where: {
      topicId: topic3.id,
      authorId: testUser2.id,
      content: { startsWith: 'Renewable energy is crucial' },
    },
  });
  const response1 =
    existingResponse1 ||
    (await prisma.response.create({
      data: {
        topicId: topic3.id,
        authorId: testUser2.id,
        content:
          'Renewable energy is crucial for reducing carbon emissions and combating climate change. The initial investment costs are offset by long-term savings and environmental benefits.',
        citedSources: [],
      },
    }));

  const existingResponse2 = await prisma.response.findFirst({
    where: {
      topicId: topic3.id,
      authorId: testUser1.id,
      parentId: response1.id,
    },
  });
  const response2 =
    existingResponse2 ||
    (await prisma.response.create({
      data: {
        topicId: topic3.id,
        authorId: testUser1.id,
        parentId: response1.id,
        content:
          'While I agree on the environmental benefits, we need to consider the economic transition costs and job displacement in fossil fuel industries. A gradual transition with retraining programs would be more sustainable.',
        citedSources: [],
      },
    }));

  console.log(`✅ Created ${2} test responses`);

  // Create propositions for remote work topic (topic3 - appears first in API due to DESC sort)
  console.log('Creating test propositions...');

  // Find or create propositions using findFirst + create pattern (no unique constraint exists)
  let prop1 = await prisma.proposition.findFirst({
    where: {
      topicId: topic3.id,
      statement: 'Remote work significantly improves work-life balance',
    },
  });
  if (!prop1) {
    prop1 = await prisma.proposition.create({
      data: {
        topicId: topic3.id,
        statement: 'Remote work significantly improves work-life balance',
        source: 'AI_IDENTIFIED',
        supportCount: 8,
        opposeCount: 1,
        nuancedCount: 1,
        consensusScore: 0.8,
        status: 'ACTIVE',
      },
    });
  }

  let prop2 = await prisma.proposition.findFirst({
    where: {
      topicId: topic3.id,
      statement: 'Remote work increases overall productivity for most workers',
    },
  });
  if (!prop2) {
    prop2 = await prisma.proposition.create({
      data: {
        topicId: topic3.id,
        statement: 'Remote work increases overall productivity for most workers',
        source: 'AI_IDENTIFIED',
        supportCount: 5,
        opposeCount: 4,
        nuancedCount: 1,
        consensusScore: 0.52,
        status: 'ACTIVE',
      },
    });
  }

  let prop3 = await prisma.proposition.findFirst({
    where: {
      topicId: topic3.id,
      statement: 'Remote work harms company culture and team collaboration',
    },
  });
  if (!prop3) {
    prop3 = await prisma.proposition.create({
      data: {
        topicId: topic3.id,
        statement: 'Remote work harms company culture and team collaboration',
        source: 'AI_IDENTIFIED',
        supportCount: 3,
        opposeCount: 6,
        nuancedCount: 1,
        consensusScore: 0.3,
        status: 'ACTIVE',
      },
    });
  }

  console.log(`✅ Created propositions for topic: ${topic3.title}`);

  // Create alignments
  console.log('Creating test alignments...');
  const alignments = [
    // Prop 1 - High consensus (8 support, 1 oppose, 1 nuanced)
    { userId: testUser1.id, propositionId: prop1.id, stance: 'SUPPORT' as const },
    { userId: testUser2.id, propositionId: prop1.id, stance: 'SUPPORT' as const },

    // Prop 2 - Moderate consensus (5 support, 4 oppose, 1 nuanced)
    { userId: testUser1.id, propositionId: prop2.id, stance: 'SUPPORT' as const },
    { userId: testUser2.id, propositionId: prop2.id, stance: 'OPPOSE' as const },

    // Prop 3 - Low consensus (3 support, 6 oppose, 1 nuanced)
    {
      userId: testUser1.id,
      propositionId: prop3.id,
      stance: 'OPPOSE' as const,
    },
    {
      userId: testUser2.id,
      propositionId: prop3.id,
      stance: 'NUANCED' as const,
      nuanceExplanation: 'Costs are high but necessary investment',
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

  console.log(`✅ Created ${alignments.length} alignments`);

  // Create CommonGroundAnalysis
  console.log('Creating common ground analysis...');
  const agreementZones = [
    {
      proposition: 'Remote work offers flexibility benefits',
      agreementPercentage: 80,
      supportingEvidence: ['Survey data', 'Employee satisfaction reports'],
      participantCount: 10,
    },
  ];

  const misunderstandings = [
    {
      topic: 'Productivity metrics',
      interpretations: [
        { interpretation: 'Hours logged', participantCount: 5 },
        { interpretation: 'Output quality', participantCount: 5 },
      ],
      clarification: 'Distinguish between time-based and results-based productivity measures',
    },
  ];

  const genuineDisagreements = [
    {
      proposition: 'Optimal work arrangement',
      viewpoints: [
        {
          position: 'Fully remote',
          participantCount: 4,
          reasoning: ['Flexibility', 'Cost savings'],
        },
        {
          position: 'Hybrid model',
          participantCount: 6,
          reasoning: ['Team bonding', 'Work-life separation'],
        },
      ],
      underlyingValues: ['Individual autonomy', 'Team collaboration'],
    },
  ];

  // Check if analysis exists first (no unique constraint)
  const existingAnalysis = await prisma.commonGroundAnalysis.findFirst({
    where: {
      topicId: topic3.id,
      version: 1,
    },
  });

  if (!existingAnalysis) {
    await prisma.commonGroundAnalysis.create({
      data: {
        topicId: topic3.id,
        version: 1,
        agreementZones: agreementZones,
        misunderstandings: misunderstandings,
        genuineDisagreements: genuineDisagreements,
        overallConsensusScore: 0.55,
        participantCountAtGeneration: 10,
        responseCountAtGeneration: 12,
        modelVersion: 'claude-sonnet-3.5',
      },
    });
  }

  console.log(`✅ Created common ground analysis for topic: ${topic3.title}`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
