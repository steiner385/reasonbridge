/**
 * Type definitions for Common Ground Analysis functionality
 */

/**
 * A core proposition identified in the discussion
 */
export interface Proposition {
  id: string;
  text: string;
  agreementPercentage: number;
  supportingParticipants: string[];
  opposingParticipants: string[];
  neutralParticipants: string[];
}

/**
 * An agreement zone where multiple participants share common ground
 */
export interface AgreementZone {
  id: string;
  title: string;
  description: string;
  propositions: Proposition[];
  participantCount: number;
  consensusLevel: 'high' | 'medium' | 'low';
}

/**
 * A misunderstanding where participants use the same terms differently
 */
export interface Misunderstanding {
  id: string;
  term: string;
  definitions: Array<{
    definition: string;
    participants: string[];
  }>;
  clarificationSuggestion?: string;
}

/**
 * A genuine disagreement based on differing values or assumptions
 */
export interface Disagreement {
  id: string;
  topic: string;
  description: string;
  positions: Array<{
    stance: string;
    reasoning: string;
    participants: string[];
    underlyingValue?: string;
    underlyingAssumption?: string;
  }>;
  moralFoundations?: string[];
}

/**
 * Moral foundations framework (Haidt) dimensions
 */
export type MoralFoundation =
  | 'care-harm'
  | 'fairness-cheating'
  | 'loyalty-betrayal'
  | 'authority-subversion'
  | 'sanctity-degradation'
  | 'liberty-oppression';

/**
 * Analysis of moral foundations for a participant or position
 */
export interface MoralFoundationScore {
  foundation: MoralFoundation;
  score: number; // 0-100
  label: string;
}

/**
 * Complete common ground analysis for a discussion
 */
export interface CommonGroundAnalysis {
  id: string;
  discussionId: string;
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  disagreements: Disagreement[];
  moralFoundationProfiles?: Array<{
    participantId: string;
    participantName: string;
    scores: MoralFoundationScore[];
  }>;
  lastUpdated: Date | string;
  participantCount: number;
  overallConsensusScore: number; // 0-100
}

/**
 * Request to generate common ground analysis
 */
export interface GenerateCommonGroundRequest {
  discussionId: string;
  includePropositions?: boolean;
  includeMoralFoundations?: boolean;
}

/**
 * Response from common ground analysis endpoint
 */
export interface CommonGroundAnalysisResponse {
  analysis: CommonGroundAnalysis;
  status: 'complete' | 'processing' | 'failed';
  error?: string;
}
