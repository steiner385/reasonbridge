/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BridgingSuggestionsResponse } from '../../types/common-ground';

export interface BridgingSuggestionsSectionProps {
  /**
   * The bridging suggestions data to display
   */
  suggestions: BridgingSuggestionsResponse;

  /**
   * Optional callback when user wants to view details of a suggestion
   */
  onViewSuggestion?: (propositionId: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show the AI attribution
   */
  showAttribution?: boolean;

  /**
   * Whether to show empty state when no suggestions
   */
  showEmptyState?: boolean;

  /**
   * Maximum number of suggestions to display (0 = show all)
   */
  maxSuggestions?: number;
}

/**
 * Get confidence level styling
 */
const getConfidenceStyles = (confidence: number) => {
  if (confidence >= 0.8) {
    return {
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      text: 'High Confidence',
    };
  }
  if (confidence >= 0.6) {
    return {
      badge: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
      text: 'Medium Confidence',
    };
  }
  return {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    text: 'Lower Confidence',
  };
};

/**
 * BridgingSuggestionsSection - Displays AI-generated bridging suggestions
 *
 * This component shows:
 * - Overall consensus score and analysis
 * - Common ground areas
 * - Conflict areas
 * - Individual bridging suggestions with reasoning
 * - AI attribution
 */
const BridgingSuggestionsSection = ({
  suggestions,
  onViewSuggestion,
  className = '',
  showAttribution = true,
  showEmptyState = true,
  maxSuggestions = 0,
}: BridgingSuggestionsSectionProps) => {
  const suggestionsList = suggestions.suggestions ?? [];
  const hasSuggestions = suggestionsList.length > 0;
  const displayedSuggestions =
    maxSuggestions > 0 ? suggestionsList.slice(0, maxSuggestions) : suggestionsList;

  if (!hasSuggestions && !showEmptyState) {
    return null;
  }

  const consensusPercentage = Math.round(suggestions.overallConsensusScore * 100);

  return (
    <div className={`space-y-6 ${className}`} data-testid="bridging-suggestions">
      {/* Header with Overall Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Bridging Suggestions
        </h2>

        {/* Overall Consensus Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Consensus
            </span>
            <span
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              data-testid="overall-consensus"
            >
              {consensusPercentage}%
            </span>
          </div>
          <div
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3"
            data-testid="consensus-progress"
          >
            <div
              className="bg-primary-600 dark:bg-primary-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${consensusPercentage}%` }}
              role="progressbar"
              aria-label="Overall consensus level"
              aria-valuenow={consensusPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Analysis Reasoning */}
        {suggestions.reasoning && (
          <div
            className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md"
            data-testid="analysis-reasoning"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {suggestions.reasoning}
            </p>
          </div>
        )}

        {/* Common Ground Areas */}
        {(suggestions.commonGroundAreas?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Areas of Agreement
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.commonGroundAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  data-testid="common-ground-badge"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conflict Areas */}
        {(suggestions.conflictAreas?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Areas of Disagreement
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.conflictAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                  data-testid="conflict-area-badge"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Individual Suggestions */}
      {hasSuggestions && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Suggested Bridges ({displayedSuggestions.length}
            {maxSuggestions > 0 && suggestionsList.length > maxSuggestions
              ? ` of ${suggestionsList.length}`
              : ''}
            )
          </h3>
          <div className="space-y-4">
            {displayedSuggestions.map((suggestion, idx) => {
              const confidenceStyles = getConfidenceStyles(suggestion.confidenceScore);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border-l-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-600"
                  role="article"
                  aria-label={`Bridging suggestion from ${suggestion.sourcePosition} to ${suggestion.targetPosition}`}
                  data-testid="bridging-suggestion-card"
                >
                  {/* Positions */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-block text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                      data-testid="position-badge"
                    >
                      {suggestion.sourcePosition}
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 dark:text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                    <span
                      className="inline-block text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                      data-testid="position-badge"
                    >
                      {suggestion.targetPosition}
                    </span>
                    <span
                      className={`ml-auto text-xs font-semibold px-2 py-1 rounded ${confidenceStyles.badge}`}
                      data-testid={`confidence-${suggestion.confidenceScore >= 0.8 ? 'high' : suggestion.confidenceScore >= 0.6 ? 'medium' : 'low'}`}
                    >
                      {confidenceStyles.text}
                    </span>
                  </div>

                  {/* Bridging Language */}
                  <div className="mb-3" data-testid="bridging-language">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Suggested Bridging Language:
                    </h4>
                    <p className="text-base text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                      "{suggestion.bridgingLanguage}"
                    </p>
                  </div>

                  {/* Common Ground */}
                  <div className="mb-3" data-testid="common-ground-text">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Common Ground:
                    </h4>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {suggestion.commonGround}
                    </p>
                  </div>

                  {/* Reasoning */}
                  <div className="mb-3" data-testid="suggestion-reasoning">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Why This Helps:
                    </h4>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {suggestion.reasoning}
                    </p>
                  </div>

                  {/* Confidence indicator */}
                  <div
                    className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700"
                    data-testid="confidence-badge"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs text-gray-600 dark:text-gray-300 dark:text-gray-300"
                        data-testid="confidence-score"
                      >
                        Confidence Score: {Math.round(suggestion.confidenceScore * 100)}%
                      </span>
                      {onViewSuggestion && (
                        <button
                          type="button"
                          onClick={() => onViewSuggestion(suggestion.propositionId)}
                          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                          data-testid="view-proposition-button"
                        >
                          View Proposition →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more indicator */}
          {maxSuggestions > 0 && suggestionsList.length > maxSuggestions && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
                Showing {maxSuggestions} of {suggestionsList.length} suggestions
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasSuggestions && showEmptyState && (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center"
          data-testid="empty-state"
        >
          <div className="text-gray-400 dark:text-gray-300 mb-3">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No Bridging Suggestions Available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
            Bridging suggestions will appear here once the discussion has enough diverse viewpoints
            to analyze.
          </p>
        </div>
      )}

      {/* AI Attribution */}
      {showAttribution && hasSuggestions && (
        <div className="text-center" data-testid="ai-attribution">
          <p className="text-xs text-gray-500 dark:text-gray-300 dark:text-gray-300">
            {suggestions.attribution}
          </p>
        </div>
      )}
    </div>
  );
};

export default BridgingSuggestionsSection;
