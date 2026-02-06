/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { PreviewFeedbackItem } from '../../lib/feedback-api';

export interface FeedbackItemProps {
  /** The feedback item to display */
  item: PreviewFeedbackItem;
  /** Whether to show the educational resources section */
  showEducationalResources?: boolean;
  /** Optional className for custom styling */
  className?: string;
}

interface FeedbackTypeStyle {
  container: string;
  badge: string;
  icon: string;
}

const DEFAULT_STYLE: FeedbackTypeStyle = {
  container: 'bg-blue-50 border-blue-200',
  badge: 'bg-blue-100 text-blue-800',
  icon: '⚖',
};

/**
 * Get styling classes based on feedback type
 */
const getFeedbackTypeStyles = (type: string): FeedbackTypeStyle => {
  const styles: Record<string, FeedbackTypeStyle> = {
    AFFIRMATION: {
      container: 'bg-green-50 border-green-200',
      badge: 'bg-green-100 text-green-800',
      icon: '✓',
    },
    FALLACY: {
      container: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: '⚠',
    },
    INFLAMMATORY: {
      container: 'bg-orange-50 border-orange-200',
      badge: 'bg-orange-100 text-orange-800',
      icon: '🔥',
    },
    UNSOURCED: {
      container: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: '?',
    },
    BIAS: {
      container: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      icon: '⚖',
    },
  };

  return styles[type] ?? DEFAULT_STYLE;
};

/**
 * Format confidence score as percentage
 */
const formatConfidence = (score: number): string => {
  return `${Math.round(score * 100)}%`;
};

/**
 * FeedbackItem - Displays a single feedback item from preview analysis
 *
 * Shows the feedback type, suggestion, reasoning, and optionally
 * educational resources. Supports expanding/collapsing details.
 */
export const FeedbackItem: React.FC<FeedbackItemProps> = ({
  item,
  showEducationalResources = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = getFeedbackTypeStyles(item.type);

  const hasResources =
    showEducationalResources &&
    item.educationalResources?.links &&
    item.educationalResources.links.length > 0;

  return (
    <div
      className={`border rounded-lg p-3 ${styles.container} ${className}`}
      role="article"
      aria-label={`${item.type} feedback`}
    >
      {/* Header row with type badge and confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}
          >
            <span className="mr-1">{styles.icon}</span>
            {item.type}
            {item.subtype && <span className="ml-1 opacity-75">({item.subtype})</span>}
          </span>
        </div>
        <span className="text-xs text-gray-500" title="Confidence score">
          {formatConfidence(item.confidenceScore)}
        </span>
      </div>

      {/* Suggestion text */}
      <p className="text-sm text-gray-800 mb-2">{item.suggestionText}</p>

      {/* Expandable reasoning section */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded"
        aria-expanded={isExpanded}
        aria-controls={`reasoning-${item.type}-${item.confidenceScore}`}
      >
        {isExpanded ? 'Hide details' : 'Show details'}
      </button>

      {isExpanded && (
        <div
          id={`reasoning-${item.type}-${item.confidenceScore}`}
          className="mt-2 pt-2 border-t border-gray-200"
        >
          {/* Reasoning */}
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-600">Why:</span>
            <p className="text-xs text-gray-700 mt-0.5">{item.reasoning}</p>
          </div>

          {/* Educational resources */}
          {hasResources && (
            <div>
              <span className="text-xs font-medium text-gray-600">Learn more:</span>
              <ul className="mt-1 space-y-1">
                {item.educationalResources!.links!.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {link.title} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackItem;
