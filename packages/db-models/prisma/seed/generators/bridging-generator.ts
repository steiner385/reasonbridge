/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bridging Suggestion Generator
 *
 * Generates bridging suggestions using LLM for the seeding framework.
 * Creates constructive suggestions to help bridge divides in discussions
 * by identifying shared values, reframing issues, and proposing compromises.
 */

import { generateBridgingId } from '../demo-ids.js';
import type { SeedingLLMClient } from './llm-client.js';
import type {
  GeneratedTopic,
  GeneratedProposition,
  GeneratedCommonGround,
  GeneratedBridgingSuggestion,
  BridgingType,
  TargetAudience,
} from './types.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * LLM response structure for bridging suggestions.
 */
interface LLMBridgingSuggestionResponse {
  suggestionText: string;
  targetAudience: TargetAudience;
  relatedPropositionIndices: number[];
  potentialCommonGround: string;
  confidenceScore: number;
  suggestionType: BridgingType;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SUGGESTIONS_PER_TOPIC = 3;
const MIN_CONFIDENCE_SCORE = 0.5;
const MAX_CONFIDENCE_SCORE = 0.95;

// =============================================================================
// GENERATOR CLASS
// =============================================================================

/**
 * Generates bridging suggestions using LLM for realistic content.
 */
export class BridgingGenerator {
  private client: SeedingLLMClient;

  constructor(client: SeedingLLMClient) {
    this.client = client;
  }

  /**
   * Generate bridging suggestions for a specific topic.
   *
   * @param topic - The topic to generate suggestions for
   * @param propositions - Propositions for this topic
   * @param commonGround - Common ground analysis for this topic
   * @param topicNumber - Topic number for deterministic ID generation
   * @returns Generated bridging suggestions
   */
  async generateForTopic(
    topic: GeneratedTopic,
    propositions: GeneratedProposition[],
    commonGround: GeneratedCommonGround,
    topicNumber: number,
  ): Promise<GeneratedBridgingSuggestion[]> {
    const prompt = this.buildPrompt(topic, propositions, commonGround);
    const schema = this.buildSchema();

    const llmSuggestions = await this.client.generateJSON<LLMBridgingSuggestionResponse[]>(
      prompt,
      schema,
    );

    return this.transformToGeneratedBridgingSuggestions(
      llmSuggestions,
      topic,
      propositions,
      commonGround,
      topicNumber,
    );
  }

  /**
   * Generate bridging suggestions for all topics that have common ground analyses.
   *
   * @param topics - Array of topics
   * @param propositions - Array of all propositions across all topics
   * @param commonGroundAnalyses - Array of common ground analyses
   * @returns Array of generated bridging suggestions
   */
  async generateForAllTopics(
    topics: GeneratedTopic[],
    propositions: GeneratedProposition[],
    commonGroundAnalyses: GeneratedCommonGround[],
  ): Promise<GeneratedBridgingSuggestion[]> {
    const suggestions: GeneratedBridgingSuggestion[] = [];

    // Create a map of common ground analyses by topic ID
    const commonGroundByTopic = new Map<string, GeneratedCommonGround>();
    for (const analysis of commonGroundAnalyses) {
      commonGroundByTopic.set(analysis.topicId, analysis);
    }

    // Group propositions by topic
    const propositionsByTopic = new Map<string, GeneratedProposition[]>();
    for (const proposition of propositions) {
      const existing = propositionsByTopic.get(proposition.topicId) || [];
      existing.push(proposition);
      propositionsByTopic.set(proposition.topicId, existing);
    }

    // Generate suggestions only for topics with common ground analyses
    for (const topic of topics) {
      const commonGround = commonGroundByTopic.get(topic.id);
      if (!commonGround) {
        // Skip topics without common ground analysis
        continue;
      }

      const topicPropositions = propositionsByTopic.get(topic.id) || [];
      const topicSuggestions = await this.generateForTopic(
        topic,
        topicPropositions,
        commonGround,
        topic.topicIndex,
      );
      suggestions.push(...topicSuggestions);
    }

    return suggestions;
  }

