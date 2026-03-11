/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Adapter to transform backend CommonGroundResponseDto to frontend CommonGroundAnalysis
 *
 * The backend stores common ground analysis in a simplified format,
 * while the frontend components expect a richer structure with computed fields.
 * This adapter bridges the gap between the two representations.
 */

import type {
  CommonGroundAnalysis,
  AgreementZone,
  Misunderstanding,
  Disagreement,
  Proposition,
} from '../types/common-ground';

/**
 * Backend DTO types (from services/discussion-service/src/topics/dto/common-ground-response.dto.ts)
 * These match what the API actually returns
 */
interface BackendAgreementZone {
  // In demo data format
  proposition?: string;
  agreementPercentage?: number;
  supportingEvidence?: string[];
  participantCount?: number;

  // In DTO format
  description?: string;
  confidence?: number;
  propositionIds?: string[];
  participantPercentage?: number;
}

interface BackendMisunderstanding {
  // In demo data format
  topic?: string;
  interpretations?: Array<{
    interpretation: string;
    participantCount: number;
  }>;
  clarification?: string;

  // In DTO format
  description?: string;
  term?: string;
  definitions?: Array<{
    definition: string;
    userCount?: number;
  }>;
  affectedPropositions?: string[];
}

interface BackendGenuineDisagreement {
  // In demo data format
  proposition?: string;
  viewpoints?: Array<{
    position: string;
    participantCount: number;
    reasoning: string[];
  }>;
  underlyingValues?: string[];

  // In DTO format
  description?: string;
  moralFoundations?: string[];
  propositionIds?: string[];
}

interface BackendCommonGroundResponse {
  id: string;
  version?: number;
  agreementZones: BackendAgreementZone[];
  misunderstandings: BackendMisunderstanding[];
  genuineDisagreements: BackendGenuineDisagreement[];
  overallConsensusScore: number;
  participantCountAtGeneration?: number;
  responseCountAtGeneration?: number;
  generatedAt?: Date | string;
  createdAt?: Date | string;
}

/**
 * Determines consensus level based on confidence or agreement percentage
 */
function getConsensusLevel(
  confidence: number | undefined,
  agreementPercentage: number | undefined,
): 'high' | 'medium' | 'low' {
  const score = confidence ?? agreementPercentage ?? 50;
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Generates a synthetic ID for items that don't have one
 */
function generateId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

/**
 * Transform a backend agreement zone to frontend format
 */
function transformAgreementZone(backendZone: BackendAgreementZone, index: number): AgreementZone {
  // Create a synthetic proposition from the zone's data
  const propositions: Proposition[] = [];

  if (backendZone.proposition) {
    // Demo data format - proposition is a string
    propositions.push({
      id: generateId('prop', index),
      text: backendZone.proposition,
      agreementPercentage: backendZone.agreementPercentage ?? 50,
      supportingParticipants: [], // Not available in backend
      opposingParticipants: [],
      neutralParticipants: [],
    });
  }

  // Use proposition text as title, or a default
  const title = backendZone.proposition
    ? backendZone.proposition.slice(0, 60) + (backendZone.proposition.length > 60 ? '...' : '')
    : backendZone.description || 'Agreement Zone';

  return {
    id: generateId('zone', index),
    title,
    description:
      backendZone.description ||
      backendZone.supportingEvidence?.join('. ') ||
      'Points of shared agreement identified in the discussion.',
    propositions,
    participantCount: backendZone.participantCount ?? 0,
    consensusLevel: getConsensusLevel(backendZone.confidence, backendZone.agreementPercentage),
    relatedResponseIds: [], // Not available in backend
  };
}

/**
 * Transform a backend misunderstanding to frontend format
 */
function transformMisunderstanding(
  backendMisunderstanding: BackendMisunderstanding,
  index: number,
): Misunderstanding {
  // Map interpretations to definitions format
  const definitions =
    backendMisunderstanding.interpretations?.map((interp) => ({
      definition: interp.interpretation,
      participants: Array(interp.participantCount)
        .fill(null)
        .map((_, i) => `participant-${i}`),
    })) ||
    backendMisunderstanding.definitions?.map((def) => ({
      definition: def.definition,
      participants: Array(def.userCount ?? 0)
        .fill(null)
        .map((_, i) => `participant-${i}`),
    })) ||
    [];

  return {
    id: generateId('misunderstanding', index),
    term: backendMisunderstanding.term || backendMisunderstanding.topic || 'Term',
    definitions,
    clarificationSuggestion:
      backendMisunderstanding.clarification || backendMisunderstanding.description,
  };
}

/**
 * Transform a backend genuine disagreement to frontend format
 */
function transformDisagreement(
  backendDisagreement: BackendGenuineDisagreement,
  index: number,
): Disagreement {
  // Map viewpoints to positions format
  const positions =
    backendDisagreement.viewpoints?.map((viewpoint) => ({
      stance: viewpoint.position,
      reasoning: viewpoint.reasoning?.join('. ') || '',
      participants: Array(viewpoint.participantCount)
        .fill(null)
        .map((_, i) => `participant-${i}`),
      underlyingValue: backendDisagreement.underlyingValues?.[0],
    })) || [];

  return {
    id: generateId('disagreement', index),
    topic: backendDisagreement.proposition || 'Point of Disagreement',
    description:
      backendDisagreement.description ||
      backendDisagreement.proposition ||
      'A genuine disagreement based on differing values.',
    positions,
    moralFoundations: backendDisagreement.moralFoundations,
  };
}

/**
 * Transform backend common ground response to frontend CommonGroundAnalysis
 *
 * @param backendResponse - The raw response from the backend API
 * @param discussionId - The topic/discussion ID (may not be in response)
 * @returns CommonGroundAnalysis formatted for frontend components
 */
export function adaptCommonGroundResponse(
  backendResponse: BackendCommonGroundResponse,
  discussionId: string,
): CommonGroundAnalysis {
  return {
    id: backendResponse.id,
    discussionId,
    agreementZones: backendResponse.agreementZones.map(transformAgreementZone),
    misunderstandings: backendResponse.misunderstandings.map(transformMisunderstanding),
    disagreements: backendResponse.genuineDisagreements.map(transformDisagreement),
    lastUpdated:
      backendResponse.generatedAt || backendResponse.createdAt || new Date().toISOString(),
    participantCount: backendResponse.participantCountAtGeneration ?? 0,
    overallConsensusScore: Math.round(backendResponse.overallConsensusScore * 100), // Convert 0-1 to 0-100
  };
}

/**
 * Type guard to check if response is valid backend format
 */
export function isValidBackendResponse(response: unknown): response is BackendCommonGroundResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  return (
    typeof r['id'] === 'string' &&
    Array.isArray(r['agreementZones']) &&
    Array.isArray(r['misunderstandings']) &&
    Array.isArray(r['genuineDisagreements']) &&
    typeof r['overallConsensusScore'] === 'number'
  );
}
