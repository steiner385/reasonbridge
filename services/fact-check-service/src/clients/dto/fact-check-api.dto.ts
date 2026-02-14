/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTOs for external fact-check API integration
 * Based on Google Fact Check Tools API response format
 */

/**
 * A publisher that created the fact-check article
 */
export interface ClaimReviewPublisher {
  name: string;
  site?: string;
}

/**
 * Rating information for a claim review
 */
export interface ClaimReviewRating {
  textualRating: string;
  ratingValue?: number;
  worstRating?: number;
  bestRating?: number;
  ratingExplanation?: string;
}

/**
 * A single claim review from a fact-checking organization
 */
export interface ClaimReview {
  publisher: ClaimReviewPublisher;
  url: string;
  title: string;
  reviewDate?: string;
  textualRating: string;
  languageCode?: string;
}

/**
 * A claim that has been fact-checked
 */
export interface FactCheckedClaim {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview: ClaimReview[];
}

/**
 * Response from Google Fact Check Tools API
 */
export interface GoogleFactCheckResponse {
  claims?: FactCheckedClaim[];
  nextPageToken?: string;
}

/**
 * Internal representation of a fact-check source
 */
export interface FactCheckSource {
  provider: string;
  url: string;
  title: string;
  publishedAt?: string;
  rating: string;
  ratingDescription?: string;
  credibilityScore?: number;
  retrievedAt: string;
}

/**
 * Internal representation of a fact-check result
 */
export interface FactCheckResultDto {
  claimText: string;
  sources: FactCheckSource[];
  hasConflictingSources: boolean;
  conflictSummary?: string;
}

/**
 * Configuration for the fact-check API client
 */
export interface FactCheckApiConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResultsPerQuery?: number;
}
