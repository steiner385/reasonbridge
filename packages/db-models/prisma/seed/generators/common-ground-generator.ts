/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Common Ground Generator
 *
 * Generates realistic common ground analyses using LLM for the seeding framework.
 * Analyzes topic discussions to identify agreement zones, misunderstandings,
 * and genuine disagreements between participants.
 */

import { generateCommonGroundId } from '../demo-ids.js';
import type { SeedingLLMClient } from './llm-client.js';
import type {
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  GeneratedCommonGround,
  AgreementZone,
  Misunderstanding,
  GenuineDisagreement,
} from './types.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended common ground analysis type with generation-specific fields.
 * Extends the base GeneratedCommonGround with createdAtOffset for seeding.
 */
export interface GeneratedCommonGroundAnalysis extends GeneratedCommonGround {
  /** Offset in days from base timestamp for created date */
  createdAtOffset: number;
}

/**
 * LLM response structure for common ground analysis.
 */
interface LLMCommonGroundResponse {
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number;
}

// =============================================================================
// GENERATOR CLASS
// =============================================================================

/**
 * Generates common ground analyses using LLM for realistic content.
 */
export class CommonGroundGenerator {
  private client: SeedingLLMClient;

  constructor(client: SeedingLLMClient) {
    this.client = client;
  }

  /**
   * Generate common ground analysis for a specific topic.
   *
   * @param topic - The topic to analyze
   * @param responses - Responses for this topic
   * @param propositions - Propositions for this topic
   * @param topicNumber - Topic number for deterministic ID generation
   * @returns Generated common ground analysis
   */
  async generateForTopic(
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    propositions: GeneratedProposition[],
    topicNumber: number,
  ): Promise<GeneratedCommonGroundAnalysis> {
    // Calculate participant count from unique response authors
    const authorIds = new Set(responses.map((r) => r.authorId));
    const participantCount = Math.max(1, authorIds.size);

    const prompt = this.buildPrompt(topic, responses, propositions);
    const schema = this.buildSchema();

    const llmAnalysis = await this.client.generateJSON<LLMCommonGroundResponse>(prompt, schema);

    return this.transformToGeneratedCommonGround(
      llmAnalysis,
      topic,
      responses.length,
      participantCount,
      topicNumber,
    );
  }

  /**
   * Generate common ground analyses for all provided topics.
   *
   * @param topics - Array of topics to analyze
   * @param responses - Array of all responses across all topics
   * @param propositions - Array of all propositions across all topics
   * @returns Array of generated common ground analyses
   */
  async generateForAllTopics(
    topics: GeneratedTopic[],
    responses: GeneratedResponse[],
    propositions: GeneratedProposition[],
  ): Promise<GeneratedCommonGroundAnalysis[]> {
    const analyses: GeneratedCommonGroundAnalysis[] = [];

    // Group responses by topic
    const responsesByTopic = new Map<string, GeneratedResponse[]>();
    for (const response of responses) {
      const existing = responsesByTopic.get(response.topicId) || [];
      existing.push(response);
      responsesByTopic.set(response.topicId, existing);
    }

    // Group propositions by topic
    const propositionsByTopic = new Map<string, GeneratedProposition[]>();
    for (const proposition of propositions) {
      const existing = propositionsByTopic.get(proposition.topicId) || [];
      existing.push(proposition);
      propositionsByTopic.set(proposition.topicId, existing);
    }

    // Generate analysis for topics with at least 3 responses
    let analysisIndex = 1;
    for (const topic of topics) {
      const topicResponses = responsesByTopic.get(topic.id) || [];

      // Skip topics with fewer than 3 responses
      if (topicResponses.length < 3) {
        continue;
      }

      const topicPropositions = propositionsByTopic.get(topic.id) || [];
      const analysis = await this.generateForTopic(
        topic,
        topicResponses,
        topicPropositions,
        topic.topicIndex,
      );
      analyses.push(analysis);
      analysisIndex++;
    }

    return analyses;
  }