  /**
   * Build the prompt for LLM bridging suggestion generation.
   */
  private buildPrompt(
    topic: GeneratedTopic,
    propositions: GeneratedProposition[],
    commonGround: GeneratedCommonGround,
  ): string {
    // Build propositions summary
    const propositionSummary =
      propositions.length > 0
        ? propositions.map((p, i) => `${i}. "${p.statement}"`).join('\n')
        : 'No propositions available.';

    // Build common ground summary
    const agreementSummary =
      commonGround.agreementZones.length > 0
        ? commonGround.agreementZones
            .map((az) => `- ${az.proposition} (${az.agreementPercentage}% agreement)`)
            .join('\n')
        : 'No agreement zones identified.';

    const disagreementSummary =
      commonGround.genuineDisagreements.length > 0
        ? commonGround.genuineDisagreements
            .map((gd) => `- ${gd.proposition} (values: ${gd.underlyingValues.join(', ')})`)
            .join('\n')
        : 'No genuine disagreements identified.';

    return `Generate ${SUGGESTIONS_PER_TOPIC} bridging suggestions to help participants find common ground in the following discussion.

Topic: "${topic.title}"
Description: ${topic.description}
Category: ${topic.category}
Overall Consensus Score: ${commonGround.overallConsensusScore}

Propositions (use index numbers to reference):
${propositionSummary}

Agreement Zones:
${agreementSummary}

Genuine Disagreements:
${disagreementSummary}

Requirements:
1. Generate exactly ${SUGGESTIONS_PER_TOPIC} suggestions
2. Each suggestion should have:
   - suggestionText: A constructive suggestion to bridge divides (1-2 sentences)
   - targetAudience: Who should consider this ('support', 'oppose', or 'both')
   - relatedPropositionIndices: Array of proposition index numbers this relates to (can be empty)
   - potentialCommonGround: What shared value or interest this builds upon
   - confidenceScore: How likely this could help (0.5-0.95)
   - suggestionType: Type of suggestion ('reframe', 'question', 'shared_value', 'compromise')
3. Suggestion types:
   - 'reframe': Presents the issue from a different perspective
   - 'question': Asks a question that could reveal shared understanding
   - 'shared_value': Highlights a common value both sides share
   - 'compromise': Proposes a middle-ground solution
4. Vary the suggestion types and target audiences across the ${SUGGESTIONS_PER_TOPIC} suggestions

Generate constructive bridging suggestions that could help move the discussion toward understanding.`;
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
          suggestionText: {
            type: 'string',
            description: 'A constructive suggestion to help bridge divides (1-2 sentences)',
          },
          targetAudience: {
            type: 'string',
            enum: ['support', 'oppose', 'both'],
            description: 'Who should consider this suggestion',
          },
          relatedPropositionIndices: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of proposition index numbers this relates to',
          },
          potentialCommonGround: {
            type: 'string',
            description: 'What shared value or interest this builds upon',
          },
          confidenceScore: {
            type: 'number',
            description: 'How likely this could help bridge the divide (0.5-0.95)',
          },
          suggestionType: {
            type: 'string',
            enum: ['reframe', 'question', 'shared_value', 'compromise'],
            description: 'Type of bridging suggestion',
          },
        },
        required: [
          'suggestionText',
          'targetAudience',
          'relatedPropositionIndices',
          'potentialCommonGround',
          'confidenceScore',
          'suggestionType',
        ],
      },
      description: `Array of ${SUGGESTIONS_PER_TOPIC} bridging suggestions`,
    };
  }

  /**
   * Transform LLM response into GeneratedBridgingSuggestion array.
   */
  private transformToGeneratedBridgingSuggestions(
    llmSuggestions: LLMBridgingSuggestionResponse[],
    topic: GeneratedTopic,
    propositions: GeneratedProposition[],
    commonGround: GeneratedCommonGround,
    topicNumber: number,
  ): GeneratedBridgingSuggestion[] {
    return llmSuggestions.map((suggestion, index) => {
      // Map proposition indices to actual IDs
      const relatedPropositionIds = suggestion.relatedPropositionIndices
        .filter((idx) => idx >= 0 && idx < propositions.length)
        .map((idx) => propositions[idx]!.id);

      // Clamp confidence score to valid range
      const confidenceScore = Math.max(
        MIN_CONFIDENCE_SCORE,
        Math.min(MAX_CONFIDENCE_SCORE, suggestion.confidenceScore),
      );

      return {
        id: generateBridgingId(topicNumber, index + 1),
        topicId: topic.id,
        commonGroundAnalysisId: commonGround.id,
        suggestionText: suggestion.suggestionText,
        targetAudience: suggestion.targetAudience,
        relatedPropositionIds,
        potentialCommonGround: suggestion.potentialCommonGround,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        suggestionType: suggestion.suggestionType,
      };
    });
  }
}

