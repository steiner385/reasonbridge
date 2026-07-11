/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared pagination contract for reasonBridge list endpoints.
 *
 * @remarks
 * List endpoints historically used three incompatible schemes and envelopes
 * (topics: `page`/`limit` + `{ data, meta }`; notifications: `limit`/`offset` +
 * flat `{ notifications, total }`; feed: `cursor`/`limit` + `{ activities,
 * nextCursor, hasMore }`), forcing bespoke client pagination per resource. This
 * module defines one canonical envelope plus helpers so new endpoints can adopt
 * a consistent shape and existing ones can migrate incrementally.
 *
 * @packageDocumentation
 */

/**
 * Canonical pagination metadata returned alongside a page of results.
 *
 * @remarks
 * `limit` is always echoed so clients know the page size that was applied.
 * `hasMore` is always computed server-side so clients never have to derive it.
 * Offset-based endpoints populate `total`/`page`/`totalPages`/`offset`;
 * cursor-based endpoints populate `nextCursor`. Fields not relevant to a given
 * scheme are simply omitted.
 */
export interface PaginationMeta {
  /** Page size that was applied to this response. */
  limit: number;
  /** Whether more results exist beyond this page. */
  hasMore: boolean;
  /** Total number of matching items (offset-based endpoints). */
  total?: number;
  /** Zero-based offset of this page (offset-based endpoints). */
  offset?: number;
  /** 1-based page number (page-based endpoints). */
  page?: number;
  /** Total number of pages (page-based endpoints). */
  totalPages?: number;
  /** Opaque cursor for fetching the next page (cursor-based endpoints). */
  nextCursor?: string | null;
}

/**
 * Canonical paginated response envelope: a `data` array plus `meta`.
 *
 * @typeParam T - The element type of the page.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Default page size when a client supplies none.
 */
export const DEFAULT_PAGE_LIMIT = 20;

/**
 * Hard upper bound on page size to protect the database.
 */
export const MAX_PAGE_LIMIT = 100;

/**
 * Safely coerce a raw query value into a positive integer, applying bounds.
 *
 * @remarks
 * Guards against the common bug where `parseInt(rawValue, 10)` yields `NaN`
 * (e.g. `?limit=abc`) or a negative number and that value flows unchecked into
 * `LIMIT`/`OFFSET` clauses or date arithmetic. On any invalid input the
 * provided fallback is returned.
 *
 * @param raw - Raw query value (string, number, or undefined)
 * @param fallback - Value to use when `raw` is missing or invalid
 * @param options - Optional inclusive `min`/`max` bounds to clamp the result
 * @returns A finite integer within `[min, max]`
 */
export function parsePositiveInt(
  raw: string | number | undefined | null,
  fallback: number,
  options: { min?: number; max?: number } = {},
): number {
  const { min = 1, max = Number.MAX_SAFE_INTEGER } = options;
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return Math.min(Math.max(fallback, min), max);
  }
  const floored = Math.floor(parsed);
  return Math.min(Math.max(floored, min), max);
}

/**
 * Normalize raw `limit`/`offset` query values into safe, bounded numbers.
 *
 * @param rawLimit - Raw `limit` query value
 * @param rawOffset - Raw `offset` query value
 * @param options - Optional default and maximum limit overrides
 * @returns Sanitized `{ limit, offset }`
 */
export function normalizeOffsetPagination(
  rawLimit: string | number | undefined | null,
  rawOffset: string | number | undefined | null,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): { limit: number; offset: number } {
  const { defaultLimit = DEFAULT_PAGE_LIMIT, maxLimit = MAX_PAGE_LIMIT } = options;
  const limit = parsePositiveInt(rawLimit, defaultLimit, { min: 1, max: maxLimit });
  const offset = parsePositiveInt(rawOffset, 0, { min: 0 });
  return { limit, offset };
}

/**
 * Build canonical {@link PaginationMeta} for an offset-based query.
 *
 * @param params - The applied `limit`/`offset` and matching `total`
 * @returns Metadata with `hasMore`, `page`, and `totalPages` computed
 */
export function buildOffsetMeta(params: {
  total: number;
  limit: number;
  offset: number;
}): PaginationMeta {
  const { total, limit, offset } = params;
  return {
    limit,
    offset,
    total,
    page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    hasMore: offset + limit < total,
  };
}
