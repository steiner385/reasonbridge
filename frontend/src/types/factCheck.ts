/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fact-check types for frontend components
 * Maps to backend DTOs from fact-check-service
 */

/**
 * Individual claim to check
 */
export interface Claim {
  /** The factual claim text to check */
  text: string;
  /** Start position in original response */
  startOffset: number;
  /** End position in original response */
  endOffset: number;
}

/**
 * Request to check claims
 */
export interface CheckClaimsRequest {
  /** Response ID containing the claims */
  responseId: string;
  /** Claims to check */
  claims: Claim[];
}

/**
 * Source of fact-check information
 */
export interface FactCheckSource {
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

/**
 * Fact-check result for a single claim
 */
export interface FactCheckResult {
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
  sources: FactCheckSource[];
  /** Whether sources have conflicting assessments */
  hasConflictingSources: boolean;
  /** Explanation of conflict if sources disagree */
  conflictSummary?: string;
  /** When this result expires (24h default) */
  expiresAt: string;
}

/**
 * Response from checking claims
 */
export interface CheckClaimsResponse {
  /** Fact-check results for each claim */
  results: FactCheckResult[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Status of a fact-check operation
 */
export type FactCheckStatus = 'idle' | 'loading' | 'success' | 'error' | 'no-results';

/**
 * Cached fact-check state for a response
 */
export interface FactCheckState {
  /** Current status */
  status: FactCheckStatus;
  /** Results if available */
  results?: FactCheckResult[];
  /** Error message if failed */
  error?: string;
  /** When the check was performed */
  checkedAt?: string;
}
