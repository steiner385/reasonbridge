/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T018 [US1] - TanStack Query hook for topic creation (Feature 016)
 *
 * Provides mutation for creating topics with:
 * - Error handling (including duplicate detection)
 * - Loading states
 * - Success callbacks
 * - Query invalidation for topic list refresh
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  topicService,
  type CreateTopicRequest,
  type Topic,
  type DuplicateSuggestion,
} from '../services/topicService';

export interface TopicCreationError extends Error {
  suggestions?: DuplicateSuggestion[];
}

export interface UseCreateTopicOptions {
  onSuccess?: (data: Topic) => void;
  onError?: (error: TopicCreationError) => void;
  onDuplicateDetected?: (suggestions: DuplicateSuggestion[]) => void;
}

/**
 * Hook for creating a new discussion topic
 *
 * @param options - Optional callbacks for success, error, and duplicate detection
 * @returns Mutation object with createTopic function and state
 *
 * @example
 * ```tsx
 * const { mutate: createTopic, isPending, error } = useCreateTopic({
 *   onSuccess: (topic) => {
 *     navigate(`/topics/${topic.id}`);
 *   },
 *   onDuplicateDetected: (suggestions) => {
 *     setDuplicates(suggestions);
 *     setShowDuplicateWarning(true);
 *   },
 * });
 *
 * // In form submit handler:
 * createTopic({
 *   title: 'Should we implement carbon taxes?',
 *   description: 'Carbon taxes are a policy tool...',
 *   tags: ['environment', 'policy', 'economics'],
 *   visibility: 'PUBLIC',
 * });
 * ```
 */
export function useCreateTopic(options?: UseCreateTopicOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTopicRequest) => topicService.createTopic(data),

    onSuccess: (newTopic) => {
      // Optimistically add the new topic to all topic list caches
      queryClient.setQueriesData<{ data: Topic[]; total: number; page: number; limit: number }>(
        { queryKey: ['topics'] },
        (oldData) => {
          if (!oldData) return oldData;

          // Add new topic at the beginning for immediate visibility
          return {
            ...oldData,
            data: [newTopic, ...oldData.data],
            total: oldData.total + 1,
          };
        },
      );

      // Also cache the individual topic for direct lookups
      queryClient.setQueryData(['topic', newTopic.id], newTopic);

      // Invalidate topic lists to trigger background refetch for accurate sorting
      queryClient.invalidateQueries({ queryKey: ['topics'] });

      // Call user-provided success callback
      options?.onSuccess?.(newTopic);
    },

    onError: (error: TopicCreationError) => {
      // Check if this is a duplicate detection error
      if (error.suggestions && error.suggestions.length > 0) {
        options?.onDuplicateDetected?.(error.suggestions);
      }

      // Call user-provided error callback
      options?.onError?.(error);
    },
  });
}
