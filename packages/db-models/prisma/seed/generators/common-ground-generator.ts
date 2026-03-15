/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Common Ground Analysis Generator
 *
 * Generates realistic common ground analyses for seeded topics,
 * including agreement zones, misunderstandings, and genuine disagreements.
 */

import { generateCommonGroundId } from '../demo-ids.js';
import type {
  GeneratedTopic,
  GeneratedResponse,
  GeneratedUserPersona,
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

// =============================================================================
// TEMPLATES
// =============================================================================

const AGREEMENT_TEMPLATES = [
  {
    proposition: 'Evidence-based decision making is important',
    evidence: ['Research studies', 'Expert consensus', 'Historical data'],
  },
  {
    proposition: 'Stakeholder input should be considered',
    evidence: ['Community feedback', 'Survey data', 'Public hearings'],
  },
  {
    proposition: 'Gradual implementation reduces risk',
    evidence: ['Pilot program results', 'Implementation case studies'],
  },
  {
    proposition: 'Transparency in process is valuable',
    evidence: ['Accountability reports', 'Public trust surveys'],
  },
  {
    proposition: 'Cost-effectiveness matters',
    evidence: ['Budget analyses', 'Economic impact studies'],
  },
  {
    proposition: 'Long-term sustainability should be prioritized',
    evidence: ['Environmental assessments', 'Future projections'],
  },
  {
    proposition: 'Equity considerations are essential',
    evidence: ['Demographic data', 'Impact assessments'],
  },
  {
    proposition: 'Regular evaluation and adjustment is needed',
    evidence: ['Performance metrics', 'Feedback mechanisms'],
  },
];

const MISUNDERSTANDING_TEMPLATES = [
  {
    topic: 'Implementation timeline',
    clarification: 'Distinguish between planning phase and execution phase',
    interpretations: ['Immediate start', 'Phased rollout'],
  },
  {
    topic: 'Success metrics',
    clarification: 'Clarify whether measuring short-term or long-term outcomes',
    interpretations: ['Quantitative measures', 'Qualitative outcomes'],
  },
  {
    topic: 'Scope of impact',
    clarification: 'Define whether discussing local or systemic effects',
    interpretations: ['Individual impact', 'Community-wide impact'],
  },
  {
    topic: 'Resource allocation',
    clarification: 'Specify whether referring to initial or ongoing costs',
    interpretations: ['Upfront investment', 'Ongoing maintenance'],
  },
  {
    topic: 'Stakeholder responsibility',
    clarification: 'Clarify which entities bear primary responsibility',
    interpretations: ['Government-led', 'Community-driven'],
  },
];

const DISAGREEMENT_TEMPLATES = [
  {
    proposition: 'Optimal approach to change',
    positions: [
      { position: 'Rapid transformation', reasoning: ['Urgency of issues', 'Momentum building'] },
      { position: 'Incremental change', reasoning: ['Risk mitigation', 'Stakeholder adaptation'] },
    ],
    values: ['Innovation', 'Stability'],
  },
  {
    proposition: 'Priority of competing values',
    positions: [
      { position: 'Efficiency first', reasoning: ['Resource constraints', 'Scalability needs'] },
      { position: 'Equity first', reasoning: ['Social justice', 'Inclusive outcomes'] },
    ],
    values: ['Economic efficiency', 'Social equity'],
  },
  {
    proposition: 'Role of regulation',
    positions: [
      { position: 'Strong oversight', reasoning: ['Accountability', 'Consumer protection'] },
      { position: 'Market-based solutions', reasoning: ['Flexibility', 'Innovation incentives'] },
    ],
    values: ['Protection', 'Freedom'],
  },
  {
    proposition: 'Technology adoption',
    positions: [
      { position: 'Early adoption', reasoning: ['Competitive advantage', 'Future-proofing'] },
      { position: 'Proven solutions', reasoning: ['Risk reduction', 'Reliability'] },
    ],
    values: ['Progress', 'Caution'],
  },
];

// =============================================================================
// GENERATOR
// =============================================================================

/**
 * Generate common ground analyses for topics that have responses
 */
export function generateCommonGroundAnalyses(
  topics: GeneratedTopic[],
  responses: GeneratedResponse[],
  users: GeneratedUserPersona[],
): GeneratedCommonGroundAnalysis[] {
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

    // Generate analysis based on topic characteristics
    const analysis = generateAnalysisForTopic(
      topic,
      topicResponses,
      participantCount,
      analysisIndex,
    );
    analyses.push(analysis);
    analysisIndex++;
  }

  return analyses;
}

