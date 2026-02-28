/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useReactions - React Query hooks for managing response reactions
 *
 * Provides query and mutations for emoji reactions on responses,
 * with optimistic updates and WebSocket real-time sync.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reactionService,
  type ReactionList,
  type ReactionSummary,
} from '../services/reactionService';
import { useWebSocket } from './useWebSocket';

/**
 * Options for useReactions hook
 */
export interface UseReactionsOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 30 seconds) */
  staleTime?: number;
  /** Whether to subscribe to WebSocket updates (default: true) */
  subscribeToUpdates?: boolean;
}

/**
 * Result of useReactions hook
 */
export interface UseReactionsResult {
  /** List of reaction summaries grouped by emoji */
  reactions: ReactionSummary[];
  /** Total count of all reactions */
  totalCount: number;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query encountered an error */
  isError: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Whether a mutation is pending */
  isPending: boolean;
  /** Toggle a reaction (add if not reacted, remove if reacted) */
  toggleReaction: (emoji: string) => void;
  /** Add a reaction */
  addReaction: (emoji: string) => void;
  /** Remove a reaction */
  removeReaction: (emoji: string) => void;
  /** Check if user has reacted with a specific emoji */
  hasReacted: (emoji: string) => boolean;
  /** Get count for a specific emoji */
  getCount: (emoji: string) => number;
  /** Refetch reactions */
  refetch: () => void;
}

/**
 * Hook for managing reactions on a response
 *
 * @param responseId - The ID of the response to manage reactions for
 * @param options - Optional configuration for the query
 * @returns Object with reaction data and mutation functions
 *
 * @remarks
 * **Features:**
 * - Fetches and caches reaction data with React Query
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Real-time updates via WebSocket subscription
 * - Toggle function for easy reaction management
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { reactions, toggleReaction, isPending } = useReactions(responseId);
 *
 * return (
 *   <div className="flex gap-2">
 *     {reactions.map(r => (
 *       <button
 *         key={r.emoji}
 *         onClick={() => toggleReaction(r.emoji)}
 *         className={r.userReacted ? 'bg-blue-100' : ''}
 *       >
 *         {r.emoji} {r.count}
 *       </button>
 *     ))}
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // With emoji picker
 * const { reactions, toggleReaction, hasReacted } = useReactions(responseId);
 *
 * return (
 *   <>
 *     <ReactionBar reactions={reactions} onReactionClick={toggleReaction} />
 *     <EmojiPicker
 *       onSelect={(emoji) => toggleReaction(emoji)}
 *       selectedEmojis={reactions.filter(r => r.userReacted).map(r => r.emoji)}
 *     />
 *   </>
 * );
 * ```
 */
export function useReactions(
  responseId: string,
  options: UseReactionsOptions = {},
): UseReactionsResult {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const {
    enabled = true,
    staleTime = 30 * 1000, // 30 seconds
    subscribeToUpdates = true,
  } = options;

  const queryKey = useMemo(() => ['reactions', responseId], [responseId]);

  // Query for reaction data
  const query = useQuery<ReactionList, Error>({
    queryKey,
    queryFn: () => reactionService.getReactions(responseId),
    enabled: enabled && !!responseId,
    staleTime,
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!subscribeToUpdates || !responseId) return;

    // Subscribe to REACTION_ADDED events
    const unsubscribeAdded = subscribe('REACTION_ADDED', (message) => {
      if (message.payload.responseId === responseId) {
        // Invalidate query to refetch fresh data
        queryClient.invalidateQueries({ queryKey });
      }
    });

    // Subscribe to REACTION_REMOVED events
    const unsubscribeRemoved = subscribe('REACTION_REMOVED', (message) => {
      if (message.payload.responseId === responseId) {
        // Invalidate query to refetch fresh data
        queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => {
      unsubscribeAdded();
      unsubscribeRemoved();
    };
  }, [subscribe, responseId, queryClient, queryKey, subscribeToUpdates]);

  // Context type for optimistic updates
  type MutationContext = { previousData: ReactionList | undefined };

  // Add reaction mutation
  const addMutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: (emoji: string) => reactionService.addReaction(responseId, emoji),

    // Optimistic update
    onMutate: async (emoji: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousData = queryClient.getQueryData<ReactionList>(queryKey);

      // Optimistically update the data
      queryClient.setQueryData<ReactionList>(queryKey, (old) => {
        if (!old) {
          return {
            reactions: [{ emoji, count: 1, users: [], userReacted: true }],
            totalCount: 1,
          };
        }

        const existingReaction = old.reactions.find((r) => r.emoji === emoji);
        if (existingReaction) {
          // Update existing reaction
          return {
            reactions: old.reactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r,
            ),
            totalCount: old.totalCount + 1,
          };
        } else {
          // Add new reaction
          return {
            reactions: [...old.reactions, { emoji, count: 1, users: [], userReacted: true }],
            totalCount: old.totalCount + 1,
          };
        }
      });

      return { previousData };
    },

    // Rollback on error
    onError: (_error, _emoji, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    // Refetch after success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Remove reaction mutation
  const removeMutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: (emoji: string) => reactionService.removeReaction(responseId, emoji),

    // Optimistic update
    onMutate: async (emoji: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousData = queryClient.getQueryData<ReactionList>(queryKey);

      // Optimistically update the data
      queryClient.setQueryData<ReactionList>(queryKey, (old) => {
        if (!old) return { reactions: [], totalCount: 0 };

        const updatedReactions = old.reactions
          .map((r) => {
            if (r.emoji === emoji) {
              const newCount = r.count - 1;
              return newCount > 0 ? { ...r, count: newCount, userReacted: false } : null;
            }
            return r;
          })
          .filter((r): r is ReactionSummary => r !== null);

        return {
          reactions: updatedReactions,
          totalCount: Math.max(0, old.totalCount - 1),
        };
      });

      return { previousData };
    },

    // Rollback on error
    onError: (_error, _emoji, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    // Refetch after success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Helper to check if user has reacted with a specific emoji
  const hasReacted = useCallback(
    (emoji: string): boolean => {
      const reaction = query.data?.reactions.find((r) => r.emoji === emoji);
      return reaction?.userReacted ?? false;
    },
    [query.data?.reactions],
  );

  // Helper to get count for a specific emoji
  const getCount = useCallback(
    (emoji: string): number => {
      const reaction = query.data?.reactions.find((r) => r.emoji === emoji);
      return reaction?.count ?? 0;
    },
    [query.data?.reactions],
  );

  // Toggle reaction (add if not reacted, remove if reacted)
  const toggleReaction = useCallback(
    (emoji: string) => {
      if (hasReacted(emoji)) {
        removeMutation.mutate(emoji);
      } else {
        addMutation.mutate(emoji);
      }
    },
    [hasReacted, addMutation, removeMutation],
  );

  return {
    reactions: query.data?.reactions ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isPending: addMutation.isPending || removeMutation.isPending,
    toggleReaction,
    addReaction: addMutation.mutate,
    removeReaction: removeMutation.mutate,
    hasReacted,
    getCount,
    refetch: query.refetch,
  };
}
