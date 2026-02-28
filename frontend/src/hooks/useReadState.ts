/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useReadState - React Query hook for managing topic read state
 *
 * Provides query and mutation for tracking which responses
 * a user has seen in a topic, enabling "new messages" indicators.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readStateService, type ReadState } from '../services/readStateService';

export interface UseReadStateOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
}

export interface UseReadStateResult {
  /** Current read state data */
  readState: ReadState | null | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query encountered an error */
  isError: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Update the read state */
  updateReadState: (lastResponseId?: string) => void;
  /** Whether the update mutation is pending */
  isUpdating: boolean;
  /** Mark the topic as fully read */
  markAsRead: (lastResponseId?: string) => void;
}

/**
 * Hook for managing read state of a topic
 *
 * @param topicId - The ID of the topic to track read state for
 * @param options - Optional configuration for the query
 * @returns Object with read state data and mutation functions
 *
 * @remarks
 * **Features:**
 * - Cached read state with React Query
 * - Optimistic updates for immediate UI feedback
 * - Automatic invalidation on update
 *
 * **Usage:**
 * - Fetch read state on topic mount to position "new messages" divider
 * - Update read state when user scrolls past new responses
 * - Mark as read when user leaves the topic
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { readState, updateReadState, isLoading } = useReadState(topicId);
 *
 * // Position new messages divider
 * const lastReadResponseId = readState?.lastResponseId;
 *
 * // Update when user views new responses
 * useEffect(() => {
 *   if (lastVisibleResponseId) {
 *     updateReadState(lastVisibleResponseId);
 *   }
 * }, [lastVisibleResponseId]);
 * ```
 *
 * @example
 * ```tsx
 * // Mark as fully read on unmount
 * const { markAsRead } = useReadState(topicId);
 *
 * useEffect(() => {
 *   return () => {
 *     if (latestResponseId) {
 *       markAsRead(latestResponseId);
 *     }
 *   };
 * }, [latestResponseId, markAsRead]);
 * ```
 */
export function useReadState(
  topicId: string,
  options: UseReadStateOptions = {},
): UseReadStateResult {
  const queryClient = useQueryClient();
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const queryKey = ['readState', topicId];

  // Query for fetching read state
  const query = useQuery<ReadState | null, Error>({
    queryKey,
    queryFn: () => readStateService.getReadState(topicId),
    enabled: enabled && !!topicId,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    // Don't refetch on window focus - read state doesn't change externally
    refetchOnWindowFocus: false,
  });

  // Context type for optimistic updates
  type MutationContext = { previousReadState: ReadState | null | undefined };

  // Mutation for updating read state
  const mutation = useMutation<ReadState, Error, string | undefined, MutationContext>({
    mutationFn: (lastResponseId?: string) =>
      readStateService.updateReadState(topicId, lastResponseId),

    // Optimistic update
    onMutate: async (lastResponseId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousReadState = queryClient.getQueryData<ReadState | null>(queryKey);

      // Optimistically update
      if (previousReadState) {
        queryClient.setQueryData<ReadState>(queryKey, {
          ...previousReadState,
          lastReadAt: new Date().toISOString(),
          lastResponseId: lastResponseId ?? previousReadState.lastResponseId,
        });
      } else {
        // Create optimistic read state for new entry
        queryClient.setQueryData<ReadState>(queryKey, {
          userId: 'current-user', // Will be replaced by server
          topicId,
          lastReadAt: new Date().toISOString(),
          lastResponseId: lastResponseId ?? null,
        });
      }

      return { previousReadState };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.previousReadState !== undefined) {
        queryClient.setQueryData(queryKey, context.previousReadState);
      }
    },

    // Invalidate on success to ensure consistency
    onSuccess: (data) => {
      queryClient.setQueryData<ReadState>(queryKey, data);
    },
  });

  return {
    readState: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateReadState: mutation.mutate,
    isUpdating: mutation.isPending,
    markAsRead: mutation.mutate,
  };
}

/**
 * Hook to check if a response is unread
 *
 * @param topicId - The topic ID
 * @param responseCreatedAt - ISO timestamp of when the response was created
 * @returns Whether the response is unread (created after lastReadAt)
 *
 * @example
 * ```tsx
 * const isUnread = useIsResponseUnread(topicId, response.createdAt);
 *
 * return (
 *   <div className={isUnread ? 'bg-blue-50' : ''}>
 *     <ResponseCard response={response} />
 *   </div>
 * );
 * ```
 */
export function useIsResponseUnread(topicId: string, responseCreatedAt: string): boolean {
  const { readState } = useReadState(topicId, { enabled: !!topicId });

  if (!readState?.lastReadAt) {
    // No read state means user hasn't visited - all responses are "new"
    // But we show divider based on first visit, so return false
    return false;
  }

  return new Date(responseCreatedAt) > new Date(readState.lastReadAt);
}