function generateAnalysisForTopic(
  topic: GeneratedTopic,
  responses: GeneratedResponse[],
  participantCount: number,
  analysisIndex: number,
): GeneratedCommonGroundAnalysis {
  const responseCount = responses.length;

  // Determine consensus based on topic type and response diversity
  const viewpointCounts = {
    support: responses.filter((r) => r.viewpoint === 'support').length,
    oppose: responses.filter((r) => r.viewpoint === 'oppose').length,
    nuanced: responses.filter((r) => r.viewpoint === 'nuanced').length,
  };

  // Calculate consensus score (higher if more agreement or nuance)
  const maxViewpoint = Math.max(
    viewpointCounts.support,
    viewpointCounts.oppose,
    viewpointCounts.nuanced,
  );
  const consensusScore =
    Math.round(((viewpointCounts.nuanced * 0.8 + maxViewpoint * 0.6) / responseCount) * 100) / 100;

  // Generate 1-3 agreement zones
  const numAgreements = Math.min(3, Math.max(1, Math.floor(participantCount / 5)));
  const agreementZones = generateAgreementZones(
    topic,
    participantCount,
    numAgreements,
    analysisIndex,
  );

  // Generate 1-2 misunderstandings
  const numMisunderstandings = participantCount > 5 ? 2 : 1;
  const misunderstandings = generateMisunderstandings(
    participantCount,
    numMisunderstandings,
    analysisIndex,
  );

  // Generate 1-2 genuine disagreements
  const numDisagreements = viewpointCounts.support > 0 && viewpointCounts.oppose > 0 ? 2 : 1;
  const genuineDisagreements = generateDisagreements(
    viewpointCounts,
    numDisagreements,
    analysisIndex,
  );

  return {
    id: generateCommonGroundId(topic.topicIndex + 100, analysisIndex),
    topicId: topic.id,
    version: 1,
    agreementZones,
    misunderstandings,
    genuineDisagreements,
    overallConsensusScore: Math.max(0.2, Math.min(0.85, consensusScore)),
    participantCountAtGeneration: participantCount,
    responseCountAtGeneration: responseCount,
    modelVersion: 'gpt-4-turbo-demo',
    createdAtOffset: Math.max(0, topic.createdAtOffset - 5), // Analysis created after some discussion
  };
}

function generateAgreementZones(
  topic: GeneratedTopic,
  participantCount: number,
  count: number,
  seed: number,
): AgreementZone[] {
  const zones: AgreementZone[] = [];

  for (let i = 0; i < count; i++) {
    const templateIndex = (seed + i) % AGREEMENT_TEMPLATES.length;
    const template = AGREEMENT_TEMPLATES[templateIndex]!;

    // Customize proposition based on topic
    const customizedProposition = customizeForTopic(template.proposition, topic.category);

    zones.push({
      proposition: customizedProposition,
      participantCount: Math.max(3, Math.floor(participantCount * (0.6 + i * 0.1))),
      supportingEvidence: template.evidence.slice(0, 2),
      agreementPercentage: 65 + (seed % 25) - i * 5,
    });
  }

  return zones;
}

function generateMisunderstandings(
  participantCount: number,
  count: number,
  seed: number,
): Misunderstanding[] {
  const misunderstandings: Misunderstanding[] = [];

  for (let i = 0; i < count; i++) {
    const templateIndex = (seed + i) % MISUNDERSTANDING_TEMPLATES.length;
    const template = MISUNDERSTANDING_TEMPLATES[templateIndex]!;

    const halfParticipants = Math.floor(participantCount / 2);

    misunderstandings.push({
      topic: template.topic,
      clarification: template.clarification,
      interpretations: template.interpretations.map((interp, idx) => ({
        interpretation: interp,
        participantCount: idx === 0 ? halfParticipants : participantCount - halfParticipants,
      })),
    });
  }

  return misunderstandings;
}

function generateDisagreements(
  viewpointCounts: { support: number; oppose: number; nuanced: number },
  count: number,
  seed: number,
): GenuineDisagreement[] {
  const disagreements: GenuineDisagreement[] = [];

  for (let i = 0; i < count; i++) {
    const templateIndex = (seed + i) % DISAGREEMENT_TEMPLATES.length;
    const template = DISAGREEMENT_TEMPLATES[templateIndex]!;

    disagreements.push({
      proposition: template.proposition,
      viewpoints: template.positions.map((pos, idx) => ({
        position: pos.position,
        reasoning: pos.reasoning,
        participantCount: idx === 0 ? viewpointCounts.support || 3 : viewpointCounts.oppose || 3,
      })),
      underlyingValues: template.values,
    });
  }

  return disagreements;
}

function customizeForTopic(proposition: string, category: string): string {
  // Add category-specific context to generic propositions
  const categoryContext: Record<string, string> = {
    Environment: 'environmental',
    Technology: 'technological',
    Education: 'educational',
    Healthcare: 'healthcare',
    Economy: 'economic',
    Politics: 'policy',
    Ethics: 'ethical',
    Science: 'scientific',
    Society: 'social',
  };

  const context = categoryContext[category] || 'proposed';
  return proposition.replace('decision making', `${context} decision making`);
}

export default generateCommonGroundAnalyses;
