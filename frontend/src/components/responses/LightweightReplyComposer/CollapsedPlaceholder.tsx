/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Collapsed Placeholder for Lightweight Reply Composer
 *
 * A compact, single-line placeholder that expands into the full composer
 * when clicked. Shows "Reply to {name}..." or "Write a reply..." with
 * an arrow icon.
 */

export interface CollapsedPlaceholderProps {
  /** Author name to display (e.g., "Reply to Alice...") */
  authorName?: string;
  /** Click handler to expand the composer */
  onClick: () => void;
}

export function CollapsedPlaceholder({ authorName, onClick }: CollapsedPlaceholderProps) {
  const placeholderText = authorName ? `Reply to ${authorName}...` : 'Write a reply...';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-left group"
      aria-label={placeholderText}
    >
      {/* Reply icon */}
      <svg
        className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>

      {/* Placeholder text */}
      <span className="flex-1 text-sm text-gray-500 dark:text-gray-400 truncate">
        {placeholderText}
      </span>

      {/* Arrow indicator */}
      <svg
        className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
