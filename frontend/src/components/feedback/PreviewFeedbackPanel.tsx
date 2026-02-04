import React from 'react';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';
import { FeedbackItem } from './FeedbackItem';
import { ReadyToPostIndicator } from './ReadyToPostIndicator';
import { SensitivitySelector } from './SensitivitySelector';

export interface PreviewFeedbackPanelProps {
  /** Array of feedback items to display */
  feedback: PreviewFeedbackItem[];
  /** Whether regex feedback is currently loading */
  isLoading?: boolean;
  /** Whether AI feedback is currently loading */
  isAILoading?: boolean;
  /** Whether the current feedback is from AI (vs regex) */
  isAIFeedback?: boolean;
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
  isAILoading = false,
  isAIFeedback = false,
  readyToPost = true,
  summary = '',
  error = null,
  className = '',
  showEmpty = false,
  sensitivity = 'MEDIUM',
  onSensitivityChange,
}) => {
  // Don't render if no feedback and not loading and not showing empty state
  if (!showEmpty && !isLoading && !isAILoading && feedback.length === 0 && !error) {
    return null;
  }

  const anyLoading = isLoading || isAILoading;

  return (
    <div
      className={`mt-3 rounded-lg border bg-white shadow-sm ${className}`}
      role="region"
      aria-label="Preview feedback"
      aria-live="polite"
      aria-busy={anyLoading}
    >
      {/* Header with summary */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900">Feedback Preview</h3>
            {isAIFeedback && !isAILoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                ✨ AI
              </span>
            )}
            {isAILoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                🤖 Analyzing...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onSensitivityChange && (
              <SensitivitySelector
                value={sensitivity}
                onChange={onSensitivityChange}
                disabled={anyLoading}
              />
            )}
            {!error && <ReadyToPostIndicator readyToPost={readyToPost} isLoading={anyLoading} />}
          </div>
        </div>
        {summary && !error && <p className="mt-1 text-sm text-gray-600">{summary}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      {/* Content area */}
      <div className="p-4">
        {/* Loading state - show loading skeleton while regex or AI is loading */}
        {anyLoading && feedback.length === 0 && (
          <div className="space-y-3">
            <FeedbackSkeleton />
            <FeedbackSkeleton />
          </div>
        )}

        {/* AI Loading with existing feedback - show existing feedback with loading indicator */}
        {isAILoading && feedback.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-blue-600 font-medium mb-2">
              Refining analysis with AI...
            </div>
            {feedback.map((item, index) => (
              <FeedbackItem key={`${item.type}-${item.subtype || ''}-${index}`} item={item} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !anyLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Unable to analyze content. Your response can still be posted.
            </p>
          </div>
        )}

        {/* Feedback items */}
        {!anyLoading && !error && feedback.length > 0 && (
          <div className="space-y-3">
            {feedback.map((item, index) => (
              <FeedbackItem key={`${item.type}-${item.subtype || ''}-${index}`} item={item} />
            ))}
          </div>
        )}

        {/* Empty state (no issues found) */}
        {!anyLoading && !error && feedback.length === 0 && showEmpty && (
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
