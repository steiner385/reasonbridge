/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Generator
 *
 * Generates realistic discussion topics using LLM for the seeding framework.
 * Produces diverse topics across 9 categories with deterministic IDs for
 * reproducible demo environments.
 */

import { generateTopicId, DEMO_USER_IDS, DEMO_TAG_IDS } from '../demo-ids.js';
import type { SeedingLLMClient } from './llm-client.js';
import type { GeneratedTopic, TopicStatus, EngagementLevel } from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Topic categories with target counts and associated tags.
 * Total topics: 75 across 9 diverse categories.
 */
export const TOPIC_CATEGORIES = [
  { name: 'Climate & Environment', count: 10, tags: [DEMO_TAG_IDS.ENVIRONMENT] },
  { name: 'Technology & Privacy', count: 10, tags: [DEMO_TAG_IDS.TECHNOLOGY] },
  { name: 'Education & Youth', count: 8, tags: [DEMO_TAG_IDS.EDUCATION] },
  { name: 'Work & Economy', count: 10, tags: [DEMO_TAG_IDS.ECONOMY] },
  { name: 'Healthcare & Policy', count: 8, tags: [DEMO_TAG_IDS.HEALTHCARE] },
  { name: 'Ethics & Society', count: 10, tags: [DEMO_TAG_IDS.ETHICS, DEMO_TAG_IDS.SOCIETY] },
  { name: 'Government & Civic', count: 8, tags: [DEMO_TAG_IDS.GOVERNMENT] },
  { name: 'Science & Research', count: 6, tags: [DEMO_TAG_IDS.SCIENCE] },
  { name: 'Business & Innovation', count: 5, tags: [DEMO_TAG_IDS.BUSINESS] },
] as const;

/**
 * Status distribution for generated topics.
 * 85% ACTIVE, 10% SEEDING, 5% ARCHIVED
 */
const STATUS_DISTRIBUTION: { status: TopicStatus; threshold: number }[] = [
  { status: 'ACTIVE', threshold: 0.85 },
  { status: 'SEEDING', threshold: 0.95 },
  { status: 'ARCHIVED', threshold: 1.0 },
];

/**
 * Demo user IDs to use as topic creators.
 */
const CREATOR_IDS = [
  DEMO_USER_IDS.ADMIN_ADAMS,
  DEMO_USER_IDS.MOD_MARTINEZ,
  DEMO_USER_IDS.ALICE_ANDERSON,
  DEMO_USER_IDS.BOB_BUILDER,
  DEMO_USER_IDS.NEW_USER,
];

// =============================================================================
// TYPES
// =============================================================================

interface LLMTopicResponse {
  title: string;
  description: string;
  crossCuttingThemes: string[];
}

// =============================================================================
// GENERATOR CLASS
// =============================================================================

/**
 * Generates discussion topics using LLM for realistic content.
 */
export class TopicGenerator {
  private client: SeedingLLMClient;

  constructor(client: SeedingLLMClient) {
    this.client = client;
  }

