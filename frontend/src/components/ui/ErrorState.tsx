/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import Button from './Button';
import Card from './Card';

export interface ErrorStateProps {
  /**
   * Error title
   */
  title?: string;

  /**
   * Error message/description
   */
  message?: string;

  /**
   * Optional retry callback
   */
  onRetry?: () => void;

  /**
   * Optional custom icon
   */
  icon?: ReactNode;

  /**
   * Whether to show the retry button
   */
  showRetry?: boolean;

  /**
   * Retry button label
   */
  retryLabel?: string;

  /**
   * Whether to wrap in a Card (defaults to true)
   */
  wrapped?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * ErrorState - Displays error state with optional retry action
 *
 * Features:
 * - Customizable title and message
 * - Optional retry button
 * - Custom icon support
 * - Dark mode support
 * - Can be wrapped in Card or used standalone
 * - Accessibility attributes
 *
 * @example
 * // Basic error state
 * <ErrorState
 *   title="Failed to load"
 *   message="Unable to fetch data"
 *   onRetry={() => refetch()}
 * />
 *
 * @example
 * // Unwrapped error state
 * <ErrorState
 *   message="Something went wrong"
 *   wrapped={false}
 * />
 */
function ErrorState({
  title = 'Error',
  message = 'Something went wrong. Please try again.',
  onRetry,
  icon,
  showRetry = true,
  retryLabel = 'Try Again',
  wrapped = true,
  className = '',
}: ErrorStateProps) {
  const content = (
    <div className={`text-center py-8 ${className}`}>
      {/* Icon */}
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        {icon || (
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>

      {/* Message */}
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">{message}</p>

      {/* Retry Button */}
      {showRetry && onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );

  if (wrapped) {
    return (
      <Card variant="elevated" padding="lg">
        {content}
      </Card>
    );
  }

  return content;
}

export default ErrorState;
