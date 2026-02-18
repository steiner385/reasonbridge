/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ToneAnalysis output schema contract (#405)
 *
 * Validates output from the Tone Analyzer service which detects
 * inflammatory language, personal attacks, hostile tone, and aggressive language.
 */

import { z } from 'zod';
import { BaseAnalysisResultSchema } from './base.schema.js';

/**
 * Tone analysis subtypes detected by the analyzer
 */
export const ToneSubtypeSchema = z.enum([
  'personal_attack', // Direct attacks on a person (e.g., "you're stupid")
  'hostile_tone', // Condescending or hostile phrasing (e.g., "obviously you don't understand")
  'aggressive_language', // Threatening or aggressive statements (e.g., "I hate you")
  'dismissive', // Dismissive generalizations (e.g., "typical liberal", "wake up sheeple")
]);

export type ToneSubtype = z.infer<typeof ToneSubtypeSchema>;

/**
 * Full ToneAnalysis output schema
 */
export const ToneAnalysisSchema = BaseAnalysisResultSchema.extend({
  /** Type is always 'inflammatory' for tone analysis */
  type: z.literal('inflammatory'),
  /** Specific subtype of inflammatory content detected */
  subtype: ToneSubtypeSchema,
});

export type ToneAnalysis = z.infer<typeof ToneAnalysisSchema>;

/**
 * Schema for an array of tone analysis results
 */
export const ToneAnalysisArraySchema = z.array(ToneAnalysisSchema);

export type ToneAnalysisArray = z.infer<typeof ToneAnalysisArraySchema>;

/**
 * Validate a tone analysis result
 * @param data - The data to validate
 * @returns Safe parse result with success/error information
 */
export function validateToneAnalysis(data: unknown) {
  return ToneAnalysisSchema.safeParse(data);
}

/**
 * Parse and validate a tone analysis result, throwing on invalid data
 * @param data - The data to parse
 * @returns Validated ToneAnalysis
 * @throws ZodError if validation fails
 */
export function parseToneAnalysis(data: unknown): ToneAnalysis {
  return ToneAnalysisSchema.parse(data);
}

/**
 * Type guard for ToneAnalysis
 */
export function isToneAnalysis(data: unknown): data is ToneAnalysis {
  return ToneAnalysisSchema.safeParse(data).success;
}
