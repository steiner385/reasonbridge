/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Search API service for Feature #1040: Full-Text Search for Discussions
 * Provides unified search across topics and responses
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

/**
 * Search result types
 */
export type SearchResultType = 'topics' | 'responses' | 'all';
export type SearchSortBy = 'relevance' | 'date';

/**
 * Base search result item
 */
export interface SearchResultItem {
  type: 'topic' | 'response';
  id: string;
  score: number;
  createdAt: string;
}

/**
 * Topic search result
 */
export interface TopicSearchResult extends SearchResultItem {
  type: 'topic';
  title: string;
  description: string;
  slug: string;
  status: string;
  responseCount: number;
  participantCount: number;
  tags: string[];
}

/**
 * Response search result
 */
export interface ResponseSearchResult extends SearchResultItem {
  type: 'response';
  content: string;
  highlightedContent?: string;
  authorId: string;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  parentId: string | null;
}

/**
 * Search metadata
 */
export interface SearchMeta {
  total: number;
  topicCount: number;
  responseCount: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
}

/**
 * Unified search results
 */
export interface UnifiedSearchResults {
  data: (TopicSearchResult | ResponseSearchResult)[];
  meta: SearchMeta;
}

/**
 * Search query parameters
 */
export interface SearchQuery {
  q: string;
  type?: SearchResultType;
  topicId?: string;
  authorId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: SearchSortBy;
  page?: number;
  limit?: number;
}

/**
 * Search service for unified full-text search
 */
export const searchService = {
  /**
   * Execute unified search across topics and responses
   */
  async search(query: SearchQuery): Promise<UnifiedSearchResults> {
    const params = new URLSearchParams();

    // Required parameter
    params.append('q', query.q);

    // Optional parameters
    if (query.type) params.append('type', query.type);
    if (query.topicId) params.append('topicId', query.topicId);
    if (query.authorId) params.append('authorId', query.authorId);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Search failed' }));
      throw new Error(error.message || 'Search failed');
    }

    return response.json();
  },

  /**
   * Search only topics
   */
  async searchTopics(
    q: string,
    options: Omit<SearchQuery, 'q' | 'type'> = {},
  ): Promise<UnifiedSearchResults> {
    return this.search({ ...options, q, type: 'topics' });
  },

  /**
   * Search only responses
   */
  async searchResponses(
    q: string,
    options: Omit<SearchQuery, 'q' | 'type'> = {},
  ): Promise<UnifiedSearchResults> {
    return this.search({ ...options, q, type: 'responses' });
  },
};
