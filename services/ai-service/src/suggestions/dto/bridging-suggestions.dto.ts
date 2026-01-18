import { IsNumber, IsString, IsArray } from 'class-validator';

/**
 * Individual bridging suggestion connecting different perspectives
 */
export class BridgingSuggestionDto {
  /**
   * ID of the proposition being bridged
   */
  propositionId!: string;

  /**
   * Source position/stance (e.g., "SUPPORT", "OPPOSE", "NUANCED")
   */
  sourcePosition!: string;

  /**
   * Target position/stance to bridge toward
   */
  targetPosition!: string;

  /**
   * Suggested language that bridges the perspectives
   */
  bridgingLanguage!: string;

  /**
   * Identified area of common ground between positions
   */
  commonGround!: string;

  /**
   * Explanation of why this bridging is valuable
   */
  reasoning!: string;

  /**
   * Confidence score for this suggestion (0-1)
   */
  @IsNumber()
  confidenceScore!: number;
}

/**
 * DTO for bridging suggestions response
 */
export class BridgingSuggestionsResponseDto {
  /**
   * The topic ID these suggestions are for
   */
  topicId!: string;

  /**
   * Array of bridging suggestions
   */
  @IsArray()
  suggestions!: BridgingSuggestionDto[];

  /**
   * Overall consensus score derived from propositions (0-1)
   */
  @IsNumber()
  overallConsensusScore!: number;

  /**
   * Areas where genuine disagreement exists
   */
  @IsArray()
  conflictAreas!: string[];

  /**
   * Areas where agreement/common ground exists
   */
  @IsArray()
  commonGroundAreas!: string[];

  /**
   * Overall confidence score for the analysis (0-1)
   */
  @IsNumber()
  confidenceScore!: number;

  /**
   * Reasoning for the overall analysis
   */
  @IsString()
  reasoning!: string;

  /**
   * AI attribution label
   */
  @IsString()
  attribution!: string;
}
