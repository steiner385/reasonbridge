/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tag API service for Feature 016: Topic Management
 * T229: Tag Selector with autocomplete functionality
 */

import type { Tag, TagSearchResult } from '../types/tag';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

class TagService {
  private getAuthHeaders(): HeadersInit {
    // Use 'authToken' key to match apiClient token storage (api.ts line 47)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Search for existing tags by query string
   * @param query - Search query (minimum 2 characters)
   * @param limit - Maximum results to return (default: 10)
   * @returns Matching tags with usage counts
   */
  async searchTags(query: string, limit: number = 10): Promise<TagSearchResult> {
    if (query.length < 2) {
      return { tags: [], total: 0 };
    }

    const searchParams = new URLSearchParams({
      query: query.trim(),
      limit: limit.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/tags/search?${searchParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to search tags' }));
      throw new Error(error.message || 'Failed to search tags');
    }

    const data = await response.json();

    // Handle both array response and wrapped response formats
    if (Array.isArray(data)) {
      return { tags: data, total: data.length };
    }

    return data as TagSearchResult;
  }

  /**
   * Get popular/trending tags
   * @param limit - Maximum tags to return (default: 10)
   * @returns Popular tags sorted by usage count
   */
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const searchParams = new URLSearchParams({
      limit: limit.toString(),
      sort: 'popularity',
    });

    const response = await fetch(`${API_BASE_URL}/tags?${searchParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch tags' }));
      throw new Error(error.message || 'Failed to fetch tags');
    }

    const data = await response.json();

    // Handle both array response and wrapped response formats
    if (Array.isArray(data)) {
      return data;
    }

    return data.tags || data.data || [];
  }
}

export const tagService = new TagService();
