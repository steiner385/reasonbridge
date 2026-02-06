/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Common Ground types matching the backend CommonGroundResponseDto
 */

export type MoralFoundation =
  | 'care'
  | 'fairness'
  | 'loyalty'
  | 'authority'
  | 'sanctity'
  | 'liberty';

export interface AgreementZone {
  description: string;
  confidence: number;
  propositionIds: string[];
  participantPercentage: number;
}

export interface MisunderstandingInterpretation {
  definition: string;
  participantPercentage: number;
}

export interface Misunderstanding {
  term: string;
  interpretations: MisunderstandingInterpretation[];
  affectedPropositionIds: string[];
}

export interface GenuineDisagreement {
  description: string;
  underlyingValues: string[];
  moralFoundations: MoralFoundation[];
  propositionIds: string[];
}

export interface CommonGround {
  id: string;
  version: number;
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number;
  participantCountAtGeneration: number;
  responseCountAtGeneration: number;
  generatedAt: string;
}

export interface CommonGroundHistoryItem {
  version: number;
  generatedAt: string;
  overallConsensusScore: number;
  participantCount: number;
  responseCount: number;
  agreementZoneCount: number;
  misunderstandingCount: number;
  disagreementCount: number;
}
