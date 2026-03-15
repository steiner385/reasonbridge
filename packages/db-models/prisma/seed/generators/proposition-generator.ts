/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Proposition Generator
 *
 * Generates propositions (key claims) from topic responses using LLM for the seeding framework.
 * Extracts main arguments and calculates consensus scores based on viewpoint distribution.
 */

import { generatePropositionId } from '../demo-ids.js';
import type { SeedingLLMClient } from './llm-client.js';
import type {
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  PropositionSource,
  PropositionStatus,
  ViewpointType,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Number of propositions to extract per topic */
const PROPOSITIONS_PER_TOPIC = 4;

// =============================================================================
// TYPES
// =============================================================================

interface LLMPropositionItem {
  statement: string;
  source: PropositionSource;
}

interface ViewpointCounts {
  support: number;
  oppose: number;
  nuanced: number;
}

// =============================================================================
// GENERATOR CLASS
// =============================================================================

/**
 * Generates propositions using LLM for realistic content extraction.
 */
export class PropositionGenerator {
  private client: SeedingLLMClient;

  constructor(client: SeedingLLMClient) {
    this.client = client;
  }

  /**
   * Generate propositions for a specific topic based on its responses.
   *
   * @param topic - The topic to generate propositions for
   * @param responses - Responses for this topic to extract propositions from
   * @param topicNumber - Topic number for deterministic ID generation
   * @returns Array of generated propositions
   */
  async generateForTopic(
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    topicNumber: number,
  ): Promise<GeneratedProposition[]> {
    // Return empty array if no responses for this topic
    if (responses.length === 0) {
      return [];
    }

    const prompt = this.buildPrompt(topic, responses);
    const schema = this.buildSchema();

    const llmPropositions = await this.client.generateJSON<LLMPropositionItem[]>(prompt, schema);

    return this.transformPropositions(llmPropositions, topic, responses, topicNumber);
  }

  /**
   * Generate propositions for all provided topics.
   *
   * @param topics - Array of topics to generate propositions for
   * @param responses - Array of all responses across all topics
   * @returns Array of all generated propositions across all topics
   */
  async generateForAllTopics(
    topics: GeneratedTopic[],
    responses: GeneratedResponse[],
  ): Promise<GeneratedProposition[]> {
    const allPropositions: GeneratedProposition[] = [];

    // Group responses by topic
    const responsesByTopic = new Map<string, GeneratedResponse[]>();
    for (const response of responses) {
      const existing = responsesByTopic.get(response.topicId) || [];
      existing.push(response);
      responsesByTopic.set(response.topicId, existing);
    }

    for (const topic of topics) {
      const topicResponses = responsesByTopic.get(topic.id) || [];
      const propositions = await this.generateForTopic(topic, topicResponses, topic.topicIndex);
      allPropositions.push(...propositions);
    }

    return allPropositions;
  }

  /**
   * Build the prompt for LLM proposition extraction.
   */
  private buildPrompt(topic: GeneratedTopic, responses: GeneratedResponse[]): string {
    const responseText = responses
      .map((r, i) => `${i + 1}. [${r.viewpoint.toUpperCase()}] "${r.content}"`)
      .join('\n');

    return `Extract ${PROPOSITIONS_PER_TOPIC} key propositions from the following discussion:

Topic: "${topic.title}"
Description: ${topic.description}
Category: ${topic.category}

Discussion Responses:
${responseText}

Requirements:
1. Extract the main claims/arguments being debated
2. Each proposition should be a clear, standalone statement
3. Propositions should capture the key points of disagreement or agreement
4. For source:
   - Use 'AI_IDENTIFIED' if the proposition synthesizes multiple responses
   - Use 'USER_CREATED' if it directly reflects a specific user argument
5. Aim for a mix of both source types
6. Keep statements concise (1-2 sentences max)

Generate exactly ${PROPOSITIONS_PER_TOPIC} propositions.`;
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
          statement: {
            type: 'string',
            description: 'The proposition statement (1-2 sentences)',
          },
          source: {
            type: 'string',
            enum: ['AI_IDENTIFIED', 'USER_CREATED'],
            description: 'Whether AI synthesized this or it came from a user',
          },
        },
        required: ['statement', 'source'],
      },
    };
  }

  /**
   * Transform LLM propositions into GeneratedProposition objects.
   */
  private transformPropositions(
    llmPropositions: LLMPropositionItem[],
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    topicNumber: number,
  ): GeneratedProposition[] {
    // Calculate viewpoint distribution from responses
    const viewpointCounts = this.countViewpoints(responses);

    return llmPropositions.map((llmProp, index) => {
      // Calculate simulated support/oppose/nuanced counts
      const counts = this.calculateCounts(viewpointCounts, responses.length, index);

      // Calculate consensus score
      const consensusScore = this.calculateConsensusScore(counts);

      return {
        id: generatePropositionId(topicNumber, index + 1),
        topicId: topic.id,
        statement: llmProp.statement,
        source: llmProp.source,
        supportCount: counts.support,
        opposeCount: counts.oppose,
        nuancedCount: counts.nuanced,
        consensusScore,
        status: 'ACTIVE' as PropositionStatus,
      };
    });
  }

  /**
   * Count viewpoints in responses.
   */
  private countViewpoints(responses: GeneratedResponse[]): ViewpointCounts {
    return {
      support: responses.filter((r) => r.viewpoint === 'support').length,
      oppose: responses.filter((r) => r.viewpoint === 'oppose').length,
      nuanced: responses.filter((r) => r.viewpoint === 'nuanced').length,
    };
  }

  /**
   * Calculate simulated support/oppose/nuanced counts for a proposition.
   * Uses the response viewpoint distribution with some variation per proposition.
   */
  private calculateCounts(
    viewpointCounts: ViewpointCounts,
    totalResponses: number,
    propositionIndex: number,
  ): ViewpointCounts {
    // Base the counts on actual viewpoint distribution
    // Add some deterministic variation per proposition
    const variation = propositionIndex % 3;

    // Scale up counts to simulate more engagement
    const multiplier = Math.max(2, Math.ceil(totalResponses / 2));

    // Add variation to each count
    const support = Math.max(1, viewpointCounts.support * multiplier + (variation === 0 ? 2 : 0));
    const oppose = Math.max(1, viewpointCounts.oppose * multiplier + (variation === 1 ? 2 : 0));
    const nuanced = Math.max(1, viewpointCounts.nuanced * multiplier + (variation === 2 ? 1 : 0));

    return { support, oppose, nuanced };
  }

  /**
   * Calculate consensus score based on viewpoint distribution.
   *
   * Score is higher when:
   * - There's more agreement (one viewpoint dominates)
   * - There are more nuanced responses (indicates thoughtful discussion)
   *
   * @returns Score between 0 and 1
   */
  private calculateConsensusScore(counts: ViewpointCounts): number {
    const total = counts.support + counts.oppose + counts.nuanced;
    if (total === 0) return 0;

    // Calculate how balanced the support/oppose split is
    const supportRatio = counts.support / total;
    const opposeRatio = counts.oppose / total;
    const nuancedRatio = counts.nuanced / total;

    // Agreement component: higher when one side dominates
    const dominance = Math.abs(supportRatio - opposeRatio);

    // Nuance component: higher when more nuanced responses
    const nuanceBonus = nuancedRatio * 0.3;

    // Combine: base consensus + dominance bonus + nuance bonus
    // Clamp between 0.2 and 0.9 for realistic range
    const rawScore = 0.3 + dominance * 0.4 + nuanceBonus;
    const clampedScore = Math.max(0.2, Math.min(0.9, rawScore));

    // Round to 2 decimal places
    return Math.round(clampedScore * 100) / 100;
  }
}

export default PropositionGenerator;
