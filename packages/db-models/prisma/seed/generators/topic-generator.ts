/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic and Discussion Generator
 *
 * Generates topics across all 15 categories with realistic distribution
 * and discussions based on topic type and activity patterns.
 */

import { generateEnhancedTopicId, generateDiscussionId } from '../demo-ids.js';
import { CATEGORY_DEFINITIONS } from '../config/categories.js';
import type { CategoryDefinition } from '../config/categories.js';
import type { ScaleConfig } from '../config/distribution.js';
import type { AIClient } from './ai-client.js';
import type { GeneratedUserPersona } from './user-generator.js';

// =============================================================================
// INTERFACES
// =============================================================================

export type TopicType = 'evergreen' | 'current' | 'emerging';
export type TopicStatus = 'ACTIVE' | 'ARCHIVED' | 'SEEDING';

export interface GeneratedTopic {
  id: string;
  categoryIndex: number;
  topicIndex: number;
  title: string;
  description: string;
  slug: string;
  creatorId: string;
  category: string;
  topicType: TopicType;
  status: TopicStatus;
  crossCuttingThemes: string[];
  createdAtOffset: number;
}

export interface GeneratedDiscussion {
  id: string;
  topicId: string;
  topicIndex: number;
  discussionIndex: number;
  title: string;
  creatorId: string;
  createdAtOffset: number;
}

export interface TopicGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TOPIC_TYPE_DISTRIBUTION: TopicType[] = [
  'evergreen', // 25%
  'current',
  'current', // 50%
  'emerging', // 25%
];

const AGE_RANGES: Record<TopicType, [number, number]> = {
  evergreen: [90, 180], // 90-180 days old
  current: [14, 90], // 14-90 days old
  emerging: [0, 14], // 0-14 days old
};

