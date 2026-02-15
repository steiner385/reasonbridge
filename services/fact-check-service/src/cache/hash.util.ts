/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';

/**
 * Normalize content for consistent hashing
 *
 * - Trim whitespace
 * - Convert to lowercase
 * - Collapse multiple spaces to single space
 */
export function normalizeContent(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Compute SHA-256 hash of normalized content
 *
 * Used as cache key for fact-check results
 */
export function computeContentHash(content: string): string {
  const normalized = normalizeContent(content);
  return createHash('sha256').update(normalized).digest('hex');
}
