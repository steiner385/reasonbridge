/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vector embedding constants.
 *
 * @remarks
 * Dimensions match the output of OpenAI's text-embedding-3-small model.
 * Changing this requires re-generating all stored embeddings.
 */
export const EMBEDDING = {
  /** Vector dimensions for text-embedding-3-small model */
  VECTOR_SIZE: 1536,
} as const;

/**
 * Cache TTL constants in seconds.
 *
 * @remarks
 * Embedding cache has longer TTL (7 days) since embeddings are deterministic.
 * Feedback cache is shorter (48 hours) since AI responses may vary.
 */
export const CACHE_TTL = {
  /** Embedding cache TTL in seconds (7 days) */
  EMBEDDING_SECONDS: 604800,
  /** Feedback/response cache TTL in seconds (48 hours) */
  FEEDBACK_SECONDS: 172800,
} as const;

/**
 * Database connection constants.
 *
 * @remarks
 * Retry delay starts at 2 seconds and increases exponentially.
 * Provides resilience against temporary database unavailability.
 */
export const DATABASE = {
  /** Initial retry delay for database connections (ms) */
  RETRY_DELAY_MS: 2000,
} as const;
