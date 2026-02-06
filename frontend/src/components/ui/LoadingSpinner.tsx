/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Optional label to display alongside the spinner
   */
  label?: string;

  /**
   * Whether to center the spinner in its container
   */
  centered?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Color variant of the spinner
   */
  variant?: 'primary' | 'secondary' | 'white';
}

/**
 * LoadingSpinner - Animated circular loading indicator
 *
 * Features:
 * - Multiple size variants (sm, md, lg, xl)
 * - Color variants (primary, secondary, white)
 * - Optional label text
 * - Centered positioning option
 * - Dark mode support
 * - Accessibility attributes
 *
 * @example
 * // Basic spinner
 * <LoadingSpinner />
 *
 * @example
 * // Large spinner with label
 * <LoadingSpinner size="lg" label="Loading data..." />
 *
 * @example
 * // Centered white spinner for dark backgrounds
 * <LoadingSpinner variant="white" centered />
 */
function LoadingSpinner({
  size = 'md',
  label,
  centered = false,
  className = '',
  variant = 'primary',
}: LoadingSpinnerProps) {
  // Size mappings
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  // Color mappings
  const colorClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    secondary: 'text-secondary-600 dark:text-secondary-400',
    white: 'text-white',
  };

  const spinnerElement = (
    <svg
      className={`${sizeClasses[size]} ${colorClasses[variant]} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-busy="true"
      aria-label={label || 'Loading'}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (!label && !centered) {
    return <div className={className}>{spinnerElement}</div>;
  }

  return (
    <div
      className={`
        flex items-center gap-3
        ${centered ? 'justify-center' : ''}
        ${className}
      `}
    >
      {spinnerElement}
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-300" aria-live="polite">
          {label}
        </span>
      )}
    </div>
  );
}

export default LoadingSpinner;
