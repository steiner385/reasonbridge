/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

/**
 * Represents a zone of agreement between participants
 */
export interface AgreementZone {
  /**
   * The proposition or claim where agreement exists
   */
  proposition: string;

  /**
   * Percentage of participants who agree (0-100)
   */
  agreementPercentage: number;

  /**
   * Supporting evidence or reasoning
   */
  supportingEvidence: string[];

  /**
   * Number of participants in agreement
   */
  participantCount: number;
}

/**
 * Represents a misunderstanding between participants
 */
export interface Misunderstanding {
  /**
   * The topic or term that is misunderstood
   */
  topic: string;

  /**
   * Different interpretations of the same concept
   */
  interpretations: {
    interpretation: string;
    participantCount: number;
  }[];

  /**
   * Suggested clarification to resolve the misunderstanding
   */
  clarification: string;
}

/**
 * Represents a genuine disagreement between participants
 */
export interface GenuineDisagreement {
  /**
   * The proposition or claim where disagreement exists
   */
  proposition: string;

  /**
   * Different viewpoints on this disagreement
   */
  viewpoints: {
    position: string;
    participantCount: number;
    reasoning: string[];
  }[];

  /**
   * Underlying values or assumptions driving the disagreement
   */
  underlyingValues: string[];
}

/**
 * DTO for requesting common ground analysis
 */
export class CommonGroundAnalysisRequestDto {
  /**
   * ID of the topic to analyze
   */
  @IsUUID()
  @IsNotEmpty()
  topicId!: string;

  /**
   * Optional version to regenerate (defaults to creating new version)
   */
  @IsOptional()
  version?: number;
}

/**
 * DTO for common ground analysis response
 */
export class CommonGroundAnalysisResponseDto {
  /**
   * Unique identifier for this analysis
   */
  id!: string;

  /**
   * ID of the analyzed topic
   */
  topicId!: string;

  /**
   * Version of this analysis (increments with each generation)
   */
  version!: number;

  /**
   * Zones where participants agree
   */
  agreementZones!: AgreementZone[];

  /**
   * Identified misunderstandings between participants
   */
  misunderstandings!: Misunderstanding[];

  /**
   * Genuine disagreements (not based on misunderstanding)
   */
  genuineDisagreements!: GenuineDisagreement[];

  /**
   * Overall consensus score (0.00-1.00)
   * Null if insufficient data to calculate
   */
  overallConsensusScore!: number | null;

  /**
   * Number of participants when analysis was generated
   */
  participantCountAtGeneration!: number;

  /**
   * Number of responses when analysis was generated
   */
  responseCountAtGeneration!: number;

  /**
   * AI model version used for analysis
   */
  modelVersion!: string;

  /**
   * When this analysis was created
   */
  createdAt!: Date;

  /**
   * AI attribution label
   */
  attribution!: string;
}
