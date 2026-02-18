/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base schema components shared across AI analyzer output contracts
 */

import { z } from 'zod';

/**
 * Schema for educational resource links
 */
export const EducationalResourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
});

export type EducationalResource = z.infer<typeof EducationalResourceSchema>;

/**
 * Schema for an array of educational resources
 */
export const EducationalResourcesSchema = z.array(EducationalResourceSchema);

export type EducationalResources = z.infer<typeof EducationalResourcesSchema>;

/**
 * Feedback type enum matching the existing FeedbackType in the AI service
 */
export const FeedbackTypeSchema = z.enum([
  'fallacy',
  'inflammatory',
  'unsourced',
  'bias',
  'affirmation',
]);

export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;

/**
 * Confidence score schema (0.00 to 1.00)
 */
export const ConfidenceScoreSchema = z
  .number()
  .min(0, 'Confidence score must be at least 0')
  .max(1, 'Confidence score must be at most 1');

/**
 * Base analysis result schema with common fields
 * Extended by specific analyzer schemas
 */
export const BaseAnalysisResultSchema = z.object({
  /** User-facing suggestion text */
  suggestionText: z.string().min(1, 'Suggestion text is required'),
  /** AI reasoning for transparency */
  reasoning: z.string().min(1, 'Reasoning is required'),
  /** Confidence score (0.00-1.00) */
  confidenceScore: ConfidenceScoreSchema,
  /** Optional educational resources */
  educationalResources: EducationalResourcesSchema.optional(),
});

export type BaseAnalysisResult = z.infer<typeof BaseAnalysisResultSchema>;

/**
 * Helper function to safely parse analysis results
 * Returns a discriminated result object with success/error information
 */
export function safeParseAnalysis<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  return schema.safeParse(data);
}
