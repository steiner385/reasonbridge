/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FallacyDetection output schema contract (#407)
 *
 * Validates output from the Fallacy Detection service which identifies
 * logical fallacies in arguments and reasoning.
 */

import { z } from 'zod';
import { BaseAnalysisResultSchema } from './base.schema.js';

/**
 * Fallacy subtypes detected by the analyzer
 * Based on common logical fallacies in argumentation
 */
export const FallacySubtypeSchema = z.enum([
  'ad_hominem', // Attacking the person rather than the argument
  'straw_man', // Misrepresenting someone's argument to attack it
  'false_dichotomy', // Presenting only two options when more exist
  'appeal_to_authority', // Using authority as evidence without proper support
  'slippery_slope', // Assuming one event will lead to extreme outcomes
  'circular_reasoning', // Using the conclusion as a premise
  'red_herring', // Introducing irrelevant information to distract
  'hasty_generalization', // Drawing broad conclusions from limited examples
  'appeal_to_emotion', // Using emotions instead of logic
  'false_cause', // Assuming causation from correlation
]);

export type FallacySubtype = z.infer<typeof FallacySubtypeSchema>;

/**
 * Full FallacyDetection output schema
 */
export const FallacyDetectionSchema = BaseAnalysisResultSchema.extend({
  /** Type is always 'fallacy' for fallacy detection */
  type: z.literal('fallacy'),
  /** Specific type of fallacy detected */
  subtype: FallacySubtypeSchema,
  /** Optional: The specific text that contains the fallacy */
  fallacyText: z.string().optional(),
});

export type FallacyDetection = z.infer<typeof FallacyDetectionSchema>;

/**
 * Schema for an array of fallacy detection results
 */
export const FallacyDetectionArraySchema = z.array(FallacyDetectionSchema);

export type FallacyDetectionArray = z.infer<typeof FallacyDetectionArraySchema>;

/**
 * Validate a fallacy detection result
 * @param data - The data to validate
 * @returns Safe parse result with success/error information
 */
export function validateFallacyDetection(data: unknown) {
  return FallacyDetectionSchema.safeParse(data);
}

/**
 * Parse and validate a fallacy detection result, throwing on invalid data
 * @param data - The data to parse
 * @returns Validated FallacyDetection
 * @throws ZodError if validation fails
 */
export function parseFallacyDetection(data: unknown): FallacyDetection {
  return FallacyDetectionSchema.parse(data);
}

/**
 * Type guard for FallacyDetection
 */
export function isFallacyDetection(data: unknown): data is FallacyDetection {
  return FallacyDetectionSchema.safeParse(data).success;
}
