/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AnalysisResult } from '../services/response-analyzer.service.js';

/**
 * Metadata stored alongside cached feedback in Qdrant
 */
export interface FeedbackMetadata {
  contentHash: string;
  feedbackType: string;
  subtype: string | null;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  topicId: string | null;
  createdAt: string;
}

/**
 * Cached feedback result with metadata
 */
export interface CachedFeedback {
  result: AnalysisResult;
  metadata: FeedbackMetadata;
  similarity?: number;
}

/**
 * Configuration for the semantic cache
 */
export interface SemanticCacheConfig {
  similarityThreshold: number;
  feedbackCacheTtl: number;
  embeddingCacheTtl: number;
  qdrantUrl: string;
  qdrantApiKey?: string;
  qdrantCollection: string;
  openaiApiKey: string;
  openaiModel: string;
}

/**
 * Result of a cache lookup operation
 */
export interface CacheLookupResult {
  hit: boolean;
  source: 'redis' | 'qdrant' | 'none';
  result?: AnalysisResult;
  similarity?: number;
}

/**
 * Hash utility function type
 */
export type ContentHashFn = (content: string) => string;
