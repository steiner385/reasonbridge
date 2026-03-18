/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T228 [US6] - Framing Suggestions Display
 *
 * Displays AI-powered framing suggestions for topic titles and descriptions.
 * Shows quality scores, suggested improvements, and individual framing issues.
 */

import React, { useState, useCallback } from 'react';
import type { FramingSuggestionsResponse, FramingSuggestion } from '../../lib/framing-api';
import {
  getScoreLevel,
  getScoreLevelColors,
  getIssueTypeColors,
  getIssueTypeLabel,
} from '../../lib/framing-api';
import { LoadingBridge } from '../ui/LoadingBridge';

export interface FramingSuggestionsDisplayProps {
  /** Framing suggestions response from AI */
  suggestions: FramingSuggestionsResponse | null;
  /** Whether suggestions are currently loading */
  isLoading?: boolean;
  /** Error message if fetching failed */
  error?: string | null;
  /** Callback when user accepts a suggestion */
  onAcceptSuggestion?: (suggestion: FramingSuggestion) => void;
  /** Callback when user dismisses a suggestion */
  onDismissSuggestion?: (suggestion: FramingSuggestion) => void;
  /** Callback when user accepts the suggested title */
  onAcceptTitle?: (suggestedTitle: string) => void;
  /** Whether to show accept/dismiss actions */
  showActions?: boolean;
  /** Whether to show quality scores */
  showScores?: boolean;
  /** Additional className for styling */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Quality score badge component
 */
const ScoreBadge: React.FC<{
  label: string;
  score: number;
  showValue?: boolean;
}> = ({ label, score, showValue = true }) => {
  const level = getScoreLevel(score);
  const colors = getScoreLevelColors(level);
  const percentage = Math.round(score * 100);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span>{label}</span>
      {showValue && <span className="font-semibold">{percentage}%</span>}
    </div>
  );
};

/**
 * Suggested title section
 */
const SuggestedTitleSection: React.FC<{
  originalTitle: string;
  suggestedTitle: string;
  onAccept?: () => void;
  showActions?: boolean;
}> = ({ originalTitle, suggestedTitle, onAccept, showActions }) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    onAccept?.();
  }, [onAccept]);

  if (accepted) {
    return (
      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <span className="text-green-500">✓</span>
          <span>Title suggestion applied</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
        Suggested Title Improvement
      </h4>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0 pt-0.5">
            Current:
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300 line-through">
            {originalTitle}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 w-16 shrink-0 pt-0.5">
            Suggested:
          </span>
          <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            {suggestedTitle}
          </span>
        </div>
      </div>

      {showActions && onAccept && (
        <button
          onClick={handleAccept}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors"
        >
          <span>✓</span>
          Apply Suggestion
        </button>
      )}
    </div>
  );
};

/**
 * Individual suggestion item
 */
const SuggestionItem: React.FC<{
  suggestion: FramingSuggestion;
  onAccept?: () => void;
  onDismiss?: () => void;
  showActions?: boolean;
}> = ({ suggestion, onAccept, onDismiss, showActions }) => {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'dismissed'>('pending');
  const colors = getIssueTypeColors(suggestion.issueType);
  const label = getIssueTypeLabel(suggestion.issueType);

  const handleAccept = useCallback(() => {
    setStatus('accepted');
    onAccept?.();
  }, [onAccept]);

  const handleDismiss = useCallback(() => {
    setStatus('dismissed');
    onDismiss?.();
  }, [onDismiss]);

  if (status === 'accepted') {
    return (
      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 opacity-75">
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <span className="text-green-500">✓</span>
          <span>Suggestion applied</span>
        </div>
      </div>
    );
  }

  if (status === 'dismissed') {
    return null;
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(suggestion.confidenceScore * 100)}% confidence
          </span>
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            {onAccept && (
              <button
                onClick={handleAccept}
                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                aria-label="Accept suggestion"
                title="Accept"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            )}
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Dismiss suggestion"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Original:</span>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 italic">
            &quot;{suggestion.originalText}&quot;
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggested:</span>
          <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 font-medium">
            &quot;{suggestion.suggestedText}&quot;
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">{suggestion.explanation}</p>
      </div>
    </div>
  );
};

/**
 * Loading state component
 */
