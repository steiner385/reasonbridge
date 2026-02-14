/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Result from a fact-check source
 */
export interface FactCheckSourceResult {
  /** Name of the fact-checking source (e.g., "Snopes", "PolitiFact") */
  source: string;
  /** Title of the fact-check article */
  title: string;
  /** URL to the full fact-check article */
  url: string;
  /** Publication date of the fact-check */
  publishedAt: Date;
  /** Rating/verdict from the source (e.g., "False", "Mostly True") */
  rating?: string;
  /** Brief excerpt or summary of the fact-check */
  excerpt?: string;
  /** Credibility score of the source (0-100) */
  sourceCredibility: number;
}

/**
 * Aggregated fact-check result for a claim
 */
export interface FactCheckResult {
  /** The original claim text that was checked */
  claimText: string;
  /** Array of fact-check sources that covered this claim */
  sources: FactCheckSourceResult[];
  /** Whether there are conflicting verdicts among sources */
  hasConflictingSources: boolean;
  /** Timestamp when this result was fetched */
  checkedAt: Date;
  /** When this result should be refreshed */
  expiresAt: Date;
}

/**
 * Request to check a claim
 */
export interface FactCheckRequest {
  /** The claim text to verify */
  claim: string;
  /** Optional language code (default: 'en') */
  languageCode?: string;
  /** Maximum number of results to return */
  maxResults?: number;
}

/**
 * Response from Google Fact Check API
 * @see https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims
 */
export interface GoogleFactCheckApiResponse {
  claims?: GoogleFactCheckClaim[];
  nextPageToken?: string;
}

export interface GoogleFactCheckClaim {
  text?: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: GoogleFactCheckReview[];
}

export interface GoogleFactCheckReview {
  publisher?: {
    name?: string;
    site?: string;
  };
  url?: string;
  title?: string;
  reviewDate?: string;
  textualRating?: string;
  languageCode?: string;
}

/**
 * Health status of a fact-check client
 */
export interface FactCheckClientHealth {
  /** Whether the client is ready to serve requests */
  isHealthy: boolean;
  /** Human-readable status message */
  message: string;
  /** Last successful API call timestamp */
  lastSuccessAt?: Date;
  /** Last error timestamp */
  lastErrorAt?: Date;
  /** Error count in the last hour */
  recentErrorCount: number;
}
