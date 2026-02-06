/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Topic Definitions
 *
 * Defines 10 diverse discussion topics (FR-002) covering:
 * - Climate & Environment
 * - Technology & Privacy
 * - Education & Youth
 * - Work & Economy
 * - Healthcare & Policy
 * - Ethics & Society
 * - Government & Civic
 * - Business & Innovation
 * - Environment & Lifestyle
 * - Science & Research
 */

import { DEMO_TOPIC_IDS, DEMO_TAG_IDS, DEMO_USER_IDS } from './demo-ids';

// Topic status type matching Prisma schema
type TopicStatus = 'SEEDING' | 'ACTIVE' | 'ARCHIVED';

export interface DemoTopic {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  status: TopicStatus;
  crossCuttingThemes: string[];
  tagIds: string[];
  category: string;
  expectedEngagement: 'low' | 'medium' | 'high' | 'very_high';
}

export const DEMO_TOPICS: DemoTopic[] = [
  {
    id: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    title: 'Should cities implement congestion pricing?',
    description:
      'Explore the pros and cons of charging drivers to enter busy urban areas. Consider environmental impact, economic effects on low-income workers, public transit alternatives, and lessons from cities like London and Stockholm.',
    creatorId: DEMO_USER_IDS.ALICE_ANDERSON,
    status: 'ACTIVE',
    crossCuttingThemes: ['urban planning', 'transportation', 'economics'],
    tagIds: [DEMO_TAG_IDS.ENVIRONMENT, DEMO_TAG_IDS.ECONOMY],
    category: 'Climate & Environment',
    expectedEngagement: 'high',
  },
  {
    id: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    title: 'Should AI-generated content require disclosure?',
    description:
      'Debate whether content created by artificial intelligence (text, images, videos) should be legally required to carry disclosure labels. Consider implications for journalism, art, marketing, and democratic discourse.',
    creatorId: DEMO_USER_IDS.BOB_BUILDER,
    status: 'ACTIVE',
    crossCuttingThemes: ['artificial intelligence', 'transparency', 'media'],
    tagIds: [DEMO_TAG_IDS.TECHNOLOGY, DEMO_TAG_IDS.ETHICS],
    category: 'Technology & Privacy',
    expectedEngagement: 'very_high',
  },
  {
    id: DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    title: 'Should standardized testing be eliminated?',
    description:
      'Discuss the role of standardized tests in education. Are they fair assessments or do they perpetuate inequality? What alternatives exist for measuring student achievement and school effectiveness?',
    creatorId: DEMO_USER_IDS.MOD_MARTINEZ,
    status: 'ACTIVE',
    crossCuttingThemes: ['education', 'equity', 'assessment'],
    tagIds: [DEMO_TAG_IDS.EDUCATION, DEMO_TAG_IDS.SOCIETY],
    category: 'Education & Youth',
    expectedEngagement: 'medium',
  },
  {
    id: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    title: 'Should companies mandate return-to-office policies?',
    description:
      'Examine the debate over remote work vs. office work. Consider productivity, collaboration, work-life balance, real estate economics, and the varying needs of different industries and roles.',
    creatorId: DEMO_USER_IDS.ALICE_ANDERSON,
    status: 'ACTIVE',
    crossCuttingThemes: ['work', 'productivity', 'technology'],
    tagIds: [DEMO_TAG_IDS.ECONOMY, DEMO_TAG_IDS.BUSINESS],
    category: 'Work & Economy',
    expectedEngagement: 'very_high',
  },
  {
    id: DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    title: 'Should preventive care be fully covered by insurance?',
    description:
      'Analyze whether health insurance should cover 100% of preventive care costs. Consider long-term healthcare savings, equity of access, insurance economics, and public health outcomes.',
    creatorId: DEMO_USER_IDS.ADMIN_ADAMS,
    status: 'ACTIVE',
    crossCuttingThemes: ['healthcare', 'economics', 'public policy'],
    tagIds: [DEMO_TAG_IDS.HEALTHCARE, DEMO_TAG_IDS.ECONOMY],
    category: 'Healthcare & Policy',
    expectedEngagement: 'high',
  },
  {
    id: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    title: 'Should social media have age verification requirements?',
    description:
      'Debate mandatory age verification for social media platforms. Consider child safety, privacy concerns, implementation challenges, parental responsibility, and potential impacts on free expression.',
    creatorId: DEMO_USER_IDS.MOD_MARTINEZ,
    status: 'ACTIVE',
    crossCuttingThemes: ['technology', 'children', 'privacy'],
    tagIds: [DEMO_TAG_IDS.ETHICS, DEMO_TAG_IDS.TECHNOLOGY],
    category: 'Ethics & Society',
    expectedEngagement: 'high',
  },
  {
    id: DEMO_TOPIC_IDS.MANDATORY_VOTING,
    title: 'Should voting be mandatory in democracies?',
    description:
      'Explore arguments for and against compulsory voting. Consider civic duty, representation, implementation challenges, and examples from countries like Australia and Belgium.',
    creatorId: DEMO_USER_IDS.ADMIN_ADAMS,
    status: 'ACTIVE',
    crossCuttingThemes: ['democracy', 'civic engagement', 'rights'],
    tagIds: [DEMO_TAG_IDS.GOVERNMENT, DEMO_TAG_IDS.SOCIETY],
    category: 'Government & Civic',
    expectedEngagement: 'medium',
  },
  {
    id: DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    title: 'Should AI use in products be disclosed to consumers?',
    description:
      'Discuss whether companies should be required to disclose when their products or services use AI. Consider consumer rights, competitive concerns, and what constitutes meaningful disclosure.',
    creatorId: DEMO_USER_IDS.BOB_BUILDER,
    status: 'ACTIVE',
    crossCuttingThemes: ['AI', 'consumer protection', 'business'],
    tagIds: [DEMO_TAG_IDS.BUSINESS, DEMO_TAG_IDS.TECHNOLOGY],
    category: 'Business & Innovation',
    expectedEngagement: 'high',
  },
  {
    id: DEMO_TOPIC_IDS.PLASTIC_BAN,
    title: 'Should single-use plastics be banned nationwide?',
    description:
      'Analyze the case for and against a comprehensive ban on single-use plastics. Consider environmental benefits, economic impacts, alternatives availability, and lessons from regional bans.',
    creatorId: DEMO_USER_IDS.ALICE_ANDERSON,
    status: 'ARCHIVED',
    crossCuttingThemes: ['environment', 'policy', 'industry'],
    tagIds: [DEMO_TAG_IDS.ENVIRONMENT, DEMO_TAG_IDS.ECONOMY],
    category: 'Environment & Lifestyle',
    expectedEngagement: 'medium',
  },
  {
    id: DEMO_TOPIC_IDS.GOF_OVERSIGHT,
    title: 'Should gain-of-function research have international oversight?',
    description:
      'Debate the governance of gain-of-function research that enhances pathogen transmissibility or virulence. Balance scientific advancement against biosecurity risks and the need for international coordination.',
    creatorId: DEMO_USER_IDS.ADMIN_ADAMS,
    status: 'ACTIVE',
    crossCuttingThemes: ['science', 'biosecurity', 'international relations'],
    tagIds: [DEMO_TAG_IDS.SCIENCE, DEMO_TAG_IDS.GOVERNMENT],
    category: 'Science & Research',
    expectedEngagement: 'medium',
  },
];

/**
 * Get a topic by its ID
 */
export function getTopicById(id: string): DemoTopic | undefined {
  return DEMO_TOPICS.find((t) => t.id === id);
}

/**
 * Get topics by category
 */
export function getTopicsByCategory(category: string): DemoTopic[] {
  return DEMO_TOPICS.filter((t) => t.category === category);
}

/**
 * Get topics by status
 */
export function getTopicsByStatus(status: TopicStatus): DemoTopic[] {
  return DEMO_TOPICS.filter((t) => t.status === status);
}

export default DEMO_TOPICS;
