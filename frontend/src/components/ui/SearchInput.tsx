import { forwardRef, type InputHTMLAttributes } from 'react';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  /**
   * Input value
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;

  /**
   * Optional clear button callback
   */
  onClear?: () => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether the input is in a loading state
   */
  isLoading?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * SearchInput - Specialized input for search functionality
 *
 * Features:
 * - Search icon indicator
 * - Clear button when value exists
 * - Loading state indicator
 * - Dark mode support
 * - Keyboard shortcuts (Escape to clear)
 * - Accessibility attributes
 *
 * @example
 * // Basic search input
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   placeholder="Search topics..."
 * />
 *
 * @example
 * // With loading state
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   isLoading={isSearching}
 *   onClear={() => setQuery('')}
 * />
 */
const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = 'Search...',
      isLoading = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleClear = () => {
      onChange('');
      if (onClear) {
        onClear();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && value) {
        handleClear();
      }
    };

    return (
      <div className={`relative ${className}`}>
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400 dark:text-gray-500"
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

        {/* Input */}
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-10 py-2.5
            text-gray-900 dark:text-gray-100
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-700
            rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            transition-colors
          `}
          aria-label="Search"
          {...props}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <svg
              className="h-5 w-5 text-gray-400 dark:text-gray-500 animate-spin"
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
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
