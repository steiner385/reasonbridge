/**
 * DTOs for demo reset endpoint
 */

import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Options for demo environment reset
 */
export class ResetOptionsDto {
  /**
   * If true, also clear Redis cache
   * Default: true
   */
  @IsOptional()
  @IsBoolean()
  clearCache?: boolean;

  /**
   * If true, also clear S3 demo uploads
   * Default: false
   */
  @IsOptional()
  @IsBoolean()
  clearUploads?: boolean;

  /**
   * If true, preserve user-created content during reset
   * Default: false
   */
  @IsOptional()
  @IsBoolean()
  preserveUserContent?: boolean;
}

/**
 * Result of a demo reset operation
 */
export class ResetResultDto {
  /** Whether the reset was successful */
  success: boolean;

  /** Time taken to reset in milliseconds */
  durationMs: number;

  /** Number of items deleted */
  deletedCounts: {
    users: number;
    topics: number;
    responses: number;
    propositions: number;
    alignments: number;
    commonGroundAnalyses: number;
    feedback: number;
  };

  /** Number of items re-seeded */
  seededCounts: {
    users: number;
    topics: number;
    responses: number;
    propositions: number;
    alignments: number;
    commonGroundAnalyses: number;
    feedback: number;
  };

  /** Status messages */
  messages: string[];

  /** Timestamp of reset */
  completedAt: string;
}
