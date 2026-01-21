import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding E2E database...');

  // Create test users
  console.log('Creating test users...');
  const testUser1 = await prisma.user.upsert({
    where: { cognito_sub: 'test-user-1' },
    update: {},
    create: {
      cognito_sub: 'test-user-1',
      display_name: 'Test User 1',
      trust_scores: { ability: 75, benevolence: 80, integrity: 85 },
      verification_level: 'BASIC',
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { cognito_sub: 'test-user-2' },
    update: {},
    create: {
      cognito_sub: 'test-user-2',
      display_name: 'Verified User',
      trust_scores: { ability: 90, benevolence: 92, integrity: 88 },
      verification_level: 'VERIFIED_HUMAN',
    },
  });

  console.log(`✅ Created users: ${testUser1.display_name}, ${testUser2.display_name}`);

  // Create test topics
  console.log('Creating test topics...');
  const topic1 = await prisma.discussionTopic.upsert({
    where: { id: 'test-topic-1' },
    update: {},
    create: {
      id: 'test-topic-1',
      title: 'Should renewable energy be prioritized over fossil fuels?',
      description:
        'Discuss the transition to renewable energy sources and their impact on the environment and economy.',
      created_by_id: testUser1.id,
    },
  });

  const topic2 = await prisma.discussionTopic.upsert({
    where: { id: 'test-topic-2' },
    update: {},
    create: {
      id: 'test-topic-2',
      title: 'Universal Basic Income: Viable or Unsustainable?',
      description:
        'Explore the feasibility and potential impact of implementing universal basic income policies.',
      created_by_id: testUser2.id,
    },
  });

  const topic3 = await prisma.discussionTopic.upsert({
    where: { id: 'test-topic-3' },
    update: {},
    create: {
      id: 'test-topic-3',
      title: 'Remote Work: The Future of Employment?',
      description:
        'Debate the long-term effects of remote work on productivity, work-life balance, and urban development.',
      created_by_id: testUser1.id,
    },
  });

  console.log(`✅ Created topics: "${topic1.title}", "${topic2.title}", "${topic3.title}"`);

  // Create some test responses
  console.log('Creating test responses...');
  const response1 = await prisma.response.upsert({
    where: { id: 'test-response-1' },
    update: {},
    create: {
      id: 'test-response-1',
      topic_id: topic1.id,
      user_id: testUser2.id,
      content:
        'Renewable energy is crucial for reducing carbon emissions and combating climate change. The initial investment costs are offset by long-term savings and environmental benefits.',
      metadata: { is_ai_assisted: false, cited_sources: [] },
    },
  });

  const response2 = await prisma.response.upsert({
    where: { id: 'test-response-2' },
    update: {},
    create: {
      id: 'test-response-2',
      topic_id: topic1.id,
      user_id: testUser1.id,
      parent_id: response1.id,
      content:
        'While I agree on the environmental benefits, we need to consider the economic transition costs and job displacement in fossil fuel industries. A gradual transition with retraining programs would be more sustainable.',
      metadata: { is_ai_assisted: false, cited_sources: [] },
    },
  });

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
