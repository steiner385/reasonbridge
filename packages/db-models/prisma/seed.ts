import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
      topicId: topic1.id,
      authorId: testUser2.id,
      content: { startsWith: 'Renewable energy is crucial' },
    },
  });
  const response1 =
    existingResponse1 ||
    (await prisma.response.create({
      data: {
        topicId: topic1.id,
        authorId: testUser2.id,
        content:
          'Renewable energy is crucial for reducing carbon emissions and combating climate change. The initial investment costs are offset by long-term savings and environmental benefits.',
        citedSources: [],
      },
    }));

  const existingResponse2 = await prisma.response.findFirst({
    where: {
      topicId: topic1.id,
      authorId: testUser1.id,
      parentId: response1.id,
    },
  });
  const response2 =
    existingResponse2 ||
    (await prisma.response.create({
      data: {
        topicId: topic1.id,
        authorId: testUser1.id,
        parentId: response1.id,
        content:
          'While I agree on the environmental benefits, we need to consider the economic transition costs and job displacement in fossil fuel industries. A gradual transition with retraining programs would be more sustainable.',
        citedSources: [],
      },
    }));

  console.log(`✅ Created ${2} test responses`);

  // Create propositions for renewable energy topic
  console.log('Creating test propositions...');

  // Find or create propositions using findFirst + create pattern (no unique constraint exists)
  let prop1 = await prisma.proposition.findFirst({
    where: {
      topicId: topic1.id,
      statement:
        'Climate change poses an existential threat requiring immediate renewable energy transition',
    },
  });
  if (!prop1) {
    prop1 = await prisma.proposition.create({
      data: {
        topicId: topic1.id,
        statement:
          'Climate change poses an existential threat requiring immediate renewable energy transition',
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
      topicId: topic1.id,
      statement:
        'Renewable energy technologies can completely replace fossil fuels within 20 years',
    },
  });
  if (!prop2) {
    prop2 = await prisma.proposition.create({
      data: {
        topicId: topic1.id,
        statement:
          'Renewable energy technologies can completely replace fossil fuels within 20 years',
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
      topicId: topic1.id,
      statement: 'Economic costs of renewable energy transition outweigh environmental benefits',
    },
  });
  if (!prop3) {
    prop3 = await prisma.proposition.create({
      data: {
        topicId: topic1.id,
        statement: 'Economic costs of renewable energy transition outweigh environmental benefits',
        source: 'AI_IDENTIFIED',
        supportCount: 3,
        opposeCount: 6,
        nuancedCount: 1,
        consensusScore: 0.3,
        status: 'ACTIVE',
      },
    });
  }

  console.log(`✅ Created propositions for topic: ${topic1.title}`);

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
      proposition: 'Climate change requires action',
      agreementPercentage: 80,
      supportingEvidence: ['Scientific consensus', 'Observable impacts'],
      participantCount: 10,
    },
  ];

  const misunderstandings = [
    {
      topic: 'Renewable energy costs',
      interpretations: [
        { interpretation: 'Initial capital costs', participantCount: 5 },
        { interpretation: 'Long-term operating costs', participantCount: 5 },
      ],
      clarification: 'Distinguish between upfront investment and lifetime expenses',
    },
  ];

  const genuineDisagreements = [
    {
      proposition: 'Economic transition timeline',
      viewpoints: [
        {
          position: 'Immediate transition',
          participantCount: 4,
          reasoning: ['Climate urgency', 'Tech readiness'],
        },
        {
          position: 'Gradual transition',
          participantCount: 6,
          reasoning: ['Economic stability', 'Job retraining'],
        },
      ],
      underlyingValues: ['Environmental protection', 'Economic security'],
    },
  ];

  // Check if analysis exists first (no unique constraint)
  const existingAnalysis = await prisma.commonGroundAnalysis.findFirst({
    where: {
      topicId: topic1.id,
      version: 1,
    },
  });

  if (!existingAnalysis) {
    await prisma.commonGroundAnalysis.create({
      data: {
        topicId: topic1.id,
        version: 1,
        agreementZones: JSON.stringify(agreementZones),
        misunderstandings: JSON.stringify(misunderstandings),
        genuineDisagreements: JSON.stringify(genuineDisagreements),
        overallConsensusScore: 0.55,
        participantCountAtGeneration: 10,
        responseCountAtGeneration: 12,
        modelVersion: 'claude-sonnet-3.5',
      },
    });
  }

  console.log(`✅ Created common ground analysis for topic: ${topic1.title}`);

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
