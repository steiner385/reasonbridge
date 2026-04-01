/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cache TTL constants in milliseconds.
 *
 * @remarks
 * Topic lists are cached for 5 minutes to balance freshness with performance.
 * Individual topic details (including common ground analysis) are cached for 1 hour
 * since they change less frequently.
 */
export const CACHE_TTL = {
  /** 5 minutes - for paginated topic lists */
  TOPICS_LIST_MS: 5 * 60 * 1000,
  /** 1 hour - for individual topic details and common ground analysis */
  TOPIC_DETAIL_MS: 60 * 60 * 1000,
} as const;

/**
 * Response content constraints.
 *
 * @remarks
 * Minimum length ensures meaningful contributions.
 * Maximum length prevents abuse and ensures readability.
 * Citation limit prevents link spam while allowing adequate sourcing.
 */
export const RESPONSE_CONSTRAINTS = {
  /** Minimum response content length (characters) */
  MIN_LENGTH: 10,
  /** Maximum response content length (characters) */
  MAX_LENGTH: 10000,
  /** Maximum citations per response */
  MAX_CITATIONS: 10,
} as const;

/**
 * Search result display constraints.
 *
 * @remarks
 * Truncation lengths optimize search result display while
 * providing enough context for users to identify relevant content.
 */
export const SEARCH_DISPLAY = {
  /** Truncation length for topic descriptions in search results */
  DESCRIPTION_TRUNCATE_LENGTH: 200,
  /** Truncation length for response content in search results */
  CONTENT_TRUNCATE_LENGTH: 300,
} as const;

/**
 * Proposition constraints.
 *
 * @remarks
 * Propositions must be substantial enough to be meaningful (10 chars)
 * but concise enough to be clear (1000 chars).
 */
export const PROPOSITION_CONSTRAINTS = {
  /** Minimum proposition statement length (characters) */
  MIN_LENGTH: 10,
  /** Maximum proposition statement length (characters) */
  MAX_LENGTH: 1000,
} as const;

/**
 * Topic slug constraints.
 *
 * @remarks
 * Slugs must be readable and fit within URL constraints.
 * Maximum 250 chars leaves room for path prefixes.
 */
export const SLUG_CONSTRAINTS = {
  /** Minimum slug length (characters) */
  MIN_LENGTH: 3,
  /** Maximum slug length (characters) */
  MAX_LENGTH: 250,
} as const;
