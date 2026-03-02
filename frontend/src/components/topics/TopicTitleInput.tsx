/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T224 [US6] - Topic Title Input with Validation
 *
 * Reusable topic title input component with:
 * - Real-time character count and validation
 * - Min/max length enforcement (10-200 chars)
 * - Visual feedback for validation state
 * - Accessible error messaging
 */

import React, { useCallback, useMemo } from 'react';

export interface TopicTitleValidation {
  isValid: boolean;
  error: string | null;
  charCount: number;
  remainingChars: number;
  isAtMinimum: boolean;
  isAtMaximum: boolean;
}

export interface TopicTitleInputProps {
  /** Current title value */
  value: string;
  /** Handler for value changes */
  onChange: (value: string) => void;
  /** Handler called when validation state changes */
  onValidationChange?: (validation: TopicTitleValidation) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to show the input in an error state (external error) */
  hasExternalError?: boolean;
  /** External error message to display */
  externalError?: string;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
  /** Custom minimum length (default: 10) */
  minLength?: number;
  /** Custom maximum length (default: 200) */
  maxLength?: number;
  /** Custom ID for the input element */
  id?: string;
  /** Additional className for the container */
  className?: string;
}

/** Validation constants */
const DEFAULT_MIN_LENGTH = 10;
const DEFAULT_MAX_LENGTH = 200;

/**
 * Hook to calculate topic title validation state
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTopicTitleValidation(
  value: string,
  minLength = DEFAULT_MIN_LENGTH,
  maxLength = DEFAULT_MAX_LENGTH,
): TopicTitleValidation {
  return useMemo(() => {
    const charCount = value.length;
    const remainingChars = maxLength - charCount;
    const isAtMinimum = charCount >= minLength;
    const isAtMaximum = charCount >= maxLength;

    let error: string | null = null;
    let isValid = true;

    if (charCount > 0 && charCount < minLength) {
      error = `${minLength - charCount} more character${minLength - charCount === 1 ? '' : 's'} needed`;
      isValid = false;
    } else if (charCount > maxLength) {
      error = `Title exceeds maximum length by ${charCount - maxLength} character${charCount - maxLength === 1 ? '' : 's'}`;
      isValid = false;
    } else if (charCount === 0) {
      isValid = false;
    }

    return {
      isValid,
      error,
      charCount,
      remainingChars,
      isAtMinimum,
      isAtMaximum,
    };
  }, [value, minLength, maxLength]);
}

/**
 * Topic title input component with built-in validation
 */
export function TopicTitleInput({
  value,
  onChange,
  onValidationChange,
  placeholder = 'E.g., Should we implement carbon taxes to combat climate change?',
  disabled = false,
  hasExternalError = false,
  externalError,
  autoFocus = false,
  minLength = DEFAULT_MIN_LENGTH,
  maxLength = DEFAULT_MAX_LENGTH,
  id = 'topic-title',
  className = '',
}: TopicTitleInputProps) {
  const validation = useTopicTitleValidation(value, minLength, maxLength);

  // Notify parent of validation changes
  React.useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // Prevent typing beyond max length
      if (newValue.length <= maxLength) {
        onChange(newValue);
      }
    },
    [onChange, maxLength],
  );

  // Determine if we should show an error
  const showError = hasExternalError || (value.length > 0 && validation.error);
  const errorMessage = externalError || validation.error;

  // Character count color based on progress
  const getCharCountColor = () => {
    if (validation.charCount === 0) return 'text-gray-400 dark:text-gray-500';
    if (!validation.isAtMinimum) return 'text-amber-600 dark:text-amber-400';
    if (validation.remainingChars < 20) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Progress indicator width
  const progressWidth = Math.min((validation.charCount / maxLength) * 100, 100);
  const progressColor =
    validation.charCount === 0
      ? 'bg-gray-200 dark:bg-gray-700'
      : !validation.isAtMinimum
        ? 'bg-amber-400 dark:bg-amber-500'
        : validation.remainingChars < 20
          ? 'bg-amber-400 dark:bg-amber-500'
          : 'bg-green-500 dark:bg-green-400';

  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Title <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          type="text"
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${id}-error` : `${id}-hint`}
          className={`
            w-full px-4 py-3
            border rounded-lg
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            ${
              showError
                ? 'border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500/20'
            }
          `}
        />

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${progressColor}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Footer with error/hint and character count */}
      <div className="flex justify-between items-start mt-1.5">
        <div className="flex-1">
          {showError ? (
            <p id={`${id}-error`} className="text-xs text-red-700 dark:text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : (
            <p id={`${id}-hint`} className="text-xs text-gray-500 dark:text-gray-400">
              {minLength}-{maxLength} characters
            </p>
          )}
        </div>

        <p className={`text-xs font-medium ml-4 ${getCharCountColor()}`}>
          {validation.charCount}/{maxLength}
        </p>
      </div>
    </div>
  );
}

export default TopicTitleInput;
