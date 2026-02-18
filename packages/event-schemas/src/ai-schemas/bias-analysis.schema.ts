/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BiasAnalysis output schema contract (#406)
 *
 * Validates output from the Bias Analyzer service which detects
 * cognitive biases such as confirmation bias and System 1 thinking patterns.
 */

import { z } from 'zod';
import { BaseAnalysisResultSchema } from './base.schema.js';

/**
 * Bias analysis subtypes detected by the analyzer
 */
export const BiasSubtypeSchema = z.enum([
  'confirmation_bias', // Selective attention to confirming evidence
  'system1_thinking', // Intuitive responses without deliberation
  'anchoring_bias', // Over-reliance on first piece of information
  'availability_bias', // Overweighting easily recalled information
]);

export type BiasSubtype = z.infer<typeof BiasSubtypeSchema>;

/**
 * Full BiasAnalysis output schema
 */
export const BiasAnalysisSchema = BaseAnalysisResultSchema.extend({
  /** Type is always 'bias' for bias analysis */
  type: z.literal('bias'),
  /** Specific subtype of bias detected */
  subtype: BiasSubtypeSchema,
});

export type BiasAnalysis = z.infer<typeof BiasAnalysisSchema>;

/**
 * Schema for an array of bias analysis results
 */
export const BiasAnalysisArraySchema = z.array(BiasAnalysisSchema);

export type BiasAnalysisArray = z.infer<typeof BiasAnalysisArraySchema>;

/**
 * Validate a bias analysis result
 * @param data - The data to validate
 * @returns Safe parse result with success/error information
 */
export function validateBiasAnalysis(data: unknown) {
  return BiasAnalysisSchema.safeParse(data);
}

/**
 * Parse and validate a bias analysis result, throwing on invalid data
 * @param data - The data to parse
 * @returns Validated BiasAnalysis
 * @throws ZodError if validation fails
 */
export function parseBiasAnalysis(data: unknown): BiasAnalysis {
  return BiasAnalysisSchema.parse(data);
}

/**
 * Type guard for BiasAnalysis
 */
export function isBiasAnalysis(data: unknown): data is BiasAnalysis {
  return BiasAnalysisSchema.safeParse(data).success;
}
