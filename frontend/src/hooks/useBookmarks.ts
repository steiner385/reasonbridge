/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useBookmarks - React Query hooks for managing response bookmarks
 *
 * Provides query and mutations for bookmarking responses,
 * with optimistic updates for instant UI feedback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarkService, type Bookmark, type BookmarkList } from '../services/bookmarkService';

/**
 * Options for useBookmarks hook
 */
export interface UseBookmarksOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
}

/**
 * Result of useBookmarks hook
 */
export interface UseBookmarksResult {
  /** List of bookmarks with pagination */
  bookmarks: Bookmark[];
  /** Total number of bookmarks */
  total: number;
  /** Current page limit */
  limit: number;
  /** Current page offset */
  offset: number;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query encountered an error */
  isError: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Refetch bookmarks */
  refetch: () => void;
}

/**
 * Hook for listing user's bookmarks with pagination
 *
 * @param limit - Number of bookmarks per page (default: 20)
 * @param offset - Starting offset (default: 0)
 * @param options - Optional configuration for the query
 * @returns Object with bookmark list and pagination info
 *
 * @remarks
 * **Features:**
 * - Paginated bookmark list with React Query caching
 * - Automatic refetch on bookmark changes
 * - Embedded response details for display
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { bookmarks, total, isLoading } = useBookmarks(20, 0);
 *
 * // Paginated
 * const [page, setPage] = useState(0);
 * const { bookmarks, total } = useBookmarks(20, page * 20);
 *
 * return (
 *   <div>
 *     {bookmarks.map(b => <BookmarkCard key={b.id} bookmark={b} />)}
 *     <Pagination total={total} page={page} onChange={setPage} />
 *   </div>
 * );
 * ```
 */
export function useBookmarks(
  limit: number = 20,
  offset: number = 0,
  options: UseBookmarksOptions = {},
): UseBookmarksResult {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const queryKey = ['bookmarks', { limit, offset }];

  const query = useQuery<BookmarkList, Error>({
    queryKey,
    queryFn: () => bookmarkService.getBookmarks(limit, offset),
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return {
    bookmarks: query.data?.bookmarks ?? [],
    total: query.data?.total ?? 0,
    limit: query.data?.limit ?? limit,
    offset: query.data?.offset ?? offset,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Options for useBookmarkStatus hook
 */
export interface UseBookmarkStatusOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Result of useBookmarkStatus hook
 */
export interface UseBookmarkStatusResult {
  /** Whether the response is bookmarked */
  isBookmarked: boolean;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether an operation is pending */
  isPending: boolean;
  /** Toggle bookmark state */
  toggleBookmark: () => void;
  /** Add bookmark */
  addBookmark: () => void;
  /** Remove bookmark */
  removeBookmark: () => void;
}

/**
 * Hook for checking and toggling bookmark status of a response
 *
 * @param responseId - The ID of the response to check/toggle
 * @param options - Optional configuration for the query
 * @returns Object with bookmark status and toggle functions
 *
 * @remarks
 * **Features:**
 * - Check if a response is bookmarked
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Invalidates bookmark list on change
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { isBookmarked, toggleBookmark, isPending } = useBookmarkStatus(responseId);
 *
 * return (
 *   <BookmarkButton
 *     isBookmarked={isBookmarked}
 *     onClick={toggleBookmark}
 *     disabled={isPending}
 *   />
 * );
 * ```
 *
 * @example
 * ```tsx
 * // In ResponseCard
 * const { isBookmarked, toggleBookmark } = useBookmarkStatus(response.id);
 *
 * return (
 *   <Card>
 *     <CardContent>{response.content}</CardContent>
 *     <CardActions>
 *       <button onClick={toggleBookmark}>
 *         {isBookmarked ? 'Unbookmark' : 'Bookmark'}
 *       </button>
 *     </CardActions>
 *   </Card>
 * );
 * ```
 */
export function useBookmarkStatus(
  responseId: string,
  options: UseBookmarkStatusOptions = {},
): UseBookmarkStatusResult {
  const queryClient = useQueryClient();
  const { enabled = true } = options;

  const queryKey = ['bookmarkStatus', responseId];

  // Query for bookmark status
  const query = useQuery<{ isBookmarked: boolean }, Error>({
    queryKey,
    queryFn: () => bookmarkService.getBookmarkStatus(responseId),
    enabled: enabled && !!responseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Context type for optimistic updates
  type MutationContext = { previousStatus: { isBookmarked: boolean } | undefined };

  // Add bookmark mutation
  const addMutation = useMutation<Bookmark, Error, void, MutationContext>({
    mutationFn: () => bookmarkService.addBookmark(responseId),

    // Optimistic update
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousStatus = queryClient.getQueryData<{ isBookmarked: boolean }>(queryKey);

      // Optimistically set as bookmarked
      queryClient.setQueryData<{ isBookmarked: boolean }>(queryKey, { isBookmarked: true });

      return { previousStatus };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(queryKey, context.previousStatus);
      }
    },

    // Invalidate bookmark list on success
    onSuccess: () => {
      // Invalidate all bookmark list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  // Remove bookmark mutation
  const removeMutation = useMutation<void, Error, void, MutationContext>({
    mutationFn: () => bookmarkService.removeBookmark(responseId),

    // Optimistic update
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousStatus = queryClient.getQueryData<{ isBookmarked: boolean }>(queryKey);

      // Optimistically set as not bookmarked
      queryClient.setQueryData<{ isBookmarked: boolean }>(queryKey, { isBookmarked: false });

      return { previousStatus };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(queryKey, context.previousStatus);
      }
    },

    // Invalidate bookmark list on success
    onSuccess: () => {
      // Invalidate all bookmark list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const isBookmarked = query.data?.isBookmarked ?? false;

  const toggleBookmark = () => {
    if (isBookmarked) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  return {
    isBookmarked,
    isLoading: query.isLoading,
    isPending: addMutation.isPending || removeMutation.isPending,
    toggleBookmark,
    addBookmark: addMutation.mutate,
    removeBookmark: removeMutation.mutate,
  };
}
