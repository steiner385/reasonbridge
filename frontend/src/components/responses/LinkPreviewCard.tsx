/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink, Image as ImageIcon, Globe } from 'lucide-react';

/**
 * Link preview metadata structure
 */
export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  type: string | null;
}

export interface LinkPreviewCardProps {
  /** Preview metadata to display */
  preview: LinkPreviewData;

  /** Whether the card is in a loading state */
  isLoading?: boolean;

  /** Compact mode for inline display */
  compact?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * LinkPreviewCard Component
 *
 * Displays rich Open Graph metadata for shared URLs in responses.
 * Shows title, description, image preview, and site favicon.
 *
 * Features:
 * - Responsive layout (image left on desktop, stacked on mobile)
 * - Dark mode support
 * - Graceful fallback for missing metadata
 * - External link indicator
 * - Compact mode for inline display
 *
 * @example
 * ```tsx
 * <LinkPreviewCard
 *   preview={{
 *     url: "https://example.com/article",
 *     title: "Article Title",
 *     description: "A brief description...",
 *     image: "https://example.com/og-image.jpg",
 *     siteName: "Example.com",
 *     favicon: "https://example.com/favicon.ico",
 *     type: "article"
 *   }}
 * />
 * ```
 */
const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  preview,
  isLoading = false,
  compact = false,
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [faviconError, setFaviconError] = React.useState(false);

  // Extract domain from URL for display
  const domain = React.useMemo(() => {
    try {
      return new URL(preview.url).hostname.replace(/^www\./, '');
    } catch {
      return preview.siteName || 'Link';
    }
  }, [preview.url, preview.siteName]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden animate-pulse ${className}`}
        aria-label="Loading link preview"
      >
        <div className={`flex ${compact ? 'flex-row' : 'flex-col sm:flex-row'}`}>
          {/* Image skeleton */}
          <div
            className={`bg-gray-200 dark:bg-gray-700 ${compact ? 'w-16 h-16' : 'w-full sm:w-32 h-24 sm:h-full'}`}
          />
          {/* Content skeleton */}
          <div className="flex-1 p-3 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Determine if we should show the image
  const showImage = preview.image && !imageError;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group block rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 overflow-hidden
        hover:border-primary-300 dark:hover:border-primary-600
        hover:shadow-md dark:hover:shadow-gray-900/30
        transition-all duration-200
        ${className}
      `}
      aria-label={`Open ${preview.title || domain} in new tab`}
    >
      <div className={`flex ${compact ? 'flex-row' : 'flex-col sm:flex-row'}`}>
        {/* Image section */}
        {showImage ? (
          <div
            className={`
              relative shrink-0 bg-gray-100 dark:bg-gray-700
              ${compact ? 'w-16 h-16' : 'w-full sm:w-40 h-40 sm:h-auto'}
            `}
          >
            <img
              src={preview.image!}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          // Placeholder when no image
          <div
            className={`
              shrink-0 bg-gray-100 dark:bg-gray-700
              flex items-center justify-center
              ${compact ? 'w-16 h-16' : 'w-full sm:w-40 h-24 sm:h-auto min-h-[80px]'}
            `}
          >
            <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* Content section */}
        <div className={`flex-1 ${compact ? 'p-2' : 'p-3 sm:p-4'} min-w-0`}>
          {/* Site info */}
          <div className="flex items-center gap-2 mb-1">
            {preview.favicon && !faviconError ? (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4 rounded-sm"
                loading="lazy"
                decoding="async"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <Globe className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {preview.siteName || domain}
            </span>
          </div>

          {/* Title */}
          <h4
            className={`
              font-medium text-gray-900 dark:text-gray-100
              group-hover:text-primary-600 dark:group-hover:text-primary-400
              transition-colors
              ${compact ? 'text-sm line-clamp-1' : 'text-base line-clamp-2'}
            `}
          >
            {preview.title || domain}
          </h4>

          {/* Description */}
          {preview.description && !compact && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {preview.description}
            </p>
          )}

          {/* External link indicator */}
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{domain}</span>
          </div>
        </div>
      </div>
    </a>
  );
};

export default LinkPreviewCard;
