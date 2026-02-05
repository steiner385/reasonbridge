import React from 'react';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';
import { LoadingBridge } from '../ui/LoadingBridge';
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
  /** Whether content is ready to post (no critical issues). Null means AI is still analyzing. */
  readyToPost?: boolean | null;
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
 * Prominent AI loading banner with ReasonBridge logo animation
 */
const AILoadingBanner: React.FC = () => (
  <div className="mb-4 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-sm">
    <div className="flex items-start gap-4">
      {/* ReasonBridge logo animation */}
      <div className="flex-shrink-0">
        <LoadingBridge size="lg" label="AI analyzing content" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-gray-900 mb-1">AI Analysis in Progress</h4>
        <p className="text-sm text-gray-600 mb-3">
          Claude is analyzing your response for nuanced tone, fallacies, and unsourced claims...
        </p>

        {/* Animated progress bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-[progress_2.5s_ease-in-out_infinite]"
            style={{
              width: '100%',
            }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          This usually takes 2-5 seconds • Using AWS Bedrock Claude 3.5 Sonnet
        </p>
      </div>
    </div>
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
      className={`mt-3 rounded-lg border bg-white shadow-sm ${isAILoading ? 'ring-2 ring-blue-200 ring-opacity-50' : ''} ${className}`}
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
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border border-purple-200">
                ✨ AI-Enhanced
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
        {/* Prominent AI loading banner */}
        {isAILoading && <AILoadingBanner />}

        {/* Loading state - show loading skeleton while regex is loading and no feedback yet */}
        {isLoading && !isAILoading && feedback.length === 0 && (
          <div className="space-y-3">
            <FeedbackSkeleton />
            <FeedbackSkeleton />
          </div>
        )}

        {/* Show existing feedback while AI is loading (regex results) */}
        {isAILoading && feedback.length > 0 && (
          <div className="space-y-3 opacity-60">
            <div className="text-xs text-gray-500 font-medium mb-2 italic">
              Quick check results (AI refining below...)
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
