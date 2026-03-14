/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Proposition Generator for Enhanced Demo Seed Data
 *
 * Generates propositions extracted from responses. Propositions represent
 * distinct claims, values, policies, definitions, or causal assertions
 * that can be analyzed for consensus and common ground.
 */

import { generatePropositionId } from '../demo-ids.js';
import type { GeneratedResponse } from './response-generator.js';
import type { AIClient } from './ai-client.js';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type PropositionType = 'claim' | 'value' | 'policy' | 'definition' | 'causal';

export interface GeneratedProposition {
  id: string;
  topicId: string;
  responseId: string;
  statement: string;
  type: PropositionType;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number;
  createdAtOffset: number;
}

export interface PropositionGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PROPOSITION_TYPES: PropositionType[] = [
  'claim',
  'value',
  'policy',
  'definition',
  'causal',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract a mock proposition statement based on content and type
 */
function extractMockProposition(content: string, type: PropositionType): string {
  // Get first sentence or fragment for context
  const firstSentence = content.split(/[.!?]/)[0]?.trim() ?? 'This topic';

  const templates: Record<PropositionType, string> = {
    claim: `It is the case that ${
      firstSentence
        .toLowerCase()
        .replace(
          /^(i believe|after careful consideration|looking at|this raises|i strongly agree|while i appreciate|building on|i see it|i'm curious|recent studies|taking stock|reflecting on)/i,
          '',
        )
        .trim() || 'this assertion holds true'
    }.`,
    value: `We should prioritize the value of reasoned discourse and evidence-based analysis in evaluating this matter.`,
    policy: `A policy approach should be implemented to address the concerns raised about ${firstSentence.toLowerCase().slice(0, 50)}...`,
    definition: `For the purposes of this discussion, the key term refers to the concept as understood in its most widely accepted form.`,
    causal: `There is a causal relationship between the proposed action and its expected outcomes as described.`,
  };

  return templates[type];
}

/**
 * Enrich propositions with AI-generated content
 */
async function enrichPropositionsWithAI(
  propositions: GeneratedProposition[],
  responses: GeneratedResponse[],
  aiClient: AIClient,
): Promise<void> {
  console.log('Enriching propositions with AI...');

  // Build response lookup
  const responseMap = new Map<string, GeneratedResponse>();
  for (const response of responses) {
    responseMap.set(response.id, response);
  }

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < propositions.length; i += batchSize) {
    const batch = propositions.slice(i, i + batchSize);
    const prompts = batch.map((proposition) => {
      const response = responseMap.get(proposition.responseId);
      const content = response?.content ?? 'this discussion topic';

      return (
        `Extract a concise ${proposition.type} proposition from this text: "${content.slice(0, 500)}". ` +
        `Format as a single declarative sentence that captures the core ${proposition.type}. ` +
        `Keep it under 100 words and ensure it's a standalone statement.`
      );
    });

    const generatedStatements = await aiClient.generateBatch(prompts);
    batch.forEach((proposition, j) => {
      const statement = generatedStatements[j];
      if (statement !== undefined) {
        proposition.statement = statement;
      }
    });

    console.log(
      `  Enriched ${Math.min(i + batchSize, propositions.length)}/${propositions.length} propositions`,
    );
  }
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate propositions from responses
 *
 * Analyzes response content and extracts propositions based on content length:
 * - Substantive responses (>100 words): 1-2 propositions
 * - Medium responses (>50 words): 1 proposition
 * - Short responses: 0 propositions
 *
 * @param responses - Array of generated responses to extract propositions from
 * @param options - Optional AI client and mock data flag
 * @returns Promise resolving to array of generated propositions
 */
export async function generatePropositions(
  responses: GeneratedResponse[],
  options: PropositionGeneratorOptions = {},
): Promise<GeneratedProposition[]> {
  const { aiClient, useMockData = true } = options;

  const propositions: GeneratedProposition[] = [];
  let propIndex = 1;

  for (const response of responses) {
    // Calculate word count
    const wordCount = response.content.split(/\s+/).length;

    // Determine number of propositions based on content length
    let propositionCount = 0;
    if (wordCount > 100) {
      // Substantive responses: 1-2 propositions (deterministic based on index)
      propositionCount = 1 + (propIndex % 2);
    } else if (wordCount > 50) {
      // Medium responses: 1 proposition
      propositionCount = 1;
    }
    // Short responses: 0 propositions

    // Generate propositions for this response
    for (let i = 0; i < propositionCount; i++) {
      const typeIndex = propIndex % PROPOSITION_TYPES.length;
      const type = PROPOSITION_TYPES[typeIndex] as PropositionType;

      // Deterministic vote counts based on propIndex
      const supportCount = 5 + (propIndex % 10);
      const opposeCount = 2 + (propIndex % 5);
      const nuancedCount = 1 + (propIndex % 3);

      // Consensus score: ranges from 0.50 to 0.99 deterministically
      const consensusScore = 0.5 + (propIndex % 50) / 100;

      const proposition: GeneratedProposition = {
        id: generatePropositionId(100, propIndex),
        topicId: response.topicId,
        responseId: response.id,
        statement: extractMockProposition(response.content, type),
        type,
        supportCount,
        opposeCount,
        nuancedCount,
        consensusScore,
        createdAtOffset: response.createdAtOffset,
      };

      propositions.push(proposition);
      propIndex++;
    }
  }

  // Optionally enrich with AI-generated statements
  if (aiClient && !useMockData) {
    await enrichPropositionsWithAI(propositions, responses, aiClient);
  }

  console.log(`Generated ${propositions.length} propositions from ${responses.length} responses`);

  return propositions;
}

export default generatePropositions;
