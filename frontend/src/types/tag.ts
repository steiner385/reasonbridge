/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tag types for Topic Creation Wizard
 * Feature 016: Topic Management - T229 Tag Selector
 */

/**
 * Tag entity returned from the API
 */
export interface Tag {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Number of topics using this tag */
  usageCount?: number;
}

/**
 * Validation state for tag selection
 */
export interface TagValidation {
  /** Whether current selection is valid */
  isValid: boolean;
  /** Error message if invalid */
  error: string | null;
  /** Number of tags currently selected */
  tagCount: number;
  /** Minimum tags required */
  minTags: number;
  /** Maximum tags allowed */
  maxTags: number;
}

/**
 * Result from tag search API
 */
export interface TagSearchResult {
  /** Matching tags */
  tags: Tag[];
  /** Total count of matches (for pagination) */
  total: number;
}

/**
 * Options for creating a new tag
 */
export interface CreateTagOption {
  /** The new tag name to create */
  name: string;
  /** Flag indicating this is a create option */
  isCreateOption: true;
}

/**
 * Union type for dropdown options (existing tag or create new)
 */
export type TagOption = Tag | CreateTagOption;

/**
 * Type guard to check if option is a create tag option
 */
export function isCreateTagOption(option: TagOption): option is CreateTagOption {
  return 'isCreateOption' in option && option.isCreateOption === true;
}
