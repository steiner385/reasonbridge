/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsArray, IsNumber, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a candidate topic to check for duplicates
 */
export class DuplicateCandidateDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  trigramScore!: number;
}

/**
 * DTO for checking topic duplicates request
 */
export class CheckDuplicatesDto {
  /**
   * Title of the new topic being created
   */
  @IsString()
  title!: string;

  /**
   * Description of the new topic being created
   */
  @IsString()
  description!: string;

  /**
   * Candidate topics flagged by trigram matching
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DuplicateCandidateDto)
  candidates!: DuplicateCandidateDto[];
}

/**
 * Result for a single topic similarity analysis
 */
export interface SemanticSimilarityResultDto {
  /** Topic ID */
  id: string;

  /** Topic title */
  title: string;

  /** Topic description (truncated) */
  description: string;

  /** Trigram similarity score (0-1) */
  trigramScore: number;

  /** Semantic similarity score (0-1) */
  semanticScore: number;

  /** Combined similarity score (0-1) */
  combinedScore: number;

  /** Type of matching used */
  matchType: 'semantic' | 'trigram';
}

/**
 * Response DTO for duplicate detection
 */
export interface DuplicateDetectionResultDto {
  /** Whether duplicates were detected above threshold */
  hasDuplicates: boolean;

  /** Similarity results for each candidate */
  results: SemanticSimilarityResultDto[];

  /** Threshold used for duplicate detection */
  threshold: number;

  /** Analysis method used */
  analysisMethod: 'semantic' | 'trigram-only';
}

/**
 * Response DTO for availability check
 */
export interface SemanticAvailabilityDto {
  /** Whether semantic analysis is available */
  available: boolean;

  /** Reason if unavailable */
  reason?: string;
}
