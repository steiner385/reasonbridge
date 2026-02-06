/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';
import { FeedbackItem } from './FeedbackItem';
import { ReadyToPostIndicator } from './ReadyToPostIndicator';
import { SensitivitySelector } from './SensitivitySelector';

export interface PreviewFeedbackPanelProps {
  /** Array of feedback items to display */
  feedback: PreviewFeedbackItem[];
  /** Whether feedback is currently loading */
  isLoading?: boolean;
  /** Whether content is ready to post (no critical issues) */
  readyToPost?: boolean;
  /** Summary message to display */
  summary?: string;
  /** Error message if feedback fetch failed */
  error?: string | null;
  /** Optional className for custom styling */
  className?: string;
  /** Whether to show the panel even when empty */
  showEmpty?: boolean;
  /** Current sensitivity level */
  sensitivity?: FeedbackSensitivity;
  /** Callback when sensitivity changes */
  onSensitivityChange?: (sensitivity: FeedbackSensitivity) => void;
}

/**
 * Loading skeleton for feedback items
 */
const FeedbackSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="h-4 bg-gray-200 rounded w-12" />
    </div>
    <div className="h-3 bg-gray-200 rounded w-full" />
    <div className="h-3 bg-gray-200 rounded w-3/4" />
  </div>
);

/**
 * PreviewFeedbackPanel - Displays real-time feedback during content composition
 *
 * This panel appears below the compose area and shows AI-generated feedback
 * as the user types. It includes a summary message, ready-to-post indicator,
 * and individual feedback items.
 *
 * @example
 * ```tsx
 * const { feedback, isLoading, readyToPost, summary } = usePreviewFeedback(content);
 *
 * {content.length >= 20 && (
 *   <PreviewFeedbackPanel
 *     feedback={feedback}
 *     isLoading={isLoading}
 *     readyToPost={readyToPost}
 *     summary={summary}
 *   />
 * )}
 * ```
 */
export const PreviewFeedbackPanel: React.FC<PreviewFeedbackPanelProps> = ({
  feedback,
  isLoading = false,
  readyToPost = true,
  summary = '',
  error = null,
  className = '',
  showEmpty = false,
  sensitivity = 'MEDIUM',
  onSensitivityChange,
}) => {
  // Don't render if no feedback and not loading and not showing empty state
  if (!showEmpty && !isLoading && feedback.length === 0 && !error) {
    return null;
  }

  return (
    <div
      className={`mt-3 rounded-lg border bg-white shadow-sm ${className}`}
      role="region"
      aria-label="Preview feedback"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {/* Header with summary */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Feedback Preview</h3>
          <div className="flex items-center gap-3">
            {onSensitivityChange && (
              <SensitivitySelector
                value={sensitivity}
                onChange={onSensitivityChange}
                disabled={isLoading}
              />
            )}
            {!error && <ReadyToPostIndicator readyToPost={readyToPost} isLoading={isLoading} />}
          </div>
        </div>
        {summary && !error && <p className="mt-1 text-sm text-gray-600">{summary}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      {/* Content area */}
      <div className="p-4">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            <FeedbackSkeleton />
            <FeedbackSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Unable to analyze content. Your response can still be posted.
            </p>
          </div>
        )}

        {/* Feedback items */}
        {!isLoading && !error && feedback.length > 0 && (
          <div className="space-y-3">
            {feedback.map((item, index) => (
              <FeedbackItem key={`${item.type}-${item.subtype || ''}-${index}`} item={item} />
            ))}
          </div>
        )}

        {/* Empty state (no issues found) */}
        {!isLoading && !error && feedback.length === 0 && showEmpty && (
          <div className="text-center py-4">
            <span className="text-2xl mb-2 block">✨</span>
            <p className="text-sm text-gray-600">
              No suggestions. Your response looks constructive!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewFeedbackPanel;
