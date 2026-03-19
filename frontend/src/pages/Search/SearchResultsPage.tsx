/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { useDebounce } from '../../hooks/useDebounce';
import type {
  TopicSearchResult,
  ResponseSearchResult,
  SearchResultType,
  SearchSortBy,
} from '../../services/searchService';

/**
 * SearchResultsPage - Unified search results page
 * Feature #1040: Full-Text Search for Discussions
 *
 * Displays search results across topics and responses with:
 * - Type filter (all, topics, responses)
 * - Sort options (relevance, date)
 * - Highlighted search terms in results
 * - Pagination
 */
export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get query parameters
  const query = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as SearchResultType) || 'all';
  const sortByParam = (searchParams.get('sortBy') as SearchSortBy) || 'relevance';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local state for input (debounced)
  const [searchInput, setSearchInput] = useState(query);
  const debouncedQuery = useDebounce(searchInput, 500);

  // Search filters
  const [type, setTypeState] = useState<SearchResultType>(typeParam);
  const [sortBy, setSortByState] = useState<SearchSortBy>(sortByParam);
  const [page, setPage] = useState(pageParam);

  // Track previous query to detect changes
  const prevQueryRef = useRef(debouncedQuery);

  // Wrapper functions that reset page when filters change
  const setType = useCallback((newType: SearchResultType) => {
    setTypeState(newType);
    setPage(1);
  }, []);

  const setSortBy = useCallback((newSortBy: SearchSortBy) => {
    setSortByState(newSortBy);
    setPage(1);
  }, []);

  // Execute search
  const { data, isLoading, error, isFetching } = useSearch(debouncedQuery, {
    type,
    sortBy,
    page,
    limit: 20,
    enabled: debouncedQuery.length >= 2,
  });

  // Update URL when search params change
  // Reset page when query changes - this is a valid pagination reset pattern
  useEffect(() => {
    if (prevQueryRef.current !== debouncedQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset pagination on query change
      setPage(1);
      prevQueryRef.current = debouncedQuery;
    }

    if (debouncedQuery.length >= 2) {
      const params = new URLSearchParams();
      params.set('q', debouncedQuery);
      if (type !== 'all') params.set('type', type);
      if (sortBy !== 'relevance') params.set('sortBy', sortBy);
      if (page > 1) params.set('page', String(page));
      setSearchParams(params, { replace: true });
    }
  }, [debouncedQuery, type, sortBy, page, setSearchParams]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Search Discussions
        </h1>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search topics and responses..."
            className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
          {isFetching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SearchResultType)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Results</option>
              <option value="topics">Topics Only</option>
              <option value="responses">Responses Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SearchSortBy)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="relevance">Most Relevant</option>
              <option value="date">Most Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {data && debouncedQuery.length >= 2 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {data.meta.total} results found
          {type === 'all' && (
            <span>
              {' '}
              ({data.meta.topicCount} topics, {data.meta.responseCount} responses)
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && debouncedQuery.length >= 2 && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {error.message}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && debouncedQuery.length >= 2 && data?.data.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">No results found for &quot;{debouncedQuery}&quot;</p>
          <p className="text-sm">Try different keywords or adjust your filters</p>
        </div>
      )}

      {/* Results List */}
      {data && data.data.length > 0 && (
        <div className="space-y-4">
          {data.data.map((result) =>
            result.type === 'topic' ? (
              <TopicResultCard key={result.id} result={result} />
            ) : (
              <ResponseResultCard key={result.id} result={result} />
            ),
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {data.meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
            disabled={page === data.meta.totalPages}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Initial State (no query) */}
      {debouncedQuery.length < 2 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">Enter at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
}

/**
 * Topic search result card
 */
function TopicResultCard({ result }: { result: TopicSearchResult }) {
  return (
    <Link
      to={`/discussions?topic=${result.id}`}
      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600
                 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Type Badge */}
        <span
          className="px-2 py-0.5 text-xs font-medium rounded
                        bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        >
          Topic
        </span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{result.title}</h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {result.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <span>{result.responseCount} responses</span>
            <span>{result.participantCount} participants</span>
            <span className="capitalize">{result.status.toLowerCase()}</span>
          </div>

          {/* Tags */}
          {result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {result.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700
                             text-gray-600 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Response search result card
 */
function ResponseResultCard({ result }: { result: ResponseSearchResult }) {
  return (
    <Link
      to={`/discussions?topic=${result.topicId}`}
      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600
                 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Type Badge */}
        <span
          className="px-2 py-0.5 text-xs font-medium rounded
                        bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
        >
          Response
        </span>

        <div className="flex-1 min-w-0">
          {/* Topic Title */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">In: {result.topicTitle}</p>

          {/* Content with highlighting */}
          {result.highlightedContent ? (
            <p
              className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3
                         [&>mark]:bg-yellow-200 [&>mark]:dark:bg-yellow-800 [&>mark]:px-0.5"
              dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {result.content}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <span>{new Date(result.createdAt).toLocaleDateString()}</span>
            {result.parentId && <span>Reply</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default SearchResultsPage;
