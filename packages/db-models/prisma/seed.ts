/**
 * Database Seed Script
 * T164-T165: Creates seed data for topics and demo discussions
 */

import { PrismaClient, ActivityLevel } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * T164: Seed topics with realistic activity levels
 */
async function seedTopics() {
  console.log('Seeding topics...');

  const topics = [
    {
      id: crypto.randomUUID(),
      title: 'Climate Change & Environmental Policy',
      description: 'Discussions about climate science, environmental policies, and sustainable practices',
      creatorId: null, // System-created
      activeDiscussionCount: 45,
      participantCount: 230,
      activityLevel: ActivityLevel.HIGH,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['environment', 'science', 'policy'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Economic Policy & Inequality',
      description: 'Exploring economic systems, wealth distribution, and fiscal policy',
      creatorId: null,
      activeDiscussionCount: 38,
      participantCount: 195,
      activityLevel: ActivityLevel.HIGH,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['economics', 'policy', 'society'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Technology & AI Ethics',
      description: 'The impact of technology on society, AI regulation, and digital rights',
      creatorId: null,
      activeDiscussionCount: 52,
      participantCount: 310,
      activityLevel: ActivityLevel.HIGH,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['technology', 'ethics', 'privacy'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Healthcare & Public Health',
      description: 'Healthcare systems, medical policy, and public health initiatives',
      creatorId: null,
      activeDiscussionCount: 28,
      participantCount: 145,
      activityLevel: ActivityLevel.HIGH,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['health', 'policy', 'science'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Education Reform',
      description: 'Discussions about education systems, curriculum, and learning methods',
      creatorId: null,
      activeDiscussionCount: 22,
      participantCount: 110,
      activityLevel: ActivityLevel.HIGH,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['education', 'society', 'policy'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Immigration & Border Policy',
      description: 'Immigration systems, refugee policy, and border security',
      creatorId: null,
      activeDiscussionCount: 15,
      participantCount: 95,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['policy', 'society', 'security'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Criminal Justice Reform',
      description: 'Policing, incarceration, rehabilitation, and justice system improvements',
      creatorId: null,
      activeDiscussionCount: 18,
      participantCount: 88,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['justice', 'policy', 'society'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Foreign Policy & International Relations',
      description: 'Global diplomacy, international conflicts, and trade policy',
      creatorId: null,
      activeDiscussionCount: 12,
      participantCount: 75,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['international', 'policy', 'security'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Housing & Urban Development',
      description: 'Affordable housing, zoning policy, and urban planning',
      creatorId: null,
      activeDiscussionCount: 14,
      participantCount: 65,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['housing', 'economics', 'policy'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Energy & Renewable Resources',
      description: 'Energy policy, renewable energy transition, and grid infrastructure',
      creatorId: null,
      activeDiscussionCount: 19,
      participantCount: 102,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['energy', 'environment', 'technology'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Voting Rights & Electoral Reform',
      description: 'Voting access, electoral systems, and campaign finance',
      creatorId: null,
      activeDiscussionCount: 8,
      participantCount: 52,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['democracy', 'policy', 'rights'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Gun Policy & Second Amendment',
      description: 'Gun regulations, rights, and public safety',
      creatorId: null,
      activeDiscussionCount: 10,
      participantCount: 68,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['rights', 'safety', 'policy'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Social Media & Free Speech',
      description: 'Platform moderation, free expression, and misinformation',
      creatorId: null,
      activeDiscussionCount: 16,
      participantCount: 89,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['technology', 'rights', 'society'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Mental Health & Wellness',
      description: 'Mental health services, stigma reduction, and public awareness',
      creatorId: null,
      activeDiscussionCount: 11,
      participantCount: 71,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['health', 'society', 'policy'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Space Exploration & Science',
      description: 'Space programs, scientific research, and astronomy',
      creatorId: null,
      activeDiscussionCount: 6,
      participantCount: 42,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['science', 'technology', 'exploration'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Privacy & Data Protection',
      description: 'Data privacy laws, surveillance, and digital security',
      creatorId: null,
      activeDiscussionCount: 13,
      participantCount: 78,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: true,
      crossCuttingThemes: ['privacy', 'technology', 'rights'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Food Systems & Agriculture',
      description: 'Sustainable farming, food security, and agricultural policy',
      creatorId: null,
      activeDiscussionCount: 4,
      participantCount: 28,
      activityLevel: ActivityLevel.LOW,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['agriculture', 'environment', 'economics'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Labor Rights & Worker Protections',
      description: 'Unions, workplace safety, and employment law',
      creatorId: null,
      activeDiscussionCount: 7,
      participantCount: 45,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['labor', 'economics', 'rights'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Arts & Cultural Funding',
      description: 'Public funding for arts, cultural preservation, and creative industries',
      creatorId: null,
      activeDiscussionCount: 3,
      participantCount: 19,
      activityLevel: ActivityLevel.LOW,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['arts', 'culture', 'economics'],
    },
    {
      id: crypto.randomUUID(),
      title: 'Infrastructure & Transportation',
      description: 'Public transit, roads, bridges, and infrastructure investment',
      creatorId: null,
      activeDiscussionCount: 9,
      participantCount: 58,
      activityLevel: ActivityLevel.MEDIUM,
      suggestedForNewUsers: false,
      crossCuttingThemes: ['infrastructure', 'policy', 'economics'],
    },
  ];

  // Create topics (skipping if already exists by title)
  for (const topic of topics) {
    await prisma.discussionTopic.upsert({
      where: { title: topic.title },
      update: {},
      create: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        creatorId: await getSystemUserId(), // Create system user if needed
        activeDiscussionCount: topic.activeDiscussionCount,
        participantCount: topic.participantCount,
        activityLevel: topic.activityLevel,
        suggestedForNewUsers: topic.suggestedForNewUsers,
        crossCuttingThemes: topic.crossCuttingThemes,
      },
    });
  }

  console.log(`✓ Seeded ${topics.length} topics`);
}

/**
 * Get or create system user for topic creation
 */
async function getSystemUserId(): Promise<string> {
  const systemEmail = 'system@reasonbridge.org';

  let systemUser = await prisma.user.findUnique({
    where: { email: systemEmail },
  });

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: systemEmail,
        displayName: 'System',
        cognitoSub: 'system-user-000',
        authMethod: 'EMAIL_PASSWORD',
        emailVerified: true,
        accountStatus: 'ACTIVE',
      },
    });
    console.log('✓ Created system user');
  }

  return systemUser.id;
}

/**
 * T165: Seed demo discussions with high common ground scores
 */
async function seedDemoDiscussions() {
  console.log('Seeding demo discussions...');

  // Find HIGH activity topics for demo content
  const topics = await prisma.discussionTopic.findMany({
    where: {
      activityLevel: ActivityLevel.HIGH,
    },
    take: 5,
  });

  if (topics.length === 0) {
    console.warn('⚠ No HIGH activity topics found. Run seedTopics first.');
    return;
  }

  const systemUserId = await getSystemUserId();

  // Note: Full demo discussion seeding would require creating actual discussion content
  // with propositions, responses, and common ground analyses.
  // This is a placeholder that shows the structure.

  console.log(`✓ Demo discussions would use these ${topics.length} topics as basis`);
  console.log('  (Full implementation requires creating propositions, responses, and analyses)');
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    await seedTopics();
    await seedDemoDiscussions();

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
