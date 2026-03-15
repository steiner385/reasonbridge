/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared Types for LLM-Powered Generators
 */

// =============================================================================
// USER TYPES
// =============================================================================

export interface GeneratedUserPersona {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

// =============================================================================
// TOPIC TYPES
// =============================================================================

export type TopicStatus = 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
export type EngagementLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface GeneratedTopic {
  id: string;
  title: string;
  description: string;
  slug: string;
  creatorId: string;
  category: string;
  status: TopicStatus;
  tagIds: string[];
  crossCuttingThemes: string[];
  expectedEngagement: EngagementLevel;
  /** Index used for deterministic ID generation */
  topicIndex: number;
  /** Offset in days from base timestamp for created date */
  createdAtOffset: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export type ViewpointType = 'support' | 'oppose' | 'nuanced';

export interface CitedSource {
  url: string;
  title: string;
  author?: string;
}

export interface GeneratedResponse {
  id: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  viewpoint: ViewpointType;
  citedSources: CitedSource[];
}

// =============================================================================
// PROPOSITION TYPES
// =============================================================================

export type PropositionSource = 'AI_IDENTIFIED' | 'USER_CREATED';
export type PropositionStatus = 'ACTIVE' | 'MERGED' | 'ARCHIVED';

export interface GeneratedProposition {
  id: string;
  topicId: string;
  statement: string;
  source: PropositionSource;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number;
  status: PropositionStatus;
}

// =============================================================================
// COMMON GROUND TYPES
// =============================================================================

export interface AgreementZone {
  proposition: string;
  participantCount: number;
  supportingEvidence: string[];
  agreementPercentage: number;
}

export interface Interpretation {
  interpretation: string;
  participantCount: number;
}

export interface Misunderstanding {
  topic: string;
  clarification: string;
  interpretations: Interpretation[];
}

export interface Viewpoint {
  position: string;
  reasoning: string[];
  participantCount: number;
}

export interface GenuineDisagreement {
  proposition: string;
  viewpoints: Viewpoint[];
  underlyingValues: string[];
}

export interface GeneratedCommonGround {
  id: string;
  topicId: string;
  version: number;
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number;
  participantCountAtGeneration: number;
  responseCountAtGeneration: number;
  modelVersion: string;
}

// =============================================================================
// BRIDGING TYPES
// =============================================================================

export type BridgingType = 'reframe' | 'question' | 'shared_value' | 'compromise';
export type TargetAudience = 'support' | 'oppose' | 'both';

export interface GeneratedBridgingSuggestion {
  id: string;
  topicId: string;
  commonGroundAnalysisId: string;
  suggestionText: string;
  targetAudience: TargetAudience;
  relatedPropositionIds: string[];
  potentialCommonGround: string;
  confidenceScore: number;
  suggestionType: BridgingType;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface GenerationMetadata {
  generatedAt: string;
  modelVersion: string;
  topicCount: number;
  responseCount: number;
  propositionCount: number;
  commonGroundCount: number;
  bridgingCount: number;
  generationDurationMs: number;
  cacheVersion: number;
}

export interface CachedData {
  metadata: GenerationMetadata;
  topics: GeneratedTopic[];
  responses: GeneratedResponse[];
  propositions: GeneratedProposition[];
  commonGround: GeneratedCommonGround[];
  bridging: GeneratedBridgingSuggestion[];
}