// Cross-cutting themes that span multiple categories
const CROSS_CUTTING_THEMES = [
  'AI Impact',
  'Privacy Rights',
  'Economic Equality',
  'Global Cooperation',
  'Generational Divide',
  'Urban vs Rural',
  'Trust in Institutions',
  'Digital Transformation',
  'Climate Adaptation',
  'Social Media Influence',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

/**
 * Select a topic type based on index for deterministic distribution
 */
function selectTopicType(index: number): TopicType {
  const typeIndex = index % TOPIC_TYPE_DISTRIBUTION.length;
  return TOPIC_TYPE_DISTRIBUTION[typeIndex] ?? 'current';
}

/**
 * Calculate topic age offset based on type
 */
function calculateAgeOffset(topicType: TopicType, index: number): number {
  const [min, max] = AGE_RANGES[topicType];
  // Use index to create variation within the range
  const range = max - min;
  return min + Math.floor((index % 10) * (range / 10));
}

/**
 * Determine topic status based on type and index
 */
function determineStatus(topicType: TopicType, index: number): TopicStatus {
  switch (topicType) {
    case 'evergreen':
      // 20% of evergreen topics are archived
      return index % 5 === 0 ? 'ARCHIVED' : 'ACTIVE';
    case 'emerging':
      // 30% of emerging topics are still seeding
      return index % 3 === 0 ? 'SEEDING' : 'ACTIVE';
    default:
      return 'ACTIVE';
  }
}

/**
 * Select cross-cutting themes for a topic based on category and index
 */
function selectCrossCuttingThemes(categoryIndex: number, topicIndex: number): string[] {
  const themes: string[] = [];
  const baseIndex = (categoryIndex + topicIndex) % CROSS_CUTTING_THEMES.length;

  // Each topic gets 1-3 cross-cutting themes
  const numThemes = 1 + (topicIndex % 3);
  for (let i = 0; i < numThemes; i++) {
    const themeIndex = (baseIndex + i * 3) % CROSS_CUTTING_THEMES.length;
    const theme = CROSS_CUTTING_THEMES[themeIndex];
    if (theme) {
      themes.push(theme);
    }
  }

  return themes;
}

/**
 * Generate a title from a prompt hint
 */
function generateTitleFromHint(hint: string, category: CategoryDefinition): string {
  // Capitalize first letter and create a discussion-worthy title
  const capitalizedHint = hint.charAt(0).toUpperCase() + hint.slice(1);

  // Add question format for some topics based on hint length
  if (hint.length < 20) {
    return `Should we ${hint}?`;
  }

  return capitalizedHint;
}

/**
 * Generate a default description for a topic
 */
function generateDefaultDescription(
  title: string,
  category: CategoryDefinition,
  topicType: TopicType,
): string {
  const typeDescriptions: Record<TopicType, string> = {
    evergreen:
      'An ongoing discussion that remains relevant across time, exploring fundamental questions and principles.',
    current:
      'A timely discussion addressing recent developments and their implications for our society.',
    emerging:
      'An exploratory discussion about new trends and possibilities that are just beginning to take shape.',
  };

  return `${typeDescriptions[topicType]} This topic falls under ${category.name}. Join the conversation to share perspectives, evaluate evidence, and find common ground.`;
}

/**
 * Find users interested in a specific category
 */
function findInterestedUsers(
  users: GeneratedUserPersona[],
  categoryName: string,
): GeneratedUserPersona[] {
  return users.filter((user) => user.topicInterests.includes(categoryName));
}

/**
 * Select a creator for a topic from interested users
 */
function selectCreator(
  users: GeneratedUserPersona[],
  categoryName: string,
  topicIndex: number,
): GeneratedUserPersona {
  if (users.length === 0) {
    throw new Error('No users available for topic creation');
  }

  const interestedUsers = findInterestedUsers(users, categoryName);

  if (interestedUsers.length === 0) {
    // Fallback to any user if no interested users found
    const fallbackUser = users[topicIndex % users.length];
    if (!fallbackUser) {
      throw new Error('Failed to select fallback user');
    }
    return fallbackUser;
  }

  // Select deterministically based on index
  const selectedUser = interestedUsers[topicIndex % interestedUsers.length];
  if (!selectedUser) {
    throw new Error('Failed to select interested user');
  }
  return selectedUser;
}

// =============================================================================
// MAIN GENERATION FUNCTIONS
// =============================================================================

/**
 * Generate topics across all categories
 */
export async function generateTopics(
  config: ScaleConfig,
  users: GeneratedUserPersona[],
  options: TopicGeneratorOptions = {},
): Promise<GeneratedTopic[]> {
  const topics: GeneratedTopic[] = [];
  let globalTopicIndex = 0;

  for (let catIndex = 0; catIndex < CATEGORY_DEFINITIONS.length; catIndex++) {
    const category = CATEGORY_DEFINITIONS[catIndex];
    if (!category) {
      continue;
    }

    for (let topicInCategory = 0; topicInCategory < config.topicsPerCategory; topicInCategory++) {
      const topicType = selectTopicType(topicInCategory);
      const prompts = category.topicPrompts[topicType];
      const hint = prompts[topicInCategory % prompts.length] ?? prompts[0] ?? 'discussion topic';

      const creator = selectCreator(users, category.name, topicInCategory);
      const title = generateTitleFromHint(hint, category);

      const topic: GeneratedTopic = {
        id: generateEnhancedTopicId(catIndex + 1, topicInCategory + 1),
        categoryIndex: catIndex,
        topicIndex: globalTopicIndex,
        title,
        description: generateDefaultDescription(title, category, topicType),
        slug: generateSlug(title) + `-${globalTopicIndex + 1}`,
        creatorId: creator.id,
        category: category.name,
        topicType,
        status: determineStatus(topicType, topicInCategory),
        crossCuttingThemes: selectCrossCuttingThemes(catIndex, topicInCategory),
        createdAtOffset: calculateAgeOffset(topicType, topicInCategory),
      };

      topics.push(topic);
      globalTopicIndex++;
    }
  }

  // Optionally enrich with AI-generated content
  if (options.aiClient && !options.useMockData) {
    await enrichTopicsWithAI(topics, options.aiClient);
  }

  return topics;
}

/**
 * Generate discussions for topics
 */
export function generateDiscussions(
  topics: GeneratedTopic[],
  users: GeneratedUserPersona[],
  config: ScaleConfig,
): GeneratedDiscussion[] {
  const discussions: GeneratedDiscussion[] = [];

  for (const topic of topics) {
    // Skip SEEDING topics - they don't have discussions yet
    if (topic.status === 'SEEDING') {
      continue;
    }

    // Determine number of discussions based on topic type
    let numDiscussions: number;
    switch (topic.topicType) {
      case 'current':
        numDiscussions = config.discussionsPerTopic.high;
        break;
      case 'evergreen':
        numDiscussions = config.discussionsPerTopic.medium;
        break;
      case 'emerging':
        numDiscussions = config.discussionsPerTopic.low;
        break;
    }

    for (let i = 0; i < numDiscussions; i++) {
      const creator = selectCreator(users, topic.category, topic.topicIndex + i);

      // Discussion titles are variations of the topic
      const discussionTitle = generateDiscussionTitle(topic.title, i);

      // Discussions are created after the topic, with varying delays
      const discussionAgeOffset = Math.max(0, topic.createdAtOffset - (i * 3 + 1));

      const discussion: GeneratedDiscussion = {
        id: generateDiscussionId(topic.topicIndex + 1, i + 1),
        topicId: topic.id,
        topicIndex: topic.topicIndex,
        discussionIndex: i,
        title: discussionTitle,
        creatorId: creator.id,
        createdAtOffset: discussionAgeOffset,
      };

      discussions.push(discussion);
    }
  }

  return discussions;
}

/**
 * Generate a discussion title based on the topic
 */
function generateDiscussionTitle(topicTitle: string, index: number): string {
  const prefixes = [
    'Exploring:',
    'Deep Dive:',
    'Perspectives on',
    'Debating',
    'Understanding',
    'Analysis:',
    'Re:',
    'Thoughts on',
  ];

  const prefix = prefixes[index % prefixes.length];
  const baseTitle = topicTitle.replace(/^Should we /, '').replace(/\?$/, '');

  return `${prefix} ${baseTitle}`;
}

/**
 * Enrich topics with AI-generated descriptions
 */
async function enrichTopicsWithAI(topics: GeneratedTopic[], aiClient: AIClient): Promise<void> {
  console.log('🤖 Enriching topics with AI-generated descriptions...');

  const batchSize = 10;
  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);
    const prompts = batch.map(
      (t) =>
        `Generate a 2-3 sentence description for a discussion topic titled "${t.title}". ` +
        `Category: ${t.category}. Topic type: ${t.topicType} (${
          t.topicType === 'evergreen'
            ? 'timeless, fundamental'
            : t.topicType === 'current'
              ? 'recent, timely'
              : 'new, exploratory'
        }). ` +
        `Cross-cutting themes: ${t.crossCuttingThemes.join(', ')}. ` +
        `Keep it balanced and inviting for diverse perspectives.`,
    );

    const descriptions = await aiClient.generateBatch(prompts);
    batch.forEach((t, j) => {
      const description = descriptions[j];
      if (description) {
        t.description = description;
      }
    });

    console.log(`  Processed ${Math.min(i + batchSize, topics.length)}/${topics.length} topics`);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default generateTopics;
