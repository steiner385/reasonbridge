/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface PendingResponseNoticeProps {
  /**
   * Whether to show the notice
   */
  show: boolean;

  /**
   * Callback when dismissed
   */
  onDismiss?: () => void;

  /**
   * Optional custom message override
   */
  message?: string;
}

/**
 * Child-friendly notice displayed after a minor submits a response
 *
 * Shows a friendly, non-alarming message informing the user that their
 * content is being reviewed. Uses soft colors (light blue/gentle green)
 * and friendly language appropriate for younger users.
 *
 * @remarks
 * - **Child-Friendly Design**: Uses encouraging language and soft colors
 * - **Accessibility**: Includes ARIA attributes for screen reader support
 * - **Dark Mode**: Supports dark theme via Tailwind dark: modifiers
 * - **Dismissible**: Optional dismiss button to hide the notice
 *
 * @param props - Component props
 * @returns Rendered notice component or null if not shown
 *
 * @example
 * ```tsx
 * <PendingResponseNotice
 *   show={true}
 *   onDismiss={() => setShowNotice(false)}
 * />
 * ```
 */
export function PendingResponseNotice({
  show,
  onDismiss,
  message,
}: PendingResponseNoticeProps): React.ReactElement | null {
  if (!show) {
    return null;
  }

  const defaultMessage = 'Your response is being checked by a helper. It will show up soon!';
  const displayMessage = message || defaultMessage;

  return (
    <div
      className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 rounded-lg p-4"
      role="status"
      aria-live="polite"
      data-testid="pending-response-notice"
    >
      <div className="flex items-start gap-3">
        {/* Clock with checkmark icon - friendly and reassuring */}
        <svg
          className="h-5 w-5 text-sky-500 dark:text-sky-400 mt-0.5 shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sky-800 dark:text-sky-200 text-sm font-medium">{displayMessage}</p>
          <p className="text-sky-600 dark:text-sky-300 text-xs mt-1">Usually within 24 hours</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-sky-500 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-200 transition-colors"
            aria-label="Dismiss message"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default PendingResponseNotice;
