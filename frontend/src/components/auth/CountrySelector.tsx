/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface CountrySelectorProps {
  /**
   * Current value (ISO 3166-1 alpha-2 code)
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
 * Common countries with consent ages for child safety
 * Ordered by likely usage (English-speaking first, then EU, then others)
 */
const COUNTRIES = [
  { code: 'US', name: 'United States', consentAge: 13 },
  { code: 'GB', name: 'United Kingdom', consentAge: 13 },
  { code: 'CA', name: 'Canada', consentAge: 13 },
  { code: 'AU', name: 'Australia', consentAge: 13 },
  { code: 'NZ', name: 'New Zealand', consentAge: 13 },
  { code: 'IE', name: 'Ireland', consentAge: 16 },
  // EU countries
  { code: 'DE', name: 'Germany', consentAge: 16 },
  { code: 'FR', name: 'France', consentAge: 16 },
  { code: 'IT', name: 'Italy', consentAge: 16 },
  { code: 'ES', name: 'Spain', consentAge: 14 },
  { code: 'NL', name: 'Netherlands', consentAge: 16 },
  { code: 'BE', name: 'Belgium', consentAge: 13 },
  { code: 'AT', name: 'Austria', consentAge: 14 },
  { code: 'SE', name: 'Sweden', consentAge: 13 },
  { code: 'DK', name: 'Denmark', consentAge: 13 },
  { code: 'FI', name: 'Finland', consentAge: 13 },
  { code: 'PT', name: 'Portugal', consentAge: 13 },
  { code: 'GR', name: 'Greece', consentAge: 15 },
  { code: 'PL', name: 'Poland', consentAge: 16 },
  { code: 'CZ', name: 'Czech Republic', consentAge: 15 },
  { code: 'HU', name: 'Hungary', consentAge: 16 },
  { code: 'RO', name: 'Romania', consentAge: 16 },
  // Other countries
  { code: 'JP', name: 'Japan', consentAge: 16 },
  { code: 'KR', name: 'South Korea', consentAge: 14 },
  { code: 'BR', name: 'Brazil', consentAge: 12 },
  { code: 'MX', name: 'Mexico', consentAge: 14 },
  { code: 'IN', name: 'India', consentAge: 18 },
  { code: 'SG', name: 'Singapore', consentAge: 13 },
];

/**
 * Country selector component for child safety features
 *
 * @remarks
 * Displays a dropdown of countries with their consent ages.
 * Used during registration to determine applicable child safety regulations.
 */
const CountrySelector = React.forwardRef<HTMLSelectElement, CountrySelectorProps>(
  ({ value = '', onChange, error, required = false, className = '', id }, ref) => {
    const generatedId = React.useId();
    const inputId = id || `country-${generatedId}`;
    const hasError = Boolean(error);

    // Base select styles (matching Input component)
    const baseStyles =
      'rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-base w-full appearance-none cursor-pointer';

    const stateStyles = hasError
      ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20 dark:border-red-500 dark:focus:border-red-400'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:focus:border-primary-400';

    const selectClassName = `${baseStyles} ${stateStyles} ${className}`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Country of Residence
          {required && <span className="text-fallacy-DEFAULT dark:text-red-400 ml-1">*</span>}
        </label>

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={selectClassName}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : `${inputId}-helper`}
            required={required}
          >
            <option value="">Select your country</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>

          {/* Dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

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
            Used to determine applicable child safety regulations
          </p>
        )}
      </div>
    );
  },
);

CountrySelector.displayName = 'CountrySelector';

export default CountrySelector;
