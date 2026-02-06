/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';

/**
 * TopicSearchFilter props
 */
export interface TopicSearchFilterProps {
  /** Current search query */
  value: string;
  /** Callback when search query changes */
  onChange: (query: string) => void;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Whether to show status filter buttons */
  showStatusFilter?: boolean;
  /** Current status filter */
  statusFilter?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | null;
  /** Callback when status filter changes */
  onStatusFilterChange?: (status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | null) => void;
  /** CSS class name */
  className?: string;
}

/**
 * Compact search and filter component for topic navigation panel
 * Provides real-time client-side search and status filtering
 */
export function TopicSearchFilter({
  value,
  onChange,
  placeholder = 'Search topics...',
  showStatusFilter = false,
  statusFilter = null,
  onStatusFilterChange,
  className = '',
}: TopicSearchFilterProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        handleClear();
        e.currentTarget.blur();
      }
    },
    [handleClear],
  );

  const handleStatusClick = useCallback(
    (status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | null) => {
      if (onStatusFilterChange) {
        onStatusFilterChange(status);
      }
    },
    [onStatusFilterChange],
  );

  return (
    <div className={`topic-search-filter ${className}`}>
      {/* Search Input */}
      <div
        className={`
          relative flex items-center
          border rounded-lg transition-colors
          ${isFocused ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-300'}
        `}
      >
        {/* Search icon */}
        <div className="absolute left-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input field */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            w-full py-2 pl-10 pr-10 text-sm
            bg-transparent outline-none
            placeholder-gray-400 text-gray-900
          "
          aria-label="Search topics"
          data-testid="topic-search-input"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute right-3 p-0.5 rounded-full
              hover:bg-gray-200 transition-colors
            "
            aria-label="Clear search"
            data-testid="clear-search-button"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Status Filter Buttons (optional) */}
      {showStatusFilter && onStatusFilterChange && (
        <div className="flex gap-1 mt-2" role="group" aria-label="Filter by status">
          <button
            type="button"
            onClick={() => handleStatusClick(null)}
            className={`
              flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors
              ${
                statusFilter === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-label="Show all topics"
            aria-pressed={statusFilter === null}
            data-testid="status-filter-all"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleStatusClick('SEEDING')}
            className={`
              flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors
              ${
                statusFilter === 'SEEDING'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-label="Show seeding topics"
            aria-pressed={statusFilter === 'SEEDING'}
            data-testid="status-filter-seeding"
          >
            Seeding
          </button>
          <button
            type="button"
            onClick={() => handleStatusClick('ACTIVE')}
            className={`
              flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors
              ${
                statusFilter === 'ACTIVE'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-label="Show active topics"
            aria-pressed={statusFilter === 'ACTIVE'}
            data-testid="status-filter-active"
          >
            Active
          </button>
        </div>
      )}
    </div>
  );
}