  /**
   * Build the prompt for LLM common ground analysis.
   */
  private buildPrompt(
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    propositions: GeneratedProposition[],
  ): string {
    // Build responses summary
    const responseSummary =
      responses.length > 0
        ? responses
            .map((r, i) => `${i + 1}. [${r.viewpoint.toUpperCase()}] "${r.content}"`)
            .join('\n')
        : 'No responses available yet.';

    // Build propositions summary
    const propositionSummary =
      propositions.length > 0
        ? propositions.map((p, i) => `${i + 1}. "${p.statement}"`).join('\n')
        : 'No propositions identified yet.';

    // Count unique authors
    const authorIds = new Set(responses.map((r) => r.authorId));
    const participantCount = Math.max(1, authorIds.size);

    return `Analyze the following discussion and identify areas of common ground, misunderstandings, and genuine disagreements.

Topic: "${topic.title}"
Description: ${topic.description}
Category: ${topic.category}
Participant Count: ${participantCount}

Discussion Responses:
${responseSummary}

Key Propositions:
${propositionSummary}

Requirements:
1. Generate 1-3 agreement zones (areas where participants share common ground)
   - Each should have a clear proposition, participant count (up to ${participantCount}), supporting evidence, and agreement percentage (50-100%)
2. Generate 0-2 misunderstandings (semantic or conceptual confusions)
   - Each should identify the topic of confusion, clarification needed, and different interpretations
3. Generate 1-2 genuine disagreements (value-based or factual disputes)
   - Each should have a proposition, 2 viewpoints with positions/reasoning/participant counts, and underlying values
4. Calculate an overall consensus score (0.0 to 1.0):
   - Higher scores indicate more agreement and nuanced discussion
   - Lower scores indicate more polarization
   - Consider the balance of viewpoints and quality of engagement

Generate a realistic common ground analysis for this topic.`;
  }

  /**
   * Build the expected JSON schema for LLM response.
   */
  private buildSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        agreementZones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              proposition: { type: 'string', description: 'The shared viewpoint or agreement' },
              participantCount: { type: 'number', description: 'Number of participants who agree' },
              supportingEvidence: {
                type: 'array',
                items: { type: 'string' },
                description: 'Evidence supporting this agreement',
              },
              agreementPercentage: {
                type: 'number',
                description: 'Percentage of participants who agree (50-100)',
              },
            },
            required: [
              'proposition',
              'participantCount',
              'supportingEvidence',
              'agreementPercentage',
            ],
          },
          description: 'Areas where participants share common ground (1-3 items)',
        },
        misunderstandings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'The topic of misunderstanding' },
              clarification: { type: 'string', description: 'Clarification needed' },
              interpretations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    interpretation: { type: 'string' },
                    participantCount: { type: 'number' },
                  },
                  required: ['interpretation', 'participantCount'],
                },
                description: 'Different interpretations held by participants',
              },
            },
            required: ['topic', 'clarification', 'interpretations'],
          },
          description: 'Semantic or conceptual confusions (0-2 items)',
        },
        genuineDisagreements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              proposition: { type: 'string', description: 'The disputed proposition' },
              viewpoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    position: { type: 'string' },
                    reasoning: { type: 'array', items: { type: 'string' } },
                    participantCount: { type: 'number' },
                  },
                  required: ['position', 'reasoning', 'participantCount'],
                },
                description: 'Different viewpoints on this disagreement',
              },
              underlyingValues: {
                type: 'array',
                items: { type: 'string' },
                description: 'Values driving the disagreement',
              },
            },
            required: ['proposition', 'viewpoints', 'underlyingValues'],
          },
          description: 'Value-based or factual disputes (1-2 items)',
        },
        overallConsensusScore: {
          type: 'number',
          description: 'Overall consensus score from 0.0 to 1.0',
        },
      },
      required: [
        'agreementZones',
        'misunderstandings',
        'genuineDisagreements',
        'overallConsensusScore',
      ],
    };
  }

  /**
   * Transform LLM response into GeneratedCommonGroundAnalysis.
   */
  private transformToGeneratedCommonGround(
    llmAnalysis: LLMCommonGroundResponse,
    topic: GeneratedTopic,
    responseCount: number,
    participantCount: number,
    topicNumber: number,
  ): GeneratedCommonGroundAnalysis {
    // Ensure consensus score is within valid range
    const consensusScore = Math.max(0.2, Math.min(0.85, llmAnalysis.overallConsensusScore));

    return {
      id: generateCommonGroundId(topicNumber + 100, 1),
      topicId: topic.id,
      version: 1,
      agreementZones: llmAnalysis.agreementZones,
      misunderstandings: llmAnalysis.misunderstandings,
      genuineDisagreements: llmAnalysis.genuineDisagreements,
      overallConsensusScore: Math.round(consensusScore * 100) / 100,
      participantCountAtGeneration: participantCount,
      responseCountAtGeneration: responseCount,
      modelVersion: 'claude-3-5-sonnet',
      createdAtOffset: Math.max(0, topic.createdAtOffset - 5), // Analysis created after some discussion
    };
  }
}

