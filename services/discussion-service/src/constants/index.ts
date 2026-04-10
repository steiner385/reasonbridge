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
  STATEMENT_MIN_LENGTH: 10,
  /** Maximum proposition statement length (characters) */
  STATEMENT_MAX_LENGTH: 1000,
  /** Default number of propositions to return */
  DEFAULT_LIMIT: 100,
  /** Maximum number of propositions to return */
  MAX_LIMIT: 500,
} as const;

/**
 * Rate limiting configuration.
 */
export const RATE_LIMITS = {
  /** TTL window for proposition creation rate limit (ms) - 1 hour */
  PROPOSITION_CREATE_TTL_MS: 60 * 60 * 1000,
  /** Maximum propositions per hour per user */
  PROPOSITION_CREATE_LIMIT: 20,
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

/**
 * HTTP client timeout constants in milliseconds.
 *
 * @remarks
 * Different services have different timeout requirements:
 * - AI service: 5 seconds (faster for simple operations)
 * - Activity/Moderation: 30 seconds (may involve more processing)
 */
export const CLIENT_TIMEOUTS = {
  /** Timeout for AI service calls (ms) */
  AI_SERVICE_MS: 5000,
  /** Default timeout for inter-service HTTP calls (ms) */
  DEFAULT_MS: 30000,
} as const;

/**
 * Link preview constants.
 *
 * @remarks
 * Link previews are cached for 24 hours since metadata changes infrequently.
 * 10 second fetch timeout prevents slow external sites from blocking responses.
 */
export const LINK_PREVIEW = {
  /** Cache TTL for link previews (ms) - 24 hours */
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  /** Timeout for fetching external URLs (ms) */
  FETCH_TIMEOUT_MS: 10000,
} as const;

/**
 * Search cache constants.
 *
 * @remarks
 * Search results cached for 5 minutes to balance freshness with performance.
 */
export const SEARCH_CACHE = {
  /** Default TTL for search results (ms) - 5 minutes */
  DEFAULT_TTL_MS: 5 * 60 * 1000,
} as const;

/**
 * URL validation constants.
 *
 * @remarks
 * Maximum URL length prevents abuse while allowing for long query strings.
 */
export const URL_VALIDATION = {
  /** Maximum URL length (characters) */
  MAX_LENGTH: 2048,
} as const;

/**
 * Database connection constants.
 *
 * @remarks
 * Retry delay starts at 2 seconds and increases exponentially.
 */
export const DATABASE = {
  /** Initial retry delay for database connections (ms) */
  RETRY_DELAY_MS: 2000,
} as const;
