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

import { useQuery } from '@tanstack/react-query';
import { responseService } from '../services/responseService';
import type { ResponseDetail } from '../services/discussionService';

export interface UseResponsesOptions {
  enabled?: boolean;
  buildThreadTree?: boolean;
  refetchInterval?: number | false;
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
  const { enabled = true, buildThreadTree = false, refetchInterval = false } = options;

  return useQuery<ResponseDetail[], Error>({
    queryKey: ['responses', discussionId],
    queryFn: async () => {
      const responses = await responseService.getDiscussionResponses(discussionId);

      // Optionally build thread tree for nested display
      if (buildThreadTree) {
        return responseService.buildThreadTree(responses);
      }

      return responses;
    },
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