// =============================================================================
// LEGACY EXPORTS (Backward Compatibility)
// =============================================================================

/**
 * Generate bridging suggestions for topics with common ground analyses.
 * This is a legacy function that provides template-based fallback
 * for backward compatibility.
 *
 * @deprecated Use BridgingGenerator class instead
 */
export function generateBridgingSuggestions(
  topics: GeneratedTopic[],
  _propositions: GeneratedProposition[],
  commonGroundAnalyses: GeneratedCommonGround[],
): GeneratedBridgingSuggestion[] {
  const suggestions: GeneratedBridgingSuggestion[] = [];

  // Create a map of common ground analyses by topic ID
  const commonGroundByTopic = new Map<string, GeneratedCommonGround>();
  for (const analysis of commonGroundAnalyses) {
    commonGroundByTopic.set(analysis.topicId, analysis);
  }

  // Generate template-based suggestions for topics with common ground analyses
  let suggestionSequence = 1;
  for (const topic of topics) {
    const commonGround = commonGroundByTopic.get(topic.id);
    if (!commonGround) continue;

    // Generate 3 template-based suggestions per topic
    const suggestionTypes: BridgingType[] = ['reframe', 'question', 'shared_value'];
    const audiences: TargetAudience[] = ['both', 'support', 'oppose'];

    for (let i = 0; i < SUGGESTIONS_PER_TOPIC; i++) {
      const suggestionType = suggestionTypes[i] ?? 'reframe';
      const targetAudience = audiences[i] ?? 'both';
      const suggestion: GeneratedBridgingSuggestion = {
        id: generateBridgingId(topic.topicIndex, suggestionSequence),
        topicId: topic.id,
        commonGroundAnalysisId: commonGround.id,
        suggestionText: getTemplateSuggestion(suggestionType, topic.title),
        targetAudience,
        relatedPropositionIds: [],
        potentialCommonGround: 'Shared interest in constructive dialogue',
        confidenceScore: 0.7,
        suggestionType,
      };
      suggestions.push(suggestion);
      suggestionSequence++;
    }
  }

  return suggestions;
}

/**
 * Get a template-based suggestion text.
 */
function getTemplateSuggestion(type: BridgingType, topicTitle: string): string {
  switch (type) {
    case 'reframe':
      return `Consider how the goals of both sides might actually align when we reframe "${topicTitle}" in terms of shared outcomes rather than opposing positions.`;
    case 'question':
      return `What would success look like for all stakeholders in this discussion about "${topicTitle}"?`;
    case 'shared_value':
      return `Both sides value evidence-based decision-making. How might we agree on criteria for evaluating approaches to "${topicTitle}"?`;
    case 'compromise':
      return `A phased approach might address concerns on both sides while allowing for adjustment based on real-world outcomes.`;
  }
}

export default BridgingGenerator;
