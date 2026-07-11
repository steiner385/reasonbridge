/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { MentionUser } from '../../services/mentionService.js';

/**
 * Props for MentionDropdown component
 */
export interface MentionDropdownProps {
  /** Array of users to display */
  users: MentionUser[];
  /** Currently highlighted user index */
  highlightedIndex: number;
  /** Callback when a user is selected */
  onSelect: (user: MentionUser) => void;
  /** Callback when highlighted index changes */
  onHighlightChange: (index: number) => void;
  /** Callback when dropdown should close */
  onClose: () => void;
  /** Whether the dropdown is loading */
  isLoading?: boolean;
  /** Position style for the dropdown */
  style?: React.CSSProperties;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Dropdown component for displaying mention suggestions.
 *
 * @remarks
 * - **Keyboard navigation**: Up/Down arrows navigate, Enter selects, Escape closes
 * - **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
 * - **Touch targets**: 44px minimum height for each option (WCAG compliance)
 * - **Dark mode**: Full dark mode support via Tailwind `dark:` classes
 * - **Loading state**: Shows spinner while fetching results
 *
 * @param props - Component props
 * @returns Rendered dropdown menu
 *
 * @example
 * ```tsx
 * <MentionDropdown
 *   users={[{ id: '1', username: 'john', displayName: 'John Doe' }]}
 *   highlightedIndex={0}
 *   onSelect={(user) => insertMention(user)}
 *   onHighlightChange={setHighlightedIndex}
 *   onClose={() => setShowDropdown(false)}
 *   style={{ top: cursorPosition.top, left: cursorPosition.left }}
 * />
 * ```
 */
const MentionDropdown: React.FC<MentionDropdownProps> = ({
  users,
  highlightedIndex,
  onSelect,
  onHighlightChange,
  onClose,
  isLoading = false,
  style,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll highlighted option into view
  useEffect(() => {
    const highlightedOption = optionRefs.current[highlightedIndex];
    if (highlightedOption && typeof highlightedOption.scrollIntoView === 'function') {
      highlightedOption.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          onHighlightChange(Math.min(highlightedIndex + 1, users.length - 1));
          break;

        case 'ArrowUp':
          event.preventDefault();
          onHighlightChange(Math.max(highlightedIndex - 1, 0));
          break;

        case 'Enter':
          event.preventDefault();
          if (users[highlightedIndex]) {
            onSelect(users[highlightedIndex]);
          }
          break;

        case 'Escape':
          event.preventDefault();
          onClose();
          break;

        case 'Tab':
          // Close on tab, let natural focus flow continue
          onClose();
          break;
      }
    },
    [users, highlightedIndex, onSelect, onHighlightChange, onClose],
  );

  // Empty state or loading
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`
          absolute z-50
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          p-3
          min-w-[200px]
          ${className}
        `}
        style={style}
        role="listbox"
        aria-busy="true"
        aria-label="Loading mention suggestions"
      >
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Searching...</span>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`
          absolute z-50
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          p-3
          min-w-[200px]
          ${className}
        `}
        style={style}
        role="listbox"
        aria-label="No users found"
      >
        <span className="text-sm text-gray-500 dark:text-gray-400">No users found</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`
        absolute z-50
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-lg
        py-1
        min-w-[200px]
        max-h-[250px]
        overflow-y-auto
        ${className}
      `}
      style={style}
      role="listbox"
      aria-label="Mention suggestions"
      onKeyDown={handleKeyDown}
    >
      {users.map((user, index) => {
        const isHighlighted = index === highlightedIndex;

        return (
          <button
            key={user.id}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            type="button"
            role="option"
            aria-selected={isHighlighted}
            className={`
              w-full
              flex items-center gap-3
              px-3 py-2
              min-h-[44px]
              text-left
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500
              ${
                isHighlighted
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
            onClick={() => onSelect(user)}
            onMouseEnter={() => onHighlightChange(index)}
          >
            {/* Avatar */}
            <div className="shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.displayName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{user.username}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MentionDropdown;
