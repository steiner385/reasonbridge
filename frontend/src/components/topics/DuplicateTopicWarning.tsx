/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Duplicate Topic Warning Component
 * Feature 016: Topic Management - T233
 *
 * Displays a warning when similar topics are detected during topic creation.
 * Shows up to 3 similar topics with similarity scores to help users decide
 * whether to join an existing discussion or create a new topic.
 *
 * @remarks
 * - **Similarity Display**: Shows percentage match for each duplicate
 * - **Preview**: Shows title and truncated description of duplicates
 * - **Actions**: Links to existing topics or allows override
 * - **Dark mode**: Full Tailwind dark mode support
 *
 * @example
 * ```tsx
 * <DuplicateTopicWarning
 *   duplicates={suggestions}
 *   onViewTopic={(id) => navigate(`/topics/${id}`)}
 *   overrideText="Create Anyway"
 * />
 * ```
 */

import type { DuplicateSuggestion } from '../../services/topicService';

export interface DuplicateTopicWarningProps {
  /** Array of duplicate topic suggestions */
  duplicates: DuplicateSuggestion[];
  /** Callback when user clicks to view a topic */
  onViewTopic?: (topicId: string) => void;
  /** Maximum number of duplicates to show (default: 3) */
  maxDisplay?: number;
  /** Custom text for override action hint (default: "Create Anyway") */
  overrideText?: string;
  /** Optional className for the container */
  className?: string;
  /** Whether to show a compact version */
  compact?: boolean;
}

/**
 * Warning icon component
 */
function WarningIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

/**
 * External link icon
 */
function ExternalLinkIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

/**
 * Get color class based on similarity score
 */
function getSimilarityColor(score: number): string {
  if (score >= 0.9) return 'text-red-600 dark:text-red-400';
  if (score >= 0.7) return 'text-orange-600 dark:text-orange-400';
  return 'text-yellow-600 dark:text-yellow-400';
}

/**
 * Get badge text based on match type
 */
function getMatchTypeBadge(matchType: 'exact' | 'trigram' | 'semantic'): string {
  switch (matchType) {
    case 'exact':
      return 'Exact match';
    case 'semantic':
      return 'Similar content';
    case 'trigram':
    default:
      return 'Similar title';
  }
}

/**
 * Duplicate Topic Warning Component
 */
export function DuplicateTopicWarning({
  duplicates,
  onViewTopic,
  maxDisplay = 3,
  overrideText = 'Create Anyway',
  className = '',
  compact = false,
}: DuplicateTopicWarningProps) {
  if (duplicates.length === 0) {
    return null;
  }

  const displayedDuplicates = duplicates.slice(0, maxDisplay);
  const remainingCount = duplicates.length - maxDisplay;

  return (
    <div
      className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="polite"
      data-testid="duplicate-topic-warning"
    >
      <div className="flex items-start gap-3">
        <WarningIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Similar Topics Found
          </h4>

          {/* Description */}
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            We found {duplicates.length} similar topic{duplicates.length > 1 ? 's' : ''}. Consider
            joining an existing discussion instead:
          </p>

          {/* Duplicate List */}
          <div className="space-y-2" data-testid="duplicate-list">
            {displayedDuplicates.map((duplicate) => (
              <div
                key={duplicate.id}
                className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-100 dark:border-yellow-900"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    {/* Title with optional link */}
                    {onViewTopic ? (
                      <button
                        type="button"
                        onClick={() => onViewTopic(duplicate.id)}
                        className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 text-left"
                      >
                        <span className="truncate">{duplicate.title}</span>
                        <ExternalLinkIcon className="flex-shrink-0" />
                      </button>
                    ) : (
                      <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {duplicate.title}
                      </h5>
                    )}
                  </div>

                  {/* Similarity Score */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!compact && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getMatchTypeBadge(duplicate.matchType)}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ${getSimilarityColor(duplicate.similarityScore)}`}
                    >
                      {Math.round(duplicate.similarityScore * 100)}% match
                    </span>
                  </div>
                </div>

                {/* Description preview */}
                {!compact && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {duplicate.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Remaining count */}
          {remainingCount > 0 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
              And {remainingCount} more similar topic{remainingCount > 1 ? 's' : ''}...
            </p>
          )}

          {/* Override hint */}
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3">
            If your topic is truly unique, click &quot;{overrideText}&quot; to proceed.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DuplicateTopicWarning;