// =============================================================================
// LEGACY EXPORTS (Backward Compatibility)
// =============================================================================

/**
 * Generate common ground analyses for topics that have responses.
 * This is a legacy function that creates a generator with a mock client
 * for backward compatibility.
 *
 * @deprecated Use CommonGroundGenerator class instead
 */
export function generateCommonGroundAnalyses(
  topics: GeneratedTopic[],
  responses: GeneratedResponse[],
  _users: unknown[],
): GeneratedCommonGroundAnalysis[] {
  // Legacy implementation for backward compatibility
  // This provides template-based fallback when LLM is not available
  const analyses: GeneratedCommonGroundAnalysis[] = [];

  // Group responses by topic
  const responsesByTopic = new Map<string, GeneratedResponse[]>();
  for (const response of responses) {
    const existing = responsesByTopic.get(response.topicId) || [];
    existing.push(response);
    responsesByTopic.set(response.topicId, existing);
  }

  // Generate analysis for topics with at least 3 responses
  let analysisIndex = 1;
  for (const topic of topics) {
    const topicResponses = responsesByTopic.get(topic.id) || [];
    if (topicResponses.length < 3) continue;

    // Get unique authors for this topic
    const authorIds = new Set(topicResponses.map((r) => r.authorId));
    const participantCount = authorIds.size;

    // Count viewpoints
    const viewpointCounts = {
      support: topicResponses.filter((r) => r.viewpoint === 'support').length,
      oppose: topicResponses.filter((r) => r.viewpoint === 'oppose').length,
      nuanced: topicResponses.filter((r) => r.viewpoint === 'nuanced').length,
    };

    // Calculate consensus score
    const maxViewpoint = Math.max(
      viewpointCounts.support,
      viewpointCounts.oppose,
      viewpointCounts.nuanced,
    );
    const consensusScore =
      Math.round(
        ((viewpointCounts.nuanced * 0.8 + maxViewpoint * 0.6) / topicResponses.length) * 100,
      ) / 100;

    // Generate basic analysis
    const analysis: GeneratedCommonGroundAnalysis = {
      id: generateCommonGroundId(topic.topicIndex + 100, analysisIndex),
      topicId: topic.id,
      version: 1,
      agreementZones: [
        {
          proposition: 'Evidence-based decision making is important',
          participantCount: Math.max(2, Math.floor(participantCount * 0.7)),
          supportingEvidence: ['Research studies', 'Expert consensus'],
          agreementPercentage: 70,
        },
      ],
      misunderstandings: [],
      genuineDisagreements: [
        {
          proposition: 'Optimal approach to change',
          viewpoints: [
            {
              position: 'Rapid transformation',
              reasoning: ['Urgency of issues', 'Momentum building'],
              participantCount: viewpointCounts.support || 2,
            },
            {
              position: 'Incremental change',
              reasoning: ['Risk mitigation', 'Stakeholder adaptation'],
              participantCount: viewpointCounts.oppose || 2,
            },
          ],
          underlyingValues: ['Innovation', 'Stability'],
        },
      ],
      overallConsensusScore: Math.max(0.2, Math.min(0.85, consensusScore)),
      participantCountAtGeneration: participantCount,
      responseCountAtGeneration: topicResponses.length,
      modelVersion: 'claude-3-5-sonnet',
      createdAtOffset: Math.max(0, topic.createdAtOffset - 5),
    };
    analyses.push(analysis);
    analysisIndex++;
  }

  return analyses;
}

export default CommonGroundGenerator;
