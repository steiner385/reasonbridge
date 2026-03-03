/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContributionFilters - Filter controls for contribution list
 *
 * Provides filtering by contribution type with a toggle button group.
 */

import type { ContributionType } from '../../types/contribution';

const FILTER_OPTIONS: { value: ContributionType | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: 'All', icon: '📋' },
  { value: 'TOPIC', label: 'Topics', icon: '💬' },
  { value: 'RESPONSE', label: 'Responses', icon: '💭' },
  { value: 'VOTE', label: 'Votes', icon: '👍' },
  { value: 'PROPOSITION', label: 'Propositions', icon: '📌' },
];

export interface ContributionFiltersProps {
  /** Currently selected filter */
  selectedType: ContributionType | 'ALL';
  /** Callback when filter changes */
  onTypeChange: (type: ContributionType | 'ALL') => void;
  /** Counts for each contribution type (optional, for badges) */
  counts?: {
    topicCount?: number;
    responseCount?: number;
    voteCount?: number;
    propositionCount?: number;
  };
  /** Whether filters are disabled (e.g., during loading) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get the count for a specific filter type
 */
function getCount(
  type: ContributionType | 'ALL',
  counts?: ContributionFiltersProps['counts'],
): number | undefined {
  if (!counts) return undefined;

  switch (type) {
    case 'TOPIC':
      return counts.topicCount;
    case 'RESPONSE':
      return counts.responseCount;
    case 'VOTE':
      return counts.voteCount;
    case 'PROPOSITION':
      return counts.propositionCount;
    case 'ALL':
      return (
        (counts.topicCount ?? 0) +
        (counts.responseCount ?? 0) +
        (counts.voteCount ?? 0) +
        (counts.propositionCount ?? 0)
      );
    default:
      return undefined;
  }
}

/**
 * Contribution filter toggle buttons
 */
export function ContributionFilters({
  selectedType,
  onTypeChange,
  counts,
  disabled = false,
  className = '',
}: ContributionFiltersProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="group"
      aria-label="Filter contributions by type"
    >
      {FILTER_OPTIONS.map((option) => {
        const isSelected = selectedType === option.value;
        const count = getCount(option.value, counts);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onTypeChange(option.value)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isSelected
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }
            `}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
            {count !== undefined && (
              <span
                className={`
                  ml-0.5 px-1.5 py-0.5 rounded-full text-xs
                  ${
                    isSelected
                      ? 'bg-primary-200 dark:bg-primary-800/60'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ContributionFilters;