const LoadingState: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <LoadingBridge size="sm" />
        <span>Analyzing framing...</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
      <div className="flex items-center gap-3">
        <LoadingBridge size="md" label="Analyzing framing" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Analyzing Topic Framing
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Checking for neutrality, clarity, and inclusivity...
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Error state component
 */
const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
  </div>
);

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
    <p className="text-sm">No framing suggestions available.</p>
    <p className="text-xs mt-1">Your topic framing looks good!</p>
  </div>
);

/**
 * All good state component
 */
const AllGoodState: React.FC<{
  neutralityScore: number;
  clarityScore: number;
  inclusivityScore: number;
}> = ({ neutralityScore, clarityScore, inclusivityScore }) => {
  const avgScore = (neutralityScore + clarityScore + inclusivityScore) / 3;
  const level = getScoreLevel(avgScore);

  if (level !== 'excellent' && level !== 'good') {
    return null;
  }

  return (
    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
      <span className="text-2xl mb-2 block">✨</span>
      <p className="text-sm font-medium text-green-700 dark:text-green-300">Great framing!</p>
      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
        Your topic is neutrally framed and clearly written.
      </p>
    </div>
  );
};

/**
 * FramingSuggestionsDisplay - Displays AI-powered framing analysis
 *
 * Shows quality scores for neutrality, clarity, and inclusivity,
 * along with specific suggestions for improving topic framing.
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, error } = useFramingSuggestions(title, description);
 *
 * <FramingSuggestionsDisplay
 *   suggestions={suggestions}
 *   isLoading={isLoading}
 *   error={error}
 *   showActions
 *   onAcceptSuggestion={(s) => applyChange(s)}
 * />
 * ```
 */
export const FramingSuggestionsDisplay: React.FC<FramingSuggestionsDisplayProps> = ({
  suggestions,
  isLoading = false,
  error = null,
  onAcceptSuggestion,
  onDismissSuggestion,
  onAcceptTitle,
  showActions = false,
  showScores = true,
  className = '',
  compact = false,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={className} role="status" aria-label="Loading framing suggestions">
        <LoadingState compact={compact} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className} role="alert">
        <ErrorState error={error} />
      </div>
    );
  }

  // No suggestions
  if (!suggestions) {
    return null;
  }

  const hasSuggestions = suggestions.suggestions.length > 0 || suggestions.suggestedTitle;
  const hasGoodScores =
    suggestions.neutralityScore >= 0.7 &&
    suggestions.clarityScore >= 0.7 &&
    suggestions.inclusivityScore >= 0.7;

  return (
    <div className={`space-y-4 ${className}`} role="region" aria-label="Framing suggestions">
      {/* Quality Scores */}
      {showScores && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Framing Quality
          </h4>
          <div className="flex flex-wrap gap-2">
            <ScoreBadge label="Neutrality" score={suggestions.neutralityScore} />
            <ScoreBadge label="Clarity" score={suggestions.clarityScore} />
            <ScoreBadge label="Inclusivity" score={suggestions.inclusivityScore} />
          </div>
        </div>
      )}

      {/* Suggested Title */}
      {suggestions.suggestedTitle && (
        <SuggestedTitleSection
          originalTitle={suggestions.originalTitle}
          suggestedTitle={suggestions.suggestedTitle}
          onAccept={onAcceptTitle ? () => onAcceptTitle(suggestions.suggestedTitle!) : undefined}
          showActions={showActions}
        />
      )}

      {/* Individual Suggestions */}
      {suggestions.suggestions.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Suggestions ({suggestions.suggestions.length})
          </h4>
          <div className="space-y-3">
            {suggestions.suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={`${suggestion.issueType}-${index}`}
                suggestion={suggestion}
                onAccept={onAcceptSuggestion ? () => onAcceptSuggestion(suggestion) : undefined}
                onDismiss={onDismissSuggestion ? () => onDismissSuggestion(suggestion) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Good State */}
      {!hasSuggestions && hasGoodScores && (
        <AllGoodState
          neutralityScore={suggestions.neutralityScore}
          clarityScore={suggestions.clarityScore}
          inclusivityScore={suggestions.inclusivityScore}
        />
      )}

      {/* Empty State */}
      {!hasSuggestions && !hasGoodScores && <EmptyState />}

      {/* Reasoning Footer */}
      {suggestions.reasoning && hasSuggestions && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">{suggestions.reasoning}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            — {suggestions.attribution}
          </p>
        </div>
      )}
    </div>
  );
};

export default FramingSuggestionsDisplay;
