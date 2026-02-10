/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface BirthDateInputProps {
  /**
   * Current value in YYYY-MM-DD format
   */
  value?: string;

  /**
   * Callback when value changes
   */
  onChange: (value: string) => void;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Unique ID for the input
   */
  id?: string;
}

/**
 * Birth date input component for child safety features
 *
 * @remarks
 * Uses HTML5 date input with appropriate constraints:
 * - Maximum date is today (can't be born in the future)
 * - Minimum date is 120 years ago (reasonable age limit)
 * - Format is YYYY-MM-DD (ISO 8601)
 */
const BirthDateInput = React.forwardRef<HTMLInputElement, BirthDateInputProps>(
  ({ value = '', onChange, error, required = false, className = '', id }, ref) => {
    const generatedId = React.useId();
    const inputId = id || `birthdate-${generatedId}`;
    const hasError = Boolean(error);

    // Calculate min and max dates
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0]; // Today
    const minYear = today.getFullYear() - 120;
    const minDate = `${minYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Base input styles (matching Input component)
    const baseStyles =
      'rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-base w-full';

    const stateStyles = hasError
      ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20 dark:border-red-500 dark:focus:border-red-400'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:focus:border-primary-400';

    const inputClassName = `${baseStyles} ${stateStyles} ${className}`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Date of Birth
          {required && <span className="text-fallacy-DEFAULT dark:text-red-400 ml-1">*</span>}
        </label>

        <input
          ref={ref}
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={minDate}
          max={maxDate}
          className={inputClassName}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-helper`}
          required={required}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-fallacy-DEFAULT dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {!error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-300">
            We use this to ensure age-appropriate content and comply with child safety laws
          </p>
        )}
      </div>
    );
  },
);

BirthDateInput.displayName = 'BirthDateInput';

export default BirthDateInput;
