/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T227 [US6] - Topic Feedback Panel
 *
 * Displays AI-powered feedback during topic creation.
 * Shows insights on title, description, and proposition quality.
 */

import React from 'react';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';
import type { TopicFeedbackInsights } from '../../hooks/useTopicFeedback';
import { LoadingBridge } from '../ui/LoadingBridge';
import { FeedbackItem } from '../feedback/FeedbackItem';
import { SensitivitySelector } from '../feedback/SensitivitySelector';

export interface TopicFeedbackPanelProps {
  /** Array of feedback items from AI analysis */
  feedback: PreviewFeedbackItem[];
  /** Topic-specific insights */
  insights: TopicFeedbackInsights;
  /** Whether feedback is currently loading */
  isLoading?: boolean;
  /** Whether topic is ready to create */
  readyToCreate?: boolean;
  /** Summary message from AI */
  summary?: string;
  /** Error message if feedback failed */
  error?: string | null;
  /** Current sensitivity level */
  sensitivity?: FeedbackSensitivity;
  /** Callback when sensitivity changes */
  onSensitivityChange?: (sensitivity: FeedbackSensitivity) => void;
  /** Optional className for styling */
  className?: string;
  /** Whether to show the panel even when empty */
  showEmpty?: boolean;
}

/**
 * Quality badge for insights
 */
const QualityBadge: React.FC<{
  label: string;
  quality:
    | 'good'
    | 'needs-improvement'
    | 'balanced'
    | 'unbalanced'
    | 'incomplete'
    | 'unknown'
    | 'excellent'
    | 'poor';
}> = ({ label, quality }) => {
  const styles: Record<string, string> = {
    excellent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    balanced: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'needs-improvement': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    unbalanced: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    incomplete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    poor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const icons: Record<string, string> = {
    excellent: '✓',
    good: '✓',
    balanced: '⚖',
    'needs-improvement': '!',
    unbalanced: '⚖',
    incomplete: '○',
    poor: '✗',
    unknown: '?',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[quality] || styles['unknown']}`}
    >
      <span>{icons[quality] || '?'}</span>
      {label}
    </span>
  );
};

/**
 * Ready to create indicator
 */
const ReadyIndicator: React.FC<{ ready: boolean; isLoading: boolean }> = ({ ready, isLoading }) => {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        Analyzing...
      </span>
    );
  }

  if (ready) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Ready to create
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      Needs attention
    </span>
  );
};

/**
 * Loading skeleton for feedback panel
 */
const FeedbackSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="flex items-center gap-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
    </div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
  </div>
);

/**
 * AI Loading banner for topic analysis
 */
const AILoadingBanner: React.FC = () => (
  <div className="mb-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4">
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <LoadingBridge size="md" label="Analyzing topic" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Analyzing Your Topic
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Checking for clarity, balance, and potential issues...
        </p>
      </div>
    </div>
  </div>
);

/**
 * TopicFeedbackPanel - Displays AI feedback during topic creation
 *
 * This component shows:
 * - Topic structure insights (title clarity, proposition balance)
 * - AI-generated feedback items
 * - Ready-to-create indicator
 * - Sensitivity controls
 *
 * @example
 * ```tsx
 * const { feedback, insights, isLoading, readyToCreate, summary } = useTopicFeedback(topicData);
 *
 * <TopicFeedbackPanel
 *   feedback={feedback}
 *   insights={insights}
 *   isLoading={isLoading}
 *   readyToCreate={readyToCreate}
 *   summary={summary}
 * />
 * ```
 */
export const TopicFeedbackPanel: React.FC<TopicFeedbackPanelProps> = ({
  feedback,
  insights,
  isLoading = false,
  readyToCreate = true,
  summary = '',
  error = null,
  sensitivity = 'MEDIUM',
  onSensitivityChange,
  className = '',
  showEmpty = false,
}) => {
  const hasInsights =
    insights.titleClarity !== 'unknown' ||
    insights.descriptionQuality !== 'unknown' ||
    insights.propositionBalance !== 'unknown';

  const hasSuggestions = insights.suggestions.length > 0;
  const hasFeedback = feedback.length > 0;

  // Don't render if nothing to show and not loading
  if (!showEmpty && !isLoading && !hasInsights && !hasSuggestions && !hasFeedback && !error) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-800 shadow-sm ${isLoading ? 'ring-2 ring-blue-200 dark:ring-blue-800 ring-opacity-50' : ''} ${className}`}
      role="region"
      aria-label="Topic feedback"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Topic Review</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-linear-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              ✨ AI-Powered
            </span>
          </div>
          <div className="flex items-center gap-3">
            {onSensitivityChange && (
              <SensitivitySelector
                value={sensitivity}
                onChange={onSensitivityChange}
                disabled={isLoading}
              />
            )}
            <ReadyIndicator ready={readyToCreate} isLoading={isLoading} />
          </div>
        </div>
        {summary && !error && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{summary}</p>
        )}
        {error && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* AI Loading state */}
        {isLoading && <AILoadingBanner />}

        {/* Structure Insights */}
        {hasInsights && !isLoading && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Structure Analysis
            </h4>
            <div className="flex flex-wrap gap-2">
              {insights.titleClarity !== 'unknown' && (
                <QualityBadge
                  label={`Title: ${insights.titleClarity}`}
                  quality={insights.titleClarity}
                />
              )}
              {insights.descriptionQuality !== 'unknown' && (
                <QualityBadge
                  label={`Description: ${insights.descriptionQuality}`}
                  quality={insights.descriptionQuality}
                />
              )}
              {insights.propositionBalance !== 'unknown' && (
                <QualityBadge
                  label={`Propositions: ${insights.propositionBalance}`}
                  quality={insights.propositionBalance}
                />
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {hasSuggestions && !isLoading && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Suggestions
            </h4>
            <ul className="space-y-1">
              {insights.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Feedback Items */}
        {hasFeedback && !isLoading && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              AI Analysis
            </h4>
            {feedback.map((item, index) => (
              <FeedbackItem key={`${item.type}-${item.subtype || ''}-${index}`} item={item} />
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !hasInsights && <FeedbackSkeleton />}

        {/* Empty state */}
        {!isLoading && !error && !hasInsights && !hasSuggestions && !hasFeedback && showEmpty && (
          <div className="text-center py-6">
            <span className="text-2xl mb-2 block">📝</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start filling in your topic details to receive AI-powered feedback.
            </p>
          </div>
        )}

        {/* All good state */}
        {!isLoading &&
          !error &&
          hasInsights &&
          !hasSuggestions &&
          !hasFeedback &&
          readyToCreate && (
            <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl mb-2 block">✨</span>
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                Your topic looks great!
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                All quality checks passed. Ready to create your discussion.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default TopicFeedbackPanel;
