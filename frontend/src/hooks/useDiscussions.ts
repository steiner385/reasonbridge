/**
 * T031 [US1] - TanStack Query hook for discussion listing (Feature 009)
 *
 * Provides query for fetching discussions with:
 * - Pagination support
 * - Filtering by topic and status
 * - Sorting options
 * - Automatic caching and refetching
 */

import { useQuery } from '@tanstack/react-query';
import {
  discussionService,
  type ListDiscussionsQuery,
  type PaginatedDiscussions,
} from '../services/discussionService';

export interface UseDiscussionsOptions extends ListDiscussionsQuery {
  enabled?: boolean;
}

/**
 * Hook for fetching and filtering discussions
 *
 * @param options - Query parameters for filtering, sorting, and pagination
 * @returns Query object with discussions data and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useDiscussions({
 *   topicId: 'topic-123',
 *   status: 'ACTIVE',
 *   sortBy: 'lastActivityAt',
 *   sortOrder: 'desc',
 *   page: 1,
 *   limit: 20,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <>
 *     {data.data.map(discussion => (
 *       <DiscussionCard key={discussion.id} discussion={discussion} />
 *     ))}
 *     <Pagination meta={data.meta} />
 *   </>
 * );
 * ```
 */
export function useDiscussions(options: UseDiscussionsOptions = {}) {
  const { enabled = true, ...queryParams } = options;

  return useQuery<PaginatedDiscussions, Error>({
    queryKey: ['discussions', queryParams],
    queryFn: () => discussionService.listDiscussions(queryParams),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - discussions update frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Hook for fetching a single discussion by ID
 *
 * @param discussionId - The ID of the discussion to fetch
 * @param options - Query options
 * @returns Query object with discussion data and state
 *
 * @example
 * ```tsx
 * const { data: discussion, isLoading } = useDiscussion('discussion-123');
 * ```
 */
export function useDiscussion(discussionId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['discussions', discussionId],
    queryFn: () => discussionService.getDiscussion(discussionId),
    enabled: enabled && !!discussionId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes cache for individual discussions
  });
}
