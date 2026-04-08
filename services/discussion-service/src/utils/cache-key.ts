/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';

/**
 * Generate a deterministic cache key from a prefix and parameters.
 *
 * Solves the problem of JSON.stringify() producing different strings for
 * semantically identical objects when property order differs.
 *
 * @remarks
 * - Keys are sorted recursively for consistent serialization
 * - Uses SHA-256 hash truncated to 16 characters (sufficient for cache keys)
 * - Handles nested objects and arrays
 *
 * @param prefix - Cache key prefix (e.g., 'topics:list')
 * @param params - Query parameters or any object to hash
 * @returns Deterministic cache key in format `{prefix}:{hash}`
 *
 * @example
 * ```typescript
 * // These produce the SAME cache key (property order doesn't matter)
 * generateCacheKey('topics:list', { page: 1, limit: 20 });
 * generateCacheKey('topics:list', { limit: 20, page: 1 });
 * // => 'topics:list:a1b2c3d4e5f6g7h8'
 * ```
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = sortObjectKeys(params);
  const serialized = JSON.stringify(sorted);

  const hash = createHash('sha256').update(serialized).digest('hex').substring(0, 16);

  return `${prefix}:${hash}`;
}

/**
 * Recursively sort object keys for deterministic serialization.
 *
 * @param obj - Object to sort
 * @returns New object with sorted keys
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();

    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }

    return sorted;
  }

  return obj;
}
