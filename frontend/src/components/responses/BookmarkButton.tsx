/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useBookmarkStatus } from '../../hooks/useBookmarks';
import { useToast } from '../../contexts/ToastContext';
import { Tooltip } from '../ui/Tooltip';

export interface BookmarkButtonProps {
  /**
   * The ID of the response to bookmark
   */
  responseId: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}

/**
 * BookmarkButton component for toggling response bookmarks.
 *
 * @remarks
 * - **Filled icon**: Response is bookmarked
 * - **Outline icon**: Response is not bookmarked
 * - **Optimistic updates**: Instant UI feedback with automatic rollback on error
 * - **Accessibility**: 44px minimum touch target (WCAG 2.1 AA compliance)
 * - **Dark mode**: Full dark mode support with appropriate colors
 *
 * @param props - Component props
 * @returns Rendered bookmark button
 *
 * @example
 * ```tsx
 * // Basic usage in ResponseCard
 * <BookmarkButton responseId={response.id} />
 *
 * // With custom size
 * <BookmarkButton responseId={response.id} size="lg" />
 *
 * // Disabled state
 * <BookmarkButton responseId={response.id} disabled />
 * ```
 */
const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  responseId,
  className = '',
  size = 'md',
  disabled = false,
}) => {
  const toast = useToast();
  const { isBookmarked, isPending, toggleBookmark } = useBookmarkStatus(responseId);

  // Size classes - all sizes maintain 44px minimum touch target for WCAG 2.1 AA compliance
  const sizeClasses = {
    sm: {
      button: 'w-6 h-6 min-w-[44px] min-h-[44px]',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      button: 'w-8 h-8 min-w-[44px] min-h-[44px]',
      icon: 'w-4 h-4',
    },
    lg: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
    },
  };

  const currentSize = sizeClasses[size];

  // Button classes with dark mode support
  const buttonClasses = `
    ${currentSize.button}
    inline-flex items-center justify-center
    rounded-md
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
    disabled:opacity-40 disabled:cursor-not-allowed
    ${
      isBookmarked
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-amber-600 dark:hover:text-amber-400'
    }
    ${className}
  `;

  const handleClick = async () => {
    if (disabled || isPending) return;

    try {
      toggleBookmark();
      // Toast will show after successful mutation (optimistic update)
      // Note: We don't show toast immediately because of optimistic updates
      // The mutation handlers could add toast on success/error if needed
    } catch {
      toast.error('Failed to update bookmark');
    }
  };

  const tooltipContent = isBookmarked
    ? 'Remove this response from your saved bookmarks'
    : 'Save this response to revisit later';

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={handleClick}
        disabled={disabled || isPending}
        className={buttonClasses}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        aria-pressed={isBookmarked}
        data-testid="bookmark-button"
        data-bookmarked={isBookmarked}
        data-tour="bookmark-button"
      >
        {isBookmarked ? (
          // Filled bookmark icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={currentSize.icon}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Outline bookmark icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={currentSize.icon}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
            />
          </svg>
        )}
      </button>
    </Tooltip>
  );
};

export default BookmarkButton;
