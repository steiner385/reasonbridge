/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useLinkPreviews - React Query hook for fetching link preview metadata
 *
 * Detects URLs in content and fetches Open Graph metadata for display.
 * Results are cached both server-side (Redis) and client-side (React Query).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  linkPreviewService,
  extractUrls,
  type LinkPreviewData,
  type LinkPreviewError,
} from '../services/linkPreviewService';

/**
 * Options for useLinkPreviews hook
 */
export interface UseLinkPreviewsOptions {
  /** Whether to enable fetching (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
  /** Maximum number of URLs to fetch (default: 5) */
  maxUrls?: number;
}

/**
 * Result of useLinkPreviews hook
 */
export interface UseLinkPreviewsResult {
  /** Map of URL to preview data */
  previews: Map<string, LinkPreviewData>;
  /** URLs that are currently loading */
  loadingUrls: Set<string>;
  /** URLs that failed to load */
  errorUrls: Map<string, string>;
  /** Whether any previews are loading */
  isLoading: boolean;
  /** Whether any previews failed */
  isError: boolean;
  /** Get preview for a specific URL */
  getPreview: (url: string) => LinkPreviewData | undefined;
  /** Check if URL is loading */
  isUrlLoading: (url: string) => boolean;
  /** Get error for a specific URL */
  getError: (url: string) => string | undefined;
}

/**
 * Hook for fetching link previews for URLs in content
 *
 * @param content - Text content to scan for URLs
 * @param options - Optional configuration
 * @returns Object with preview data and loading states
 *
 * @remarks
 * **Features:**
 * - Automatic URL detection in content
 * - Batch fetching for efficiency
 * - Server-side caching (24 hours)
 * - Client-side caching (5 minutes)
 * - Error handling per-URL
 *
 * @example
 * ```tsx
 * const { previews, isLoading, getPreview } = useLinkPreviews(response.content);
 *
 * // Render preview cards for detected URLs
 * {urls.map(url => {
 *   const preview = getPreview(url);
 *   if (preview) {
 *     return <LinkPreviewCard key={url} preview={preview} />;
 *   }
 *   return null;
 * })}
 * ```
 */
export function useLinkPreviews(
  content: string,
  options: UseLinkPreviewsOptions = {},
): UseLinkPreviewsResult {
  const { enabled = true, staleTime = 5 * 60 * 1000, maxUrls = 5 } = options;

  // Extract URLs from content
  const urls = useMemo(() => {
    if (!content || !enabled) return [];
    const extracted = extractUrls(content);
    return extracted.slice(0, maxUrls);
  }, [content, enabled, maxUrls]);

  // Create a stable query key from sorted URLs
  const queryKey = useMemo(() => ['link-previews', [...urls].sort().join(',')], [urls]);

  // Fetch previews for all URLs
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      if (urls.length === 0) {
        return {};
      }
      return linkPreviewService.getPreviewsBatch(urls);
    },
    enabled: enabled && urls.length > 0,
    staleTime,
    // Don't refetch on window focus - previews don't change often
    refetchOnWindowFocus: false,
    // Retry once on failure
    retry: 1,
  });

  // Process results into maps
  const { previews, errorUrls, loadingUrls } = useMemo(() => {
    const previewsMap = new Map<string, LinkPreviewData>();
    const errorsMap = new Map<string, string>();
    const loadingSet = new Set<string>();

    if (isLoading) {
      // All URLs are loading
      urls.forEach((url) => loadingSet.add(url));
    } else if (data) {
      // Process results
      for (const [url, result] of Object.entries(data)) {
        if ('error' in result) {
          errorsMap.set(url, (result as LinkPreviewError).error);
        } else {
          previewsMap.set(url, result as LinkPreviewData);
        }
      }
    }

    return { previews: previewsMap, errorUrls: errorsMap, loadingUrls: loadingSet };
  }, [data, isLoading, urls]);

  // Helper functions
  const getPreview = (url: string): LinkPreviewData | undefined => {
    return previews.get(url);
  };

  const isUrlLoading = (url: string): boolean => {
    return loadingUrls.has(url);
  };

  const getError = (url: string): string | undefined => {
    return errorUrls.get(url);
  };

  return {
    previews,
    loadingUrls,
    errorUrls,
    isLoading,
    isError,
    getPreview,
    isUrlLoading,
    getError,
  };
}

export default useLinkPreviews;
