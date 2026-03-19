/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';

export interface QuotePreviewProps {
  /**
   * The ID of the parent response being quoted
   */
  parentId: string;

  /**
   * The content of the parent response to display
   */
  parentContent: string;

  /**
   * Display name of the parent response author
   */
  parentAuthorName?: string;

  /**
   * Maximum characters to show before truncating (default: 100)
   */
  maxLength?: number;

  /**
   * Callback when the preview is clicked (for scrolling to parent)
   */
  onNavigateToParent?: (parentId: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md';
}

/**
 * QuotePreview component displays a clickable preview of a parent response.
 *
 * @remarks
 * **Features:**
 * - Shows truncated preview of parent response content
 * - Click to scroll/navigate to the original response
 * - Visual indicator (left border) connecting reply to parent
 * - Accessible with proper ARIA attributes
 * - Dark mode support
 *
 * @param props - Component props
 * @returns Rendered quote preview
 *
 * @example
 * ```tsx
 * // Basic usage
 * <QuotePreview
 *   parentId="response-123"
 *   parentContent="This is the original message that was replied to..."
 *   parentAuthorName="Alice"
 *   onNavigateToParent={(id) => scrollToResponse(id)}
 * />
 *
 * // With custom max length
 * <QuotePreview
 *   parentId="response-123"
 *   parentContent={longContent}
 *   maxLength={150}
 * />
 * ```
 */
const QuotePreview: React.FC<QuotePreviewProps> = ({
  parentId,
  parentContent,
  parentAuthorName,
  maxLength = 100,
  onNavigateToParent,
  className = '',
  size = 'md',
}) => {
  /**
   * Truncate content to maxLength characters with ellipsis
   */
  const truncatedContent =
    parentContent.length > maxLength
      ? `${parentContent.slice(0, maxLength).trim()}...`
      : parentContent;

  /**
   * Handle click to navigate to parent response
   */
  const handleClick = useCallback(() => {
    if (onNavigateToParent) {
      onNavigateToParent(parentId);
    } else {
      // Default behavior: scroll to element with matching data-response-id
      const parentElement = document.querySelector(`[data-response-id="${parentId}"]`);
      if (parentElement) {
        parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add temporary highlight effect
        parentElement.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
        setTimeout(() => {
          parentElement.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
        }, 2000);
      }
    }
  }, [parentId, onNavigateToParent]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  // Size-specific classes
  const sizeClasses = {
    sm: {
      container: 'py-1.5 px-2.5 text-xs',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'py-2 px-3 text-sm',
      icon: 'w-4 h-4',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        ${currentSize.container}
        flex items-start gap-2
        bg-gray-50 dark:bg-gray-800/50
        border-l-2 border-gray-300 dark:border-gray-600
        rounded-r-md
        cursor-pointer
        transition-colors duration-150
        hover:bg-gray-100 dark:hover:bg-gray-700/50
        hover:border-blue-400 dark:hover:border-blue-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        dark:focus:ring-offset-gray-900
        ${className}
      `}
      aria-label={`Replying to ${parentAuthorName || 'a response'}. Click to view original.`}
      data-testid="quote-preview"
      data-parent-id={parentId}
    >
      {/* Reply icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`${currentSize.icon} text-gray-400 dark:text-gray-500 shrink-0 mt-0.5`}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z"
          clipRule="evenodd"
        />
      </svg>

      {/* Quote content */}
      <div className="flex-1 min-w-0">
        {parentAuthorName && (
          <span className="font-medium text-gray-600 dark:text-gray-400 mr-1">
            {parentAuthorName}:
          </span>
        )}
        <span className="text-gray-500 dark:text-gray-400 break-words">{truncatedContent}</span>
      </div>

      {/* Chevron indicator */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`${currentSize.icon} text-gray-400 dark:text-gray-500 shrink-0`}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
};

export default QuotePreview;
