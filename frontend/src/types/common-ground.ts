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

/**
 * Represents a viewpoint in a divergence point
 */
export interface DivergenceViewpoint {
  /**
   * The position or stance taken by this group
   */
  position: string;

  /**
   * Number of participants holding this viewpoint
   */
  participantCount: number;

  /**
   * Percentage of total participants (0-100)
   */
  percentage: number;

  /**
   * Supporting reasoning for this viewpoint
   */
  reasoning: string[];
}

/**
 * Represents a point where discussion viewpoints diverge
 */
export interface DivergencePoint {
  /**
   * The proposition where divergence occurs
   */
  proposition: string;

  /**
   * ID of the proposition (if applicable)
   */
  propositionId?: string;

  /**
   * Different viewpoints at this divergence point
   */
  viewpoints: DivergenceViewpoint[];

  /**
   * Measure of how polarized the divergence is (0.00-1.00)
   * 0 = no polarization (uniform distribution)
   * 1 = maximum polarization (binary split)
   */
  polarizationScore: number;

  /**
   * Total number of participants at this divergence point
   */
  totalParticipants: number;

  /**
   * Underlying values driving the divergence (if identified)
   */
  underlyingValues?: string[];
}

/**
 * Individual bridging suggestion connecting different perspectives
 */
export interface BridgingSuggestion {
  /**
   * ID of the proposition being bridged
   */
  propositionId: string;

  /**
   * Source position/stance (e.g., "SUPPORT", "OPPOSE", "NUANCED")
   */
  sourcePosition: string;

  /**
   * Target position/stance to bridge toward
   */
  targetPosition: string;

  /**
   * Suggested language that bridges the perspectives
   */
  bridgingLanguage: string;

  /**
   * Identified area of common ground between positions
   */
  commonGround: string;

  /**
   * Explanation of why this bridging is valuable
   */
  reasoning: string;

  /**
   * Confidence score for this suggestion (0-1)
   */
  confidenceScore: number;
}

/**
 * Response from bridging suggestions API endpoint
 */
export interface BridgingSuggestionsResponse {
  /**
   * The topic ID these suggestions are for
   */
  topicId: string;

  /**
   * Array of bridging suggestions
   */
  suggestions: BridgingSuggestion[];

  /**
   * Overall consensus score derived from propositions (0-1)
   */
  overallConsensusScore: number;

  /**
   * Areas where genuine disagreement exists
   */
  conflictAreas: string[];

  /**
   * Areas where agreement/common ground exists
   */
  commonGroundAreas: string[];

  /**
   * Overall confidence score for the analysis (0-1)
   */
  confidenceScore: number;

  /**
   * Reasoning for the overall analysis
   */
  reasoning: string;

  /**
   * AI attribution label
   */
  attribution: string;
}
