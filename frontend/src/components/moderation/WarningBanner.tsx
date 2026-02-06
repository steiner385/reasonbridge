/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WarningBanner - Display user warnings and moderation alerts
 *
 * Shows moderation warnings and other alerts to users with appropriate
 * styling and optional dismiss functionality. Supports different warning
 * types and severity levels.
 */

import { useState } from 'react';
import type {
  ModerationAction,
  ModerationActionType,
  ModerationSeverity,
} from '../../types/moderation';

export interface WarningBannerProps {
  /**
   * The warning/moderation action to display
   */
  warning: ModerationAction;

  /**
   * Whether the banner can be dismissed by the user
   */
  dismissible?: boolean;

  /**
   * Callback when the banner is dismissed
   */
  onDismiss?: () => void;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Whether to show additional details
   */
  showDetails?: boolean;

  /**
   * Custom message to display instead of default
   */
  customMessage?: string;
}

/**
 * Get the appropriate styling for a warning type and severity
 */
const getWarningStyles = (
  actionType: ModerationActionType,
  severity: ModerationSeverity,
): {
  bg: string;
  border: string;
  icon: string;
  title: string;
} => {
  // Non-punitive warnings (educate, warn)
  if (severity === 'non_punitive') {
    if (actionType === 'educate') {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: '💡',
        title: 'Educational Notice',
      };
    }
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: '⚠️',
      title: 'Warning',
    };
  }

  // Consequential warnings (hide, remove, suspend, ban)
  if (actionType === 'suspend') {
    return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: '🛑',
      title: 'Account Suspended',
    };
  }
  if (actionType === 'ban') {
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '🚫',
      title: 'Account Banned',
    };
  }

  // Other consequential actions
  return {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '⛔',
    title: 'Moderation Action',
  };
};

/**
 * Get text color classes based on severity
 */
const getTextColors = (
  severity: ModerationSeverity,
): { title: string; text: string; button: string } => {
  if (severity === 'non_punitive') {
    return {
      title: 'text-gray-900',
      text: 'text-gray-700',
      button: 'hover:bg-gray-200 text-gray-600',
    };
  }
  return {
    title: 'text-gray-900',
    text: 'text-gray-700',
    button: 'hover:bg-gray-300 text-gray-700',
  };
};

/**
 * Format the date in a user-friendly way
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format action type for display
 */
const formatActionType = (actionType: ModerationActionType): string => {
  const typeMap: Record<ModerationActionType, string> = {
    educate: 'Educational Notice',
    warn: 'Warning',
    hide: 'Content Hidden',
    remove: 'Content Removed',
    suspend: 'Account Suspended',
    ban: 'Account Banned',
  };
  return typeMap[actionType] || actionType;
};

/**
 * Get appropriate SVG icon for the warning
 */
const getIcon = (
  actionType: ModerationActionType,
  severity: ModerationSeverity,
): React.ReactNode => {
  if (severity === 'non_punitive') {
    if (actionType === 'educate') {
      return (
        <svg
          className="w-5 h-5 text-blue-600"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M9.663 17h4.673M12 3a9 9 0 110 18 9 9 0 010-18zM12 8v5m3-7a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      );
    }
    // warn
    return (
      <svg
        className="w-5 h-5 text-yellow-600"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9.401 3.003c1.492-2.01 4.102-2.01 5.594 0l7.477 10.08c1.503 2.02.003 4.917-2.797 4.917H4.717c-2.8 0-4.3-2.897-2.796-4.917L9.4 3.003zM12 8.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V9.25A.75.75 0 0112 8.5zm0 8a.75.75 0 100-1.5.75.75 0 000 1.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (actionType === 'suspend') {
    return (
      <svg
        className="w-5 h-5 text-orange-600"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V19a3 3 0 01-3 3H6.75a3 3 0 01-3-3V5.507c0-1.47 1.073-2.756 2.57-2.93z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // ban or other severe actions
  return (
    <svg
      className="w-5 h-5 text-red-600"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12s4.477 10 10 10 10-4.484 10-10S17.523 2 12 2zM7 12a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 017 12z"
        clipRule="evenodd"
      />
    </svg>
  );
};

const WarningBanner: React.FC<WarningBannerProps> = ({
  warning,
  dismissible = true,
  onDismiss,
  className = '',
  showDetails = true,
  customMessage,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const styles = getWarningStyles(warning.actionType, warning.severity);
  const textColors = getTextColors(warning.severity);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const isConsequential = warning.severity === 'consequential';

  return (
    <div
      className={`${styles.bg} border-l-4 ${styles.border} rounded-lg p-4 mb-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{getIcon(warning.actionType, warning.severity)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${textColors.title}`}>
            {formatActionType(warning.actionType)}
          </h3>

          {customMessage ? (
            <p className={`text-sm mt-1 ${textColors.text}`}>{customMessage}</p>
          ) : (
            <p className={`text-sm mt-1 ${textColors.text}`}>{warning.reasoning}</p>
          )}

          {/* Details section */}
          {showDetails && (
            <div className={`text-xs ${textColors.text} mt-2 space-y-1`}>
              {warning.aiConfidence !== undefined && (
                <p>
                  AI Confidence:{' '}
                  <span className="font-medium">{(warning.aiConfidence * 100).toFixed(0)}%</span>
                </p>
              )}
              <p>
                Issued: <span className="font-medium">{formatDate(warning.createdAt)}</span>
              </p>
              {isConsequential && warning.expiresAt && (
                <p>
                  Expires: <span className="font-medium">{formatDate(warning.expiresAt)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={`flex-shrink-0 inline-flex text-gray-400 ${textColors.button} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            aria-label="Dismiss warning"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
      </div>
    </div>
  );
};

export default WarningBanner;
