/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Link Preview Service
 *
 * Fetches Open Graph metadata for URLs via the backend API.
 * Results are cached server-side for 24 hours.
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

/**
 * Link preview metadata
 */
export interface LinkPreviewData {
  /** Original URL */
  url: string;
  /** Page title (from og:title or <title>) */
  title: string | null;
  /** Page description (from og:description or meta) */
  description: string | null;
  /** Preview image URL (from og:image) */
  image: string | null;
  /** Site name (from og:site_name) */
  siteName: string | null;
  /** Favicon URL */
  favicon: string | null;
  /** Content type (article, video, etc.) */
  type: string | null;
  /** Whether served from cache */
  cached: boolean;
  /** When metadata was fetched */
  fetchedAt: string;
}

/**
 * Error response from link preview API
 */
export interface LinkPreviewError {
  error: string;
  url: string;
  code: 'INVALID_URL' | 'FETCH_FAILED' | 'TIMEOUT' | 'BLOCKED' | 'RATE_LIMITED';
}

/**
 * Link Preview Service
 */
class LinkPreviewService {
  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Fetch preview metadata for a single URL
   *
   * @param url - URL to fetch metadata for
   * @returns Link preview data
   * @throws Error if fetch fails
   */
  async getPreview(url: string): Promise<LinkPreviewData> {
    const response = await fetch(`${API_BASE_URL}/link-previews`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch link preview');
    }

    return response.json();
  }

  /**
   * Fetch preview metadata for multiple URLs
   *
   * @param urls - Array of URLs to fetch
   * @returns Map of URL to preview data or error
   */
  async getPreviewsBatch(
    urls: string[],
  ): Promise<Record<string, LinkPreviewData | LinkPreviewError>> {
    const response = await fetch(`${API_BASE_URL}/link-previews/batch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch link previews');
    }

    return response.json();
  }
}

export const linkPreviewService = new LinkPreviewService();

/**
 * URL detection regex for finding links in text content
 * Matches http/https URLs with optional paths and query strings
 */
export const URL_PATTERN =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Extract URLs from text content
 *
 * @param content - Text content to scan for URLs
 * @returns Array of unique URLs found
 */
export function extractUrls(content: string): string[] {
  const matches = content.match(URL_PATTERN);
  if (!matches) return [];

  // Return unique URLs only
  return [...new Set(matches)];
}
