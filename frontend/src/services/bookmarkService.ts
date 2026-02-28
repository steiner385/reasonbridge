/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bookmark Service
 *
 * Manages user bookmarks for responses.
 * Allows users to save and retrieve bookmarked responses.
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

/**
 * Embedded response information in a bookmark
 */
export interface BookmarkResponse {
  id: string;
  content: string;
  topicId: string;
  topicTitle: string;
  authorDisplayName: string;
  createdAt: string;
}

/**
 * Bookmark entity representing a saved response
 */
export interface Bookmark {
  /** Unique bookmark ID */
  id: string;
  /** User who created the bookmark */
  userId: string;
  /** ID of the bookmarked response */
  responseId: string;
  /** When the bookmark was created */
  createdAt: string;
  /** Optional embedded response details */
  response?: BookmarkResponse;
}

/**
 * Paginated list of bookmarks
 */
export interface BookmarkList {
  /** Array of bookmarks */
  bookmarks: Bookmark[];
  /** Total number of bookmarks */
  total: number;
  /** Number of items per page */
  limit: number;
  /** Starting offset */
  offset: number;
}

/**
 * Bookmark status for a specific response
 */
export interface BookmarkStatus {
  /** Whether the response is bookmarked */
  isBookmarked: boolean;
}

/**
 * Service for managing response bookmarks
 *
 * @remarks
 * **Key Features:**
 * - Add/remove bookmarks for responses
 * - List user's bookmarked responses with pagination
 * - Check bookmark status for a specific response
 *
 * **Usage:**
 * - Save important responses for later reference
 * - Build "My Bookmarks" page showing saved content
 * - Toggle bookmark state from response actions
 *
 * @example
 * ```typescript
 * // Add a bookmark
 * const bookmark = await bookmarkService.addBookmark('response-123');
 *
 * // Check if bookmarked
 * const status = await bookmarkService.getBookmarkStatus('response-123');
 *
 * // List all bookmarks
 * const list = await bookmarkService.getBookmarks(20, 0);
 * ```
 */
class BookmarkService {
  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): HeadersInit {
    // Check both localStorage (remember me) and sessionStorage (current session)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Add a bookmark for a response
   *
   * @param responseId - The ID of the response to bookmark
   * @returns The created bookmark
   *
   * @example
   * ```typescript
   * const bookmark = await bookmarkService.addBookmark('response-123');
   * console.log('Bookmarked at:', bookmark.createdAt);
   * ```
   */
  async addBookmark(responseId: string): Promise<Bookmark> {
    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ responseId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to add bookmark: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Remove a bookmark for a response
   *
   * @param responseId - The ID of the response to unbookmark
   *
   * @example
   * ```typescript
   * await bookmarkService.removeBookmark('response-123');
   * console.log('Bookmark removed');
   * ```
   */
  async removeBookmark(responseId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${responseId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to remove bookmark: ${response.status}`);
    }
  }

  /**
   * Get user's bookmarks with pagination
   *
   * @param limit - Maximum number of bookmarks to return (default: 20)
   * @param offset - Number of bookmarks to skip (default: 0)
   * @returns Paginated list of bookmarks with embedded response details
   *
   * @example
   * ```typescript
   * // Get first page of bookmarks
   * const page1 = await bookmarkService.getBookmarks(20, 0);
   *
   * // Get second page
   * const page2 = await bookmarkService.getBookmarks(20, 20);
   *
   * console.log(`Showing ${page1.bookmarks.length} of ${page1.total} bookmarks`);
   * ```
   */
  async getBookmarks(limit: number = 20, offset: number = 0): Promise<BookmarkList> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/bookmarks?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get bookmarks: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if a response is bookmarked
   *
   * @param responseId - The ID of the response to check
   * @returns Object indicating bookmark status
   *
   * @example
   * ```typescript
   * const status = await bookmarkService.getBookmarkStatus('response-123');
   * if (status.isBookmarked) {
   *   console.log('Response is bookmarked');
   * }
   * ```
   */
  async getBookmarkStatus(responseId: string): Promise<BookmarkStatus> {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${responseId}/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      // User is not authenticated - treat as not bookmarked
      return { isBookmarked: false };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get bookmark status: ${response.status}`);
    }

    return response.json();
  }
}

export const bookmarkService = new BookmarkService();
