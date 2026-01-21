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
