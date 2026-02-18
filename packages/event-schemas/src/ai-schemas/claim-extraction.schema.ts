/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ClaimExtraction output schema contract (#408)
 *
 * Validates output from the Claim Extraction service which identifies
 * claims that need source citations or fact-checking.
 */

import { z } from 'zod';
import { BaseAnalysisResultSchema } from './base.schema.js';

/**
 * Claim extraction subtypes detected by the analyzer
 */
export const ClaimSubtypeSchema = z.enum([
  'factual_claim', // Statement of fact that can be verified
  'statistical_claim', // Claim involving numbers or statistics
  'causal_claim', // Claim about cause and effect relationships
  'predictive_claim', // Claim about future outcomes
  'comparative_claim', // Claim comparing two or more things
]);

export type ClaimSubtype = z.infer<typeof ClaimSubtypeSchema>;

/**
 * Schema for an extracted claim
 */
export const ExtractedClaimSchema = z.object({
  /** The claim text extracted from the content */
  claimText: z.string().min(1, 'Claim text is required'),
  /** Type of claim */
  claimType: ClaimSubtypeSchema,
  /** Whether this claim requires a citation */
  requiresCitation: z.boolean(),
  /** Suggested search terms for fact-checking */
  searchTerms: z.array(z.string()).optional(),
});

export type ExtractedClaim = z.infer<typeof ExtractedClaimSchema>;

/**
 * Full ClaimExtraction output schema
 */
export const ClaimExtractionSchema = BaseAnalysisResultSchema.extend({
  /** Type is always 'unsourced' for claim extraction */
  type: z.literal('unsourced'),
  /** Subtype indicating the nature of the unsourced content */
  subtype: ClaimSubtypeSchema,
  /** List of extracted claims from the content */
  extractedClaims: z.array(ExtractedClaimSchema).optional(),
});

export type ClaimExtraction = z.infer<typeof ClaimExtractionSchema>;

/**
 * Schema for an array of claim extraction results
 */
export const ClaimExtractionArraySchema = z.array(ClaimExtractionSchema);

export type ClaimExtractionArray = z.infer<typeof ClaimExtractionArraySchema>;

/**
 * Validate a claim extraction result
 * @param data - The data to validate
 * @returns Safe parse result with success/error information
 */
export function validateClaimExtraction(data: unknown) {
  return ClaimExtractionSchema.safeParse(data);
}

/**
 * Parse and validate a claim extraction result, throwing on invalid data
 * @param data - The data to parse
 * @returns Validated ClaimExtraction
 * @throws ZodError if validation fails
 */
export function parseClaimExtraction(data: unknown): ClaimExtraction {
  return ClaimExtractionSchema.parse(data);
}

/**
 * Type guard for ClaimExtraction
 */
export function isClaimExtraction(data: unknown): data is ClaimExtraction {
  return ClaimExtractionSchema.safeParse(data).success;
}
