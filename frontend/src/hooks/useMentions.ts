/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hook for user mention search with debounced API calls
 * Feature: @mentions with autocomplete
 */

import { useState, useEffect, useCallback } from 'react';
import type { MentionUser } from '../services/mentionService.js';
import { searchUsers } from '../services/mentionService.js';
import { useDebounce } from './useDebounce.js';

/**
 * Options for configuring the useMentions hook
 */
export interface UseMentionsOptions {
  /** Minimum characters before triggering search (default: 1) */
  minQueryLength?: number;
  /** Debounce delay in milliseconds (default: 300) */
  debounceDelay?: number;
  /** Maximum results to fetch (default: 5) */
  limit?: number;
  /** Topic ID to prioritize participants */
  topicId?: string;
}

/**
 * Result object from useMentions hook
 */
export interface UseMentionsResult {
  /** Search query string */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Array of matching users */
  users: MentionUser[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Error from the last search, if any */
  error: Error | null;
  /** Clear results and query */
  clear: () => void;
  /** Whether results are stale (query changed but results haven't updated) */
  isStale: boolean;
}

/**
 * Hook for searching users for @mentions with debounced API calls
 *
 * @remarks
 * - **Debounced search**: Waits for user to stop typing (default 300ms)
 * - **Topic priority**: When topicId is provided, topic participants appear first
 * - **Minimum query**: Requires at least 1 character to search
 * - **Error handling**: Exposes errors for UI feedback
 *
 * @param options - Search configuration options
 * @returns Search state and controls
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { query, setQuery, users, isLoading, error } = useMentions();
 *
 * // With topic participant priority
 * const { users } = useMentions({ topicId: 'topic-123' });
 *
 * // Custom debounce delay
 * const { users } = useMentions({ debounceDelay: 500 });
 *
 * // Usage in component
 * <input value={query} onChange={e => setQuery(e.target.value)} />
 * {users.map(user => <UserItem key={user.id} user={user} />)}
 * ```
 */
export function useMentions(options: UseMentionsOptions = {}): UseMentionsResult {
  const { minQueryLength = 1, debounceDelay = 300, limit = 5, topicId } = options;

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounce the query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Track if results are stale (query changed but not yet searched)
  const isStale = query !== debouncedQuery && query.length >= minQueryLength;

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      // Don't search if query is too short
      if (debouncedQuery.length < minQueryLength) {
        setUsers([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchUsers(debouncedQuery, topicId, limit);
        setUsers(results);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to search users'));
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, minQueryLength, limit, topicId]);

  // Clear all state
  const clear = useCallback(() => {
    setQuery('');
    setUsers([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    query,
    setQuery,
    users,
    isLoading,
    error,
    clear,
    isStale,
  };
}
