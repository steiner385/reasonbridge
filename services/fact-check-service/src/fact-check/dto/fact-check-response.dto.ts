/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response DTO for a fact-check source
 */
export class FactCheckSourceResponseDto {
  /** Name of the fact-checking source */
  source!: string;

  /** Title of the fact-check article */
  title!: string;

  /** URL to the full fact-check article */
  url!: string;

  /** Publication date of the fact-check (ISO string) */
  publishedAt!: string;

  /** Rating/verdict from the source */
  rating?: string;

  /** Brief excerpt or summary */
  excerpt?: string;

  /** Credibility score of the source (0-100) */
  sourceCredibility!: number;
}

/**
 * Response DTO for a fact-check result
 */
export class FactCheckResponseDto {
  /** The original claim that was checked */
  claimText!: string;

  /** Array of fact-check sources */
  sources!: FactCheckSourceResponseDto[];

  /** Whether sources have conflicting verdicts */
  hasConflictingSources!: boolean;

  /** When this result was fetched (ISO string) */
  checkedAt!: string;

  /** When this result expires (ISO string) */
  expiresAt!: string;

  /** Number of sources that checked this claim */
  sourceCount!: number;

  /** Top verdict based on highest credibility source */
  topVerdict?: string;
}

/**
 * Response DTO when no fact-checks are found
 */
export class NoFactCheckFoundResponseDto {
  /** The original claim that was checked */
  claimText!: string;

  /** Message indicating no fact-checks were found */
  message!: string;

  /** Suggestions for the user */
  suggestions!: string[];
}
