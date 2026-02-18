/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Analyzer Output Schema Contracts
 *
 * This module exports Zod schemas for validating AI analyzer outputs.
 * Each schema corresponds to a specific analyzer type and provides:
 * - Runtime validation
 * - Type inference
 * - Type guards
 * - Parse functions (safe and throwing)
 */

// Base schema components
export {
  BaseAnalysisResultSchema,
  ConfidenceScoreSchema,
  EducationalResourceSchema,
  EducationalResourcesSchema,
  FeedbackTypeSchema,
  safeParseAnalysis,
  type BaseAnalysisResult,
  type EducationalResource,
  type EducationalResources,
  type FeedbackType,
} from './base.schema.js';

// ToneAnalysis schema (#405)
export {
  isToneAnalysis,
  parseToneAnalysis,
  ToneAnalysisArraySchema,
  ToneAnalysisSchema,
  ToneSubtypeSchema,
  validateToneAnalysis,
  type ToneAnalysis,
  type ToneAnalysisArray,
  type ToneSubtype,
} from './tone-analysis.schema.js';

// BiasAnalysis schema (#406)
export {
  BiasAnalysisArraySchema,
  BiasAnalysisSchema,
  BiasSubtypeSchema,
  isBiasAnalysis,
  parseBiasAnalysis,
  validateBiasAnalysis,
  type BiasAnalysis,
  type BiasAnalysisArray,
  type BiasSubtype,
} from './bias-analysis.schema.js';

// FallacyDetection schema (#407)
export {
  FallacyDetectionArraySchema,
  FallacyDetectionSchema,
  FallacySubtypeSchema,
  isFallacyDetection,
  parseFallacyDetection,
  validateFallacyDetection,
  type FallacyDetection,
  type FallacyDetectionArray,
  type FallacySubtype,
} from './fallacy-detection.schema.js';

// ClaimExtraction schema (#408)
export {
  ClaimExtractionArraySchema,
  ClaimExtractionSchema,
  ClaimSubtypeSchema,
  ExtractedClaimSchema,
  isClaimExtraction,
  parseClaimExtraction,
  validateClaimExtraction,
  type ClaimExtraction,
  type ClaimExtractionArray,
  type ClaimSubtype,
  type ExtractedClaim,
} from './claim-extraction.schema.js';
