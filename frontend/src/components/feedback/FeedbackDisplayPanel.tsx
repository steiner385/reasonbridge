/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Feedback, FeedbackType } from '../../types/feedback';

export interface FeedbackDisplayPanelProps {
  /**
   * Array of feedback items to display
   */
  feedback: Feedback[];

  /**
   * Optional title for the feedback panel
   */
  title?: string;

  /**
   * Optional callback when a feedback item is dismissed
   */
  onDismiss?: (feedbackId: string) => void;

  /**
   * Whether to show the dismiss button for each feedback item
   */
  showDismiss?: boolean;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show an empty state when no feedback is available
   */
  showEmptyState?: boolean;

  /**
   * Custom empty state message
   */
  emptyStateMessage?: string;
}

/**
 * Get styling classes based on feedback type
 */
const getFeedbackStyles = (type: FeedbackType) => {
  const styles = {
    AFFIRMATION: {
      container: 'bg-green-50 border-green-500',
      badge: 'bg-green-100 text-green-800',
    },
    FALLACY: {
      container: 'bg-red-50 border-red-500',
      badge: 'bg-red-100 text-red-800',
    },
    INFLAMMATORY: {
      container: 'bg-orange-50 border-orange-500',
      badge: 'bg-orange-100 text-orange-800',
    },
    UNSOURCED: {
      container: 'bg-yellow-50 border-yellow-500',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    BIAS: {
      container: 'bg-blue-50 border-blue-500',
      badge: 'bg-blue-100 text-blue-800',
    },
  };

  return styles[type] || styles.BIAS;
};

/**
 * FeedbackDisplayPanel - A reusable component for displaying AI feedback
 *
 * This component displays a list of feedback items with appropriate styling
 * based on feedback type (AFFIRMATION, FALLACY, INFLAMMATORY, UNSOURCED, BIAS).
 */
const FeedbackDisplayPanel: React.FC<FeedbackDisplayPanelProps> = ({
  feedback,
  title = 'AI Feedback',
  onDismiss,
  showDismiss = false,
  className = '',
  showEmptyState = false,
  emptyStateMessage = 'No feedback available',
}) => {
  // Filter out dismissed feedback (where dismissedAt is set)
  const activeFeedback = feedback.filter((item) => !item.dismissedAt);

  // Early return if no feedback and empty state is not shown
  if (activeFeedback.length === 0 && !showEmptyState) {
    return null;
  }

  // Empty state
  if (activeFeedback.length === 0 && showEmptyState) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-gray-500">{emptyStateMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>}
      <div className="space-y-3">
        {activeFeedback.map((item) => {
          const styles = getFeedbackStyles(item.type);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-l-4 ${styles.container}`}
              role="article"
              aria-label={`${item.type} feedback`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${styles.badge}`}>
                    {item.type}
                  </span>
                  {item.subtype && <span className="text-xs text-gray-600">({item.subtype})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {Math.round(item.confidenceScore * 100)}% confident
                  </span>
                  {showDismiss && onDismiss && (
                    <button
                      type="button"
                      onClick={() => onDismiss(item.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Dismiss feedback"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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

              <p className="text-sm text-gray-800 mb-2">{item.suggestionText}</p>

              {item.reasoning && <p className="text-xs text-gray-600 italic">{item.reasoning}</p>}

              {item.educationalResources && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Educational Resources:</p>
                  <div className="text-xs text-gray-600">
                    {Object.entries(item.educationalResources).map(([key, value]) => (
                      <div key={key} className="mb-1">
                        <span className="font-medium">{key}:</span>{' '}
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeedbackDisplayPanel;
