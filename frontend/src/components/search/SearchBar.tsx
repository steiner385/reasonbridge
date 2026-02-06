/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';

export interface SearchBarProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'onChange'
> {
  /**
   * Callback function triggered when search is submitted
   */
  onSearch?: (query: string) => void;

  /**
   * Callback function triggered on input change (debounced)
   */
  onChange?: (query: string) => void;

  /**
   * Placeholder text for the search input
   */
  placeholder?: string;

  /**
   * Whether to show the search button
   */
  showButton?: boolean;

  /**
   * Size variant of the search bar
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the search bar should take full width
   */
  fullWidth?: boolean;

  /**
   * Whether to show a clear button
   */
  showClearButton?: boolean;

  /**
   * Initial value for the search input
   */
  initialValue?: string;

  /**
   * Whether the search is in a loading state
   */
  isLoading?: boolean;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      onSearch,
      onChange,
      placeholder = 'Search...',
      showButton = true,
      size = 'md',
      fullWidth = true,
      showClearButton = true,
      initialValue = '',
      isLoading = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    const [query, setQuery] = useState<string>(initialValue);

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // Icon size styles
    const iconSizeStyles = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    // Button size styles
    const buttonSizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // Handle search submission
    const handleSearch = useCallback(
      (e?: React.FormEvent) => {
        e?.preventDefault();
        if (onSearch) {
          onSearch(query);
        }
      },
      [query, onSearch],
    );

    // Handle input change
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        if (onChange) {
          onChange(value);
        }
      },
      [onChange],
    );

    // Handle clear
    const handleClear = useCallback(() => {
      setQuery('');
      if (onChange) {
        onChange('');
      }
      if (onSearch) {
        onSearch('');
      }
    }, [onChange, onSearch]);

    // Handle keyboard events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          handleSearch();
        }
      },
      [handleSearch],
    );

    // Base input styles
    const baseStyles =
      'rounded-lg border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed';

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Padding adjustments for icons and buttons
    const leftPadding = 'pl-10'; // Always have search icon
    const rightPadding = showClearButton && query ? 'pr-10' : '';

    // Combined input classes
    const inputClassName = `${baseStyles} ${sizeStyles[size]} ${widthStyles} ${leftPadding} ${rightPadding} ${className}`;

    return (
      <form
        onSubmit={handleSearch}
        className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}
      >
        <div className={`relative ${fullWidth ? 'flex-1' : ''}`}>
          {/* Search Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg
              className={`${iconSizeStyles[size]}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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

          {/* Input Field */}
          <input
            ref={ref}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={inputClassName}
            disabled={isLoading}
            aria-label="Search"
            {...props}
          />

          {/* Clear Button */}
          {showClearButton && query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className={`${iconSizeStyles[size]}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
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

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className={`animate-spin ${iconSizeStyles[size]} text-primary-600`}
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
            </div>
          )}
        </div>

        {/* Search Button */}
        {showButton && (
          <button
            type="submit"
            disabled={isLoading}
            className={`inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 rounded-lg ${buttonSizeStyles[size]}`}
            aria-label="Submit search"
          >
            <svg
              className={`${iconSizeStyles[size]}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="ml-2">Search</span>
          </button>
        )}
      </form>
    );
  },
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