  /**
   * Generate topics for a specific category.
   *
   * @param category - Category name
   * @param count - Number of topics to generate
   * @param startingTopicNumber - Starting number for deterministic ID generation
   * @returns Array of generated topics
   */
  async generateForCategory(
    category: string,
    count: number,
    startingTopicNumber: number,
  ): Promise<GeneratedTopic[]> {
    const categoryConfig = TOPIC_CATEGORIES.find((c) => c.name === category);
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${category}`);
    }
    const tagIds = categoryConfig.tags;

    const prompt = this.buildPrompt(category, count);
    const schema = this.buildSchema();

    const llmTopics = await this.client.generateJSON<LLMTopicResponse[]>(prompt, schema);

    return llmTopics.map((llmTopic, index) => {
      const topicNumber = startingTopicNumber + index;
      return this.transformToGeneratedTopic(llmTopic, topicNumber, category, tagIds);
    });
  }

  /**
   * Generate topics for all categories.
   *
   * @param startingTopicNumber - Starting number for deterministic ID generation
   * @returns Array of all generated topics
   */
  async generateAll(startingTopicNumber: number): Promise<GeneratedTopic[]> {
    const allTopics: GeneratedTopic[] = [];
    let currentTopicNumber = startingTopicNumber;

    for (const category of TOPIC_CATEGORIES) {
      const topics = await this.generateForCategory(
        category.name,
        category.count,
        currentTopicNumber,
      );
      allTopics.push(...topics);
      currentTopicNumber += topics.length;
    }

    return allTopics;
  }

  /**
   * Build the prompt for LLM topic generation.
   */
  private buildPrompt(category: string, count: number): string {
    return `Generate ${count} diverse discussion topics for the category "${category}".

Each topic should:
1. Be framed as a debatable "Should..." question
2. Have a description (2-3 sentences) that outlines key perspectives
3. Include 2-3 cross-cutting themes that connect to other categories
4. Be suitable for constructive civil discourse
5. Avoid extreme positions; topics should have legitimate arguments on multiple sides

Examples of good topics:
- "Should cities implement congestion pricing?"
- "Should AI-generated content require disclosure?"
- "Should standardized testing be eliminated?"

Generate ${count} unique topics for the "${category}" category.`;
  }

  /**
   * Build the expected JSON schema for LLM response.
   */
  private buildSchema(): Record<string, unknown> {
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The topic title as a "Should..." question',
          },
          description: {
            type: 'string',
            description: 'A 2-3 sentence description outlining key perspectives',
          },
          crossCuttingThemes: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of 2-3 themes that connect to other categories',
          },
        },
        required: ['title', 'description', 'crossCuttingThemes'],
      },
    };
  }

  /**
   * Transform an LLM response topic into a GeneratedTopic.
   */
  private transformToGeneratedTopic(
    llmTopic: LLMTopicResponse,
    topicNumber: number,
    category: string,
    tagIds: readonly string[],
  ): GeneratedTopic {
    const topicIndex = topicNumber;

    return {
      id: generateTopicId(topicNumber),
      title: llmTopic.title,
      description: llmTopic.description,
      slug: this.generateSlug(llmTopic.title),
      creatorId: this.selectCreator(topicIndex),
      category,
      status: this.selectStatus(topicIndex),
      tagIds: [...tagIds],
      crossCuttingThemes: llmTopic.crossCuttingThemes,
      expectedEngagement: this.selectEngagement(topicIndex),
      topicIndex,
      createdAtOffset: this.calculateCreatedAtOffset(topicIndex),
    };
  }

  /**
   * Generate a URL-friendly slug from the title.
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Select a creator ID based on topic index.
   */
  private selectCreator(topicIndex: number): string {
    return CREATOR_IDS[topicIndex % CREATOR_IDS.length]!;
  }

  /**
   * Select status based on distribution (85% ACTIVE, 10% SEEDING, 5% ARCHIVED).
   */
  private selectStatus(topicIndex: number): TopicStatus {
    // Use topic index to create pseudo-random distribution
    const pseudoRandom = ((topicIndex * 7919) % 100) / 100;

    for (const { status, threshold } of STATUS_DISTRIBUTION) {
      if (pseudoRandom < threshold) {
        return status;
      }
    }

    return 'ACTIVE';
  }

  /**
   * Select expected engagement level based on topic index.
   */
  private selectEngagement(topicIndex: number): EngagementLevel {
    const levels: EngagementLevel[] = ['low', 'medium', 'high', 'very_high'];
    // Weight towards medium and high engagement
    const weights = [0.15, 0.35, 0.35, 0.15];
    const pseudoRandom = ((topicIndex * 13) % 100) / 100;

    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i]!;
      if (pseudoRandom < cumulative) {
        return levels[i]!;
      }
    }

    return 'medium';
  }

  /**
   * Calculate created at offset (days from base timestamp).
   * Earlier topics have larger offsets (created longer ago).
   */
  private calculateCreatedAtOffset(topicIndex: number): number {
    // Topics are created between 1 and 90 days ago
    return 90 - ((topicIndex * 3) % 89);
  }
}

export default TopicGenerator;
