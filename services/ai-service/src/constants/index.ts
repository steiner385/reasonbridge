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

/**
 * Default LLM configuration settings
 */
export const LLM_DEFAULTS = {
  /** Default max tokens for general completions */
  MAX_TOKENS: 4096,
  /** Default temperature for focused analysis (lower = more deterministic) */
  TEMPERATURE: 0.3,
} as const;

/**
 * LLM configuration presets for different use cases
 *
 * @remarks
 * Temperature ranges:
 * - 0.0-0.3: Precise, deterministic (analysis, classification)
 * - 0.4-0.6: Balanced (summarization, clarification)
 * - 0.7-1.0: Creative, varied (conversation, generation)
 */
export const LLM_PRESETS = {
  /** Minimal tokens for health checks */
  HEALTH_CHECK: {
    maxTokens: 5,
    temperature: 0,
  },
  /** Short responses for moderation */
  MODERATION: {
    maxTokens: 256,
    temperature: 0.2,
  },
  /** Short responses for clarification */
  CLARIFICATION: {
    maxTokens: 256,
    temperature: 0.3,
  },
  /** Medium responses for value/pattern analysis */
  VALUE_ANALYSIS: {
    maxTokens: 512,
    temperature: 0.2,
  },
  /** Medium responses for structured analysis */
  ANALYSIS: {
    maxTokens: 1024,
    temperature: 0.2,
  },
  /** Structured analysis with more detail */
  DETAILED_ANALYSIS: {
    maxTokens: 1024,
    temperature: 0.3,
  },
  /** Conversational responses */
  CONVERSATION: {
    maxTokens: 1024,
    temperature: 0.7,
  },
  /** Long-form content generation */
  GENERATION: {
    maxTokens: 2048,
    temperature: 0.2,
  },
  /** Creative generation with more variation */
  CREATIVE_GENERATION: {
    maxTokens: 2048,
    temperature: 0.8,
  },
  /** Feedback analysis */
  FEEDBACK: {
    maxTokens: 2048,
    temperature: 0.2,
  },
  /** Insights generation */
  INSIGHTS: {
    maxTokens: 2048,
    temperature: 0.2,
  },
  /** Topic quality analysis */
  TOPIC_QUALITY: {
    maxTokens: 1024,
    temperature: 0.2,
  },
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Maximum items in semantic cache */
  MAX_ITEMS: 1000,
  /** Qdrant search limit for similarity queries */
  SIMILARITY_SEARCH_LIMIT: 1,
} as const;

/**
 * Common ground synthesis thresholds
 */
export const SYNTHESIS_THRESHOLDS = {
  /** Minimum percentage to be considered significant support */
  SIGNIFICANT_SUPPORT: 0.25,
  /** Minimum percentage to be considered significant opposition */
  SIGNIFICANT_OPPOSITION: 0.25,
} as const;
