/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hook for unified full-text search across topics and responses
 * Feature #1040: Full-Text Search for Discussions
 */

import { useQuery } from '@tanstack/react-query';
import {
  searchService,
  type SearchQuery,
  type UnifiedSearchResults,
} from '../services/searchService';

export interface UseSearchOptions extends Omit<SearchQuery, 'q'> {
  enabled?: boolean;
}

/**
 * Hook for executing unified search
 *
 * @param query - Search query string
 * @param options - Search options (type, filters, pagination)
 * @returns Query object with search results and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSearch('climate change', {
 *   type: 'all',
 *   sortBy: 'relevance',
 *   page: 1,
 *   limit: 20,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <>
 *     {data.data.map(result => (
 *       <SearchResultCard key={result.id} result={result} />
 *     ))}
 *     <Pagination meta={data.meta} />
 *   </>
 * );
 * ```
 */
export function useSearch(query: string, options: UseSearchOptions = {}) {
  const { enabled = true, ...searchOptions } = options;

  return useQuery<UnifiedSearchResults, Error>({
    queryKey: ['search', query, searchOptions],
    queryFn: () => searchService.search({ q: query, ...searchOptions }),
    enabled: enabled && query.length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes - search results are cached
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    // Keep previous data while fetching new results
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for topic-only search
 */
export function useTopicSearch(query: string, options: Omit<UseSearchOptions, 'type'> = {}) {
  return useSearch(query, { ...options, type: 'topics' });
}

/**
 * Hook for response-only search
 */
export function useResponseSearch(query: string, options: Omit<UseSearchOptions, 'type'> = {}) {
  return useSearch(query, { ...options, type: 'responses' });
}
