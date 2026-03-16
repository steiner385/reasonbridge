/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response Generator
 *
 * Generates realistic discussion responses using LLM for the seeding framework.
 * Creates threaded conversations with diverse viewpoints from demo personas.
 */

import { generateResponseId, DEMO_USER_IDS } from '../demo-ids.js';
import type { SeedingLLMClient } from './llm-client.js';
import type { GeneratedTopic, GeneratedResponse, ViewpointType, CitedSource } from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Demo user IDs for response authors.
 * Excludes ADMIN_ADAMS who creates topics but typically doesn't participate.
 */
const AUTHOR_IDS = [
  DEMO_USER_IDS.ALICE_ANDERSON,
  DEMO_USER_IDS.BOB_BUILDER,
  DEMO_USER_IDS.MOD_MARTINEZ,
  DEMO_USER_IDS.NEW_USER,
] as const;

/**
 * Author persona descriptions for LLM context.
 * Helps generate responses that match each user's character.
 */
const AUTHOR_PERSONAS = [
  {
    index: 0,
    name: 'Alice Anderson',
    description: 'Progressive power user, highly engaged, favors evidence-based arguments',
  },
  {
    index: 1,
    name: 'Bob Builder',
    description: 'Regular user with balanced views, moderate engagement, practical perspective',
  },
  {
    index: 2,
    name: 'Mod Martinez',
    description: 'Moderator, focuses on fair discussion, often provides nuanced perspectives',
  },
  {
    index: 3,
    name: 'New User',
    description: 'Fresh user, learning platform, asks genuine questions',
  },
] as const;

/**
 * Response structure for generating threaded conversations.
 * 6 responses per topic: 3 root, 2 direct replies, 1 nested reply.
 */
const RESPONSE_STRUCTURE = [
  { parentIndex: null, viewpointHint: 'support' as ViewpointType },
  { parentIndex: null, viewpointHint: 'oppose' as ViewpointType },
  { parentIndex: null, viewpointHint: 'nuanced' as ViewpointType },
  { parentIndex: 0, viewpointHint: 'oppose' as ViewpointType }, // Reply to first root
  { parentIndex: 1, viewpointHint: 'nuanced' as ViewpointType }, // Reply to second root
  { parentIndex: 3, viewpointHint: 'support' as ViewpointType }, // Nested reply
] as const;

// =============================================================================
// TYPES
// =============================================================================

interface LLMResponseItem {
  authorIndex: number;
  parentIndex: number | null;
  content: string;
  viewpoint: ViewpointType;
  citedSources: CitedSource[];
}

// =============================================================================
// GENERATOR CLASS
// =============================================================================

/**
 * Generates discussion responses using LLM for realistic content.
 */
export class ResponseGenerator {
  private client: SeedingLLMClient;

  constructor(client: SeedingLLMClient) {
    this.client = client;
  }

  /**
   * Generate responses for a specific topic.
   *
   * @param topic - The topic to generate responses for
   * @param topicNumber - Topic number for deterministic ID generation
   * @returns Array of generated responses with threading relationships
   */
  async generateForTopic(topic: GeneratedTopic, topicNumber: number): Promise<GeneratedResponse[]> {
    const prompt = this.buildPrompt(topic);
    const schema = this.buildSchema();

    const llmResponses = await this.client.generateJSON<LLMResponseItem[]>(prompt, schema);

    return this.transformResponses(llmResponses, topic, topicNumber);
  }

  /**
   * Generate responses for all provided topics.
   *
   * @param topics - Array of topics to generate responses for
   * @returns Array of all generated responses across all topics
   */
  async generateForAllTopics(topics: GeneratedTopic[]): Promise<GeneratedResponse[]> {
    const allResponses: GeneratedResponse[] = [];

    for (const topic of topics) {
      const responses = await this.generateForTopic(topic, topic.topicIndex);
      allResponses.push(...responses);
    }

    return allResponses;
  }

  /**
   * Build the prompt for LLM response generation.
   */
  private buildPrompt(topic: GeneratedTopic): string {
    const personaDescriptions = AUTHOR_PERSONAS.map(
      (p) => `  ${p.index}: ${p.name} - ${p.description}`,
    ).join('\n');

    const structureDescription = RESPONSE_STRUCTURE.map((s, i) => {
      const parentDesc = s.parentIndex === null ? 'root' : `reply to response ${s.parentIndex}`;
      return `  ${i}: ${parentDesc} (suggested viewpoint: ${s.viewpointHint})`;
    }).join('\n');

    return `Generate 6 realistic discussion responses for this topic:

Topic: "${topic.title}"
Description: ${topic.description}
Category: ${topic.category}

Participant Personas (use authorIndex to reference):
${personaDescriptions}

Response Structure (parentIndex references):
${structureDescription}

Requirements:
1. Each response should be 1-3 sentences, conversational but substantive
2. Viewpoints should be: 'support', 'oppose', or 'nuanced'
3. Responses should reference the topic and engage with parent responses when replying
4. Include citedSources array (can be empty or contain 1-2 relevant sources)
5. Author selection should vary - don't use the same author for consecutive responses
6. Replies should directly address points from parent responses

Generate exactly 6 responses following the structure above.`;
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
          authorIndex: {
            type: 'number',
            description: 'Index of the author (0-3) from the persona list',
          },
          parentIndex: {
            type: ['number', 'null'],
            description: 'Index of the parent response (null for root responses)',
          },
          content: {
            type: 'string',
            description: 'The response content (1-3 sentences)',
          },
          viewpoint: {
            type: 'string',
            enum: ['support', 'oppose', 'nuanced'],
            description: 'The viewpoint expressed in this response',
          },
          citedSources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                author: { type: 'string' },
              },
              required: ['url', 'title'],
            },
            description: 'Optional cited sources (0-2 items)',
          },
        },
        required: ['authorIndex', 'parentIndex', 'content', 'viewpoint', 'citedSources'],
      },
    };
  }

  /**
   * Transform LLM responses into GeneratedResponse objects.
   */
  private transformResponses(
    llmResponses: LLMResponseItem[],
    topic: GeneratedTopic,
    topicNumber: number,
  ): GeneratedResponse[] {
    // First pass: create response IDs
    const responseIds = llmResponses.map((_, index) => generateResponseId(topicNumber, index + 1));

    // Second pass: transform with proper parent references
    return llmResponses.map((llmResponse, index) => {
      const parentId =
        llmResponse.parentIndex !== null && llmResponse.parentIndex < responseIds.length
          ? responseIds[llmResponse.parentIndex]!
          : null;

      // Map author index to demo user ID with bounds checking
      const authorIndex = Math.max(0, Math.min(llmResponse.authorIndex, AUTHOR_IDS.length - 1));
      const authorId = AUTHOR_IDS[authorIndex]!;

      return {
        id: responseIds[index]!,
        topicId: topic.id,
        authorId,
        parentId,
        content: llmResponse.content,
        viewpoint: llmResponse.viewpoint,
        citedSources: llmResponse.citedSources || [],
      };
    });
  }
}

export default ResponseGenerator;
