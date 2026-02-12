/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hook for debounced tag search with API integration
 * Feature 016: Topic Management - T229 Tag Selector
 */

import { useState, useEffect, useCallback } from 'react';
import type { Tag } from '../types/tag';
import { useDebounce } from './useDebounce';
import { tagService } from '../services/tagService';

export interface UseTagSearchOptions {
  /** Minimum characters before triggering search (default: 2) */
  minQueryLength?: number;
  /** Debounce delay in milliseconds (default: 300) */
  debounceDelay?: number;
  /** Maximum results to fetch (default: 10) */
  limit?: number;
}

export interface UseTagSearchResult {
  /** Search query string */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: Tag[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Error from the last search */
  error: Error | null;
  /** Clear results and query */
  clear: () => void;
  /** Whether results are stale (query changed but results haven't updated) */
  isStale: boolean;
}

/**
 * Hook for searching tags with debounced API calls
 *
 * @param options - Search configuration options
 * @returns Search state and controls
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isLoading, error } = useTagSearch({
 *   debounceDelay: 300,
 *   limit: 10
 * });
 *
 * // As user types
 * <input value={query} onChange={e => setQuery(e.target.value)} />
 *
 * // Show results
 * {results.map(tag => <div key={tag.id}>{tag.name}</div>)}
 * ```
 */
export function useTagSearch(options: UseTagSearchOptions = {}): UseTagSearchResult {
  const { minQueryLength = 2, debounceDelay = 300, limit = 10 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounce the query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Track if results are stale
  const isStale = query !== debouncedQuery && query.length >= minQueryLength;

  // Perform search when debounced query changes
  useEffect(() => {
    const searchTags = async () => {
      // Don't search if query is too short
      if (debouncedQuery.length < minQueryLength) {
        setResults([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResult = await tagService.searchTags(debouncedQuery, limit);
        setResults(searchResult.tags);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to search tags'));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchTags();
  }, [debouncedQuery, minQueryLength, limit]);

  // Clear all state
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear,
    isStale,
  };
}
