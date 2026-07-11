/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T047 [US2] - TanStack Query hook for response fetching (Feature 009)
 *
 * Provides query for fetching discussion responses with:
 * - Automatic caching
 * - Thread tree building
 * - Real-time refetching options
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { responseService } from '../services/responseService';
import type { ResponseDetail } from '../services/discussionService';

/**
 * Maximum number of responses to request in a single page.
 *
 * Matches the discussion-service clamp (max 500) and the virtual scroller's
 * advertised "500+ responses" capacity. Issue #1298: the backend previously
 * defaulted to 100 and silently dropped the newest activity, so we now request
 * the full page explicitly.
 */
export const RESPONSES_PAGE_LIMIT = 500;

export interface UseResponsesOptions {
  enabled?: boolean;
  buildThreadTree?: boolean;
  refetchInterval?: number | false;
  /** Maximum number of responses to fetch (default {@link RESPONSES_PAGE_LIMIT}). */
  limit?: number;
}

/**
 * Hook for fetching responses for a discussion
 *
 * @param discussionId - The ID of the discussion
 * @param options - Query options including thread tree building
 * @returns Query object with responses data and state
 *
 * @example
 * ```tsx
 * // Flat list of responses
 * const { data: responses, isLoading } = useResponses('discussion-123');
 *
 * // Threaded response tree
 * const { data: threadedResponses } = useResponses('discussion-123', {
 *   buildThreadTree: true,
 * });
 *
 * // With auto-refresh every 30 seconds
 * const { data: responses } = useResponses('discussion-123', {
 *   refetchInterval: 30000,
 * });
 * ```
 */
export function useResponses(discussionId: string, options: UseResponsesOptions = {}) {
  const {
    enabled = true,
    buildThreadTree = false,
    refetchInterval = false,
    limit = RESPONSES_PAGE_LIMIT,
  } = options;

  // Always cache the FLAT server response under a single canonical key
  // (['responses', discussionId, limit]) and derive the threaded shape with
  // `select`. Previously the queryFn returned either a flat array or a thread
  // tree depending on the option, while the queryKey ignored the option — so a
  // threaded consumer and a flat consumer collided on one cache entry and
  // poisoned each other. Deriving via `select` gives every consumer one shared
  // network fetch and keeps optimistic flat appends nesting correctly. See #1361.
  const select = useMemo(
    () =>
      buildThreadTree
        ? (responses: ResponseDetail[]): ResponseDetail[] =>
            responseService.buildThreadTree(responses)
        : undefined,
    [buildThreadTree],
  );

  return useQuery<ResponseDetail[], Error, ResponseDetail[]>({
    queryKey: ['responses', discussionId, limit],
    queryFn: () => responseService.getDiscussionResponses(discussionId, { limit }),
    select,
    enabled: enabled && !!discussionId,
    staleTime: 1 * 60 * 1000, // 1 minute - responses update frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval, // Optional polling for real-time updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
}

/**
 * Hook for accessing response count without fetching full data
 * Useful for displaying counts in discussion cards
 *
 * @param discussionId - The ID of the discussion
 * @returns Number of responses or undefined if not loaded
 */
export function useResponseCount(discussionId: string): number | undefined {
  const { data: responses } = useResponses(discussionId, { enabled: false });
  return responses?.length;
}
