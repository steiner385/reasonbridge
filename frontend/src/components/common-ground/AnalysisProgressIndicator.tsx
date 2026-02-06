/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface AnalysisProgressIndicatorProps {
  /**
   * The current status of the analysis
   */
  status: 'idle' | 'processing' | 'complete' | 'failed';

  /**
   * Optional progress percentage (0-100)
   * Only relevant when status is 'processing'
   */
  progress?: number;

  /**
   * Optional message to display below the progress indicator
   */
  message?: string;

  /**
   * Optional error message to display when status is 'failed'
   */
  error?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Size variant of the progress indicator
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show the status text
   */
  showStatusText?: boolean;

  /**
   * Optional callback when user clicks retry (only shown when failed)
   */
  onRetry?: () => void;
}

/**
 * AnalysisProgressIndicator - Displays the progress state of common ground analysis
 *
 * This component shows:
 * - Loading spinner when processing
 * - Progress bar with percentage (if provided)
 * - Success checkmark when complete
 * - Error state with retry option when failed
 */
const AnalysisProgressIndicator: React.FC<AnalysisProgressIndicatorProps> = ({
  status,
  progress,
  message,
  error,
  className = '',
  size = 'md',
  showStatusText = true,
  onRetry,
}) => {
  // Size styles for spinner and icons
  const sizeStyles = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  // Text size styles
  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  // Status text labels
  const statusText = {
    idle: 'Ready to analyze',
    processing: 'Analyzing discussion...',
    complete: 'Analysis complete',
    failed: 'Analysis failed',
  };

  // Render idle state
  if (status === 'idle') {
    return (
      <div className={`flex flex-col items-center justify-center py-6 ${className}`}>
        <div className={`text-gray-400 ${sizeStyles[size]}`}>
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        {showStatusText && (
          <p className={`mt-3 font-medium text-gray-600 ${textSizeStyles[size]}`}>
            {statusText.idle}
          </p>
        )}
        {message && <p className={`mt-1 text-sm text-gray-500 text-center max-w-md`}>{message}</p>}
      </div>
    );
  }

  // Render processing state
  if (status === 'processing') {
    return (
      <div className={`flex flex-col items-center justify-center py-6 ${className}`}>
        <div className={`relative ${sizeStyles[size]}`}>
          {/* Spinning loader */}
          <svg
            className={`animate-spin ${sizeStyles[size]} text-primary-600`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Processing analysis"
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

        {showStatusText && (
          <p className={`mt-3 font-medium text-gray-900 ${textSizeStyles[size]}`}>
            {statusText.processing}
          </p>
        )}

        {/* Progress bar (if progress percentage is provided) */}
        {typeof progress === 'number' && (
          <div className="w-full max-w-md mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {message && <p className={`mt-3 text-sm text-gray-600 text-center max-w-md`}>{message}</p>}
      </div>
    );
  }

  // Render complete state
  if (status === 'complete') {
    return (
      <div className={`flex flex-col items-center justify-center py-6 ${className}`}>
        <div className={`text-green-600 ${sizeStyles[size]}`}>
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Analysis complete"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        {showStatusText && (
          <p className={`mt-3 font-medium text-green-700 ${textSizeStyles[size]}`}>
            {statusText.complete}
          </p>
        )}
        {message && <p className={`mt-1 text-sm text-gray-600 text-center max-w-md`}>{message}</p>}
      </div>
    );
  }

  // Render failed state
  if (status === 'failed') {
    return (
      <div className={`flex flex-col items-center justify-center py-6 ${className}`}>
        <div className={`text-red-600 ${sizeStyles[size]}`}>
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Analysis failed"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        {showStatusText && (
          <p className={`mt-3 font-medium text-red-700 ${textSizeStyles[size]}`}>
            {statusText.failed}
          </p>
        )}
        {(error || message) && (
          <p className={`mt-1 text-sm text-red-600 text-center max-w-md`}>{error || message}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-lg transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  // Should never reach here, but return null as fallback
  return null;
};

export default AnalysisProgressIndicator;
