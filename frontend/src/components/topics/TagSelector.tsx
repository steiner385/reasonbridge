/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TagSelector component for Topic Creation Wizard
 * Feature 016: Topic Management - T229 Tag Selector
 *
 * @remarks
 * Provides autocomplete tag selection with:
 * - **Search**: Debounced API search for existing tags
 * - **Create**: Option to create new tags inline
 * - **Multi-select**: Display selected tags as removable pills
 * - **Keyboard Navigation**: Full keyboard support (arrows, enter, escape, backspace)
 * - **Accessibility**: ARIA combobox pattern with live regions
 * - **Validation**: Configurable min/max tags and character limits
 */

import { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import { useTagSearch } from '../../hooks/useTagSearch';
import type { Tag, TagValidation, TagOption, CreateTagOption } from '../../types/tag';
import { isCreateTagOption } from '../../types/tag';

export interface TagSelectorProps {
  /** Currently selected tags */
  selectedTags: Tag[];
  /** Callback when tags change */
  onChange: (tags: Tag[]) => void;
  /** Callback for validation state changes */
  onValidationChange?: (validation: TagValidation) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Minimum tags required (default: 1) */
  minTags?: number;
  /** Maximum tags allowed (default: 5) */
  maxTags?: number;
  /** Minimum tag name length (default: 2) */
  minTagLength?: number;
  /** Maximum tag name length (default: 50) */
  maxTagLength?: number;
  /** Component ID for accessibility */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Hook for tag selection validation
 */
export function useTagValidation(
  selectedTags: Tag[],
  minTags: number = 1,
  maxTags: number = 5,
): TagValidation {
  return useMemo(() => {
    const tagCount = selectedTags.length;
    let error: string | null = null;

    if (tagCount < minTags) {
      const needed = minTags - tagCount;
      error =
        tagCount === 0
          ? `At least ${minTags} tag${minTags > 1 ? 's' : ''} required`
          : `${needed} more tag${needed > 1 ? 's' : ''} needed`;
    } else if (tagCount > maxTags) {
      error = `Maximum ${maxTags} tags allowed`;
    }

    return {
      isValid: tagCount >= minTags && tagCount <= maxTags,
      error,
      tagCount,
      minTags,
      maxTags,
    };
  }, [selectedTags, minTags, maxTags]);
}

/**
 * Tag selector with autocomplete and multi-select functionality
 */
export function TagSelector({
  selectedTags,
  onChange,
  onValidationChange,
  disabled = false,
  minTags = 1,
  maxTags = 5,
  minTagLength = 2,
  maxTagLength = 50,
  id,
  className = '',
  placeholder = 'Search or create tags...',
}: TagSelectorProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search hook
  const { query, setQuery, results, isLoading, clear } = useTagSearch({
    debounceDelay: 300,
    limit: 10,
    minQueryLength: minTagLength,
  });

  // Validation
  const validation = useTagValidation(selectedTags, minTags, maxTags);

  // Generate unique IDs
  const reactId = useId();
  const generatedId = id || `tag-selector${reactId}`;
  const inputId = `${generatedId}-input`;
  const listboxId = `${generatedId}-listbox`;
  const labelId = `${generatedId}-label`;

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  // Filter out already selected tags from results
  const filteredResults = useMemo(() => {
    const selectedIds = new Set(selectedTags.map((t) => t.id));
    return results.filter((tag) => !selectedIds.has(tag.id));
  }, [results, selectedTags]);

  // Build dropdown options (results + create option if applicable)
  const options = useMemo((): TagOption[] => {
    const opts: TagOption[] = [...filteredResults];

    // Add create option if query is valid and doesn't match existing tag exactly
    const trimmedQuery = query.trim().toLowerCase();
    if (
      trimmedQuery.length >= minTagLength &&
      trimmedQuery.length <= maxTagLength &&
      !filteredResults.some((tag) => tag.name.toLowerCase() === trimmedQuery) &&
      !selectedTags.some((tag) => tag.name.toLowerCase() === trimmedQuery)
    ) {
      const createOption: CreateTagOption = {
        name: query.trim(),
        isCreateOption: true,
      };
      opts.push(createOption);
    }

    return opts;
  }, [filteredResults, query, minTagLength, maxTagLength, selectedTags]);

  // Check if max tags reached
  const isMaxTagsReached = selectedTags.length >= maxTags;

  // Handle selecting a tag
  const handleSelectTag = useCallback(
    (option: TagOption) => {
      if (disabled || isMaxTagsReached) return;

      let newTag: Tag;

      if (isCreateTagOption(option)) {
        // Create a new tag with a temporary ID
        newTag = {
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: option.name,
          slug: option.name.toLowerCase().replace(/\s+/g, '-'),
        };
      } else {
        newTag = option;
      }

      // Check for duplicates (case-insensitive)
      const isDuplicate = selectedTags.some(
        (t) => t.name.toLowerCase() === newTag.name.toLowerCase(),
      );

      if (!isDuplicate) {
        onChange([...selectedTags, newTag]);
      }

      // Reset state
      clear();
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [disabled, isMaxTagsReached, selectedTags, onChange, clear],
  );

  // Handle removing a tag
  const handleRemoveTag = useCallback(
    (tagToRemove: Tag) => {
      if (disabled) return;
      onChange(selectedTags.filter((t) => t.id !== tagToRemove.id));
      inputRef.current?.focus();
    },
    [disabled, selectedTags, onChange],
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxTagLength) {
      setQuery(value);
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen && query.length >= minTagLength) {
          setIsOpen(true);
        }
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;

      case 'Enter': {
        e.preventDefault();
        const highlightedOption = options[highlightedIndex];
        const firstOption = options[0];
        if (highlightedIndex >= 0 && highlightedOption) {
          handleSelectTag(highlightedOption);
        } else if (options.length === 1 && firstOption) {
          // Auto-select if only one option
          handleSelectTag(firstOption);
        }
        break;
      }

      case 'Tab': {
        const tabOption = options[highlightedIndex];
        if (isOpen && highlightedIndex >= 0 && tabOption) {
          e.preventDefault();
          handleSelectTag(tabOption);
        }
        break;
      }

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Backspace': {
        const lastTag = selectedTags[selectedTags.length - 1];
        if (query === '' && lastTag) {
          // Remove last tag when backspace on empty input
          handleRemoveTag(lastTag);
        }
        break;
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const option = listboxRef.current.children[highlightedIndex] as HTMLElement;
      // scrollIntoView may not exist in test environments (JSDOM)
      if (option?.scrollIntoView) {
        option.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Should show dropdown?
  const showDropdown =
    isOpen && !disabled && !isMaxTagsReached && (options.length > 0 || isLoading);

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {/* Label */}
      <label
        id={labelId}
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Tags <span className="text-fallacy-DEFAULT dark:text-red-400">*</span>
        <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
          ({selectedTags.length}/{maxTags})
        </span>
      </label>

      {/* Input Container */}
      <div className="relative">
        <div
          className={`
            flex flex-wrap gap-2 p-2 border rounded-lg transition-colors
            ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}
            ${validation.error && selectedTags.length > 0 ? 'border-fallacy-DEFAULT dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
            ${!disabled && 'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20'}
          `}
        >
          {/* Selected Tags as Pills */}
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
            >
              #{tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                disabled={disabled}
                className="hover:text-primary-900 dark:hover:text-primary-100 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded-full disabled:opacity-50"
                aria-label={`Remove tag ${tag.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}

          {/* Search Input */}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${generatedId}-option-${highlightedIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-labelledby={labelId}
            aria-invalid={!!validation.error}
            aria-describedby={
              validation.error && selectedTags.length > 0
                ? `${generatedId}-error`
                : `${generatedId}-hint`
            }
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= minTagLength && setIsOpen(true)}
            disabled={disabled || isMaxTagsReached}
            placeholder={isMaxTagsReached ? 'Maximum tags reached' : placeholder}
            maxLength={maxTagLength}
            className={`
              flex-1 min-w-[150px] px-2 py-1 outline-none
              bg-transparent text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              disabled:cursor-not-allowed
            `}
          />
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {isLoading && (
              <li className="px-4 py-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Searching...
              </li>
            )}

            {!isLoading && options.length === 0 && query.length >= minTagLength && (
              <li className="px-4 py-3 text-gray-500 dark:text-gray-400">No matching tags found</li>
            )}

            {!isLoading &&
              options.map((option, index) => {
                const isCreate = isCreateTagOption(option);
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={isCreate ? `create-${option.name}` : option.id}
                    id={`${generatedId}-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    onClick={() => handleSelectTag(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      px-4 py-2 cursor-pointer transition-colors
                      ${isHighlighted ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                    `}
                  >
                    {isCreate ? (
                      <span className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Create &quot;{option.name}&quot;
                      </span>
                    ) : (
                      <span className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-gray-100">{option.name}</span>
                        {option.usageCount !== undefined && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {option.usageCount} topic{option.usageCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Error / Hint */}
      {validation.error && selectedTags.length > 0 && (
        <p
          id={`${generatedId}-error`}
          className="mt-1.5 text-sm text-fallacy-DEFAULT dark:text-red-400"
          role="alert"
        >
          {validation.error}
        </p>
      )}

      {selectedTags.length === 0 && (
        <p id={`${generatedId}-hint`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {minTags === 1 ? 'At least 1 tag required' : `${minTags}-${maxTags} tags required`}
        </p>
      )}
    </div>
  );
}

export default TagSelector;
