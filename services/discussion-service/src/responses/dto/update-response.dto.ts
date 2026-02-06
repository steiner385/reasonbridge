/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTO for updating an existing response
 * Allows editing content and metadata of a response
 */
export class UpdateResponseDto {
  /**
   * Updated content of the response (10-10000 characters)
   */
  content?: string;

  /**
   * Array of cited source URLs
   */
  citedSources?: string[];

  /**
   * Whether the response contains opinion
   */
  containsOpinion?: boolean;

  /**
   * Whether the response contains factual claims
   */
  containsFactualClaims?: boolean;

  /**
   * IDs of propositions this response addresses
   */
  propositionIds?: string[];
}
