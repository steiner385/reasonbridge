/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T030 [US1] - TanStack Query hook for discussion creation (Feature 009)
 *
 * Provides mutation for creating discussions with:
 * - Error handling
 * - Loading states
 * - Success callbacks
 * - Query invalidation for discussion list refresh
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  discussionService,
  type CreateDiscussionRequest,
  type DiscussionDetail,
} from '../services/discussionService';

export interface UseCreateDiscussionOptions {
  onSuccess?: (data: DiscussionDetail) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for creating a new discussion
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation object with createDiscussion function and state
 *
 * @example
 * ```tsx
 * const { mutate: createDiscussion, isPending, error } = useCreateDiscussion({
 *   onSuccess: (discussion) => {
 *     navigate(`/discussions/${discussion.id}`);
 *   },
 * });
 *
 * // In form submit handler:
 * createDiscussion({
 *   topicId: 'topic-123',
 *   title: 'Should we implement carbon taxes?',
 *   initialResponse: {
 *     content: 'I believe...',
 *     citations: [{ url: 'https://example.com' }],
 *   },
 * });
 * ```
 */
export function useCreateDiscussion(options?: UseCreateDiscussionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiscussionRequest) => discussionService.createDiscussion(data),

    onSuccess: (data) => {
      // Invalidate discussion list queries to show the new discussion
      queryClient.invalidateQueries({ queryKey: ['discussions'] });

      // Optionally invalidate topic-specific queries
      if (data.topicId) {
        queryClient.invalidateQueries({ queryKey: ['discussions', { topicId: data.topicId }] });
      }

      // Call user-provided success callback
      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      // Call user-provided error callback
      options?.onError?.(error);
    },
  });
}
