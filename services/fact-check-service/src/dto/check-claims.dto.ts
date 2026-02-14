/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Request to check claims for fact-check information
 * T254: POST /fact-check/check endpoint
 */
export interface CheckClaimsRequestDto {
  /** Response ID containing the claims */
  responseId: string;
  /** Claims to check */
  claims: ClaimDto[];
}

/**
 * Individual claim to check
 */
export interface ClaimDto {
  /** The factual claim text to check */
  text: string;
  /** Start position in original response */
  startOffset: number;
  /** End position in original response */
  endOffset: number;
}

/**
 * Response from checking claims
 */
export interface CheckClaimsResponseDto {
  /** Fact-check results for each claim */
  results: FactCheckResultDto[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Fact-check result for a single claim
 */
export interface FactCheckResultDto {
  /** Unique identifier for this result */
  id: string;
  /** The original claim text that was checked */
  claimText: string;
  /** Start position in original response */
  claimStartOffset?: number;
  /** End position in original response */
  claimEndOffset?: number;
  /** UI label - always "Related Context" per FR-012b */
  displayedAs: string;
  /** Array of fact-check sources */
  sources: FactCheckSourceDto[];
  /** Whether sources have conflicting assessments */
  hasConflictingSources: boolean;
  /** Explanation of conflict if sources disagree */
  conflictSummary?: string;
  /** When this result expires (24h default) */
  expiresAt: string;
}

/**
 * Source of fact-check information
 */
export interface FactCheckSourceDto {
  /** Fact-check provider name */
  provider: string;
  /** URL to the fact-check article */
  url: string;
  /** Title of the fact-check article */
  title: string;
  /** When the fact-check was published */
  publishedAt?: string;
  /** Rating from the provider (passed through, not interpreted) */
  rating?: string;
  /** Full description of the rating */
  ratingDescription?: string;
  /** Credibility score of the source (0-1) */
  credibilityScore: number;
  /** When this result was retrieved */
  retrievedAt: string;
}
