/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContributionItem - Single contribution item in the contribution list
 *
 * Displays a contribution with type indicator, content preview, and metadata.
 */

import { Link } from 'react-router-dom';
import type { ContributionItem as ContributionItemType } from '../../types/contribution';

const TYPE_ICONS: Record<string, string> = {
  TOPIC: '💬',
  RESPONSE: '💭',
  VOTE: '👍',
  PROPOSITION: '📌',
};

const TYPE_LABELS: Record<string, string> = {
  TOPIC: 'Created topic',
  RESPONSE: 'Posted response',
  VOTE: 'Voted',
  PROPOSITION: 'Made proposition',
};

export interface ContributionItemProps {
  /** The contribution data */
  contribution: ContributionItemType;
  /** Whether to show the topic context */
  showTopicContext?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format a date relative to now
 */
function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Single contribution item component
 */
export function ContributionItem({
  contribution,
  showTopicContext = true,
  className = '',
}: ContributionItemProps) {
  const icon = TYPE_ICONS[contribution.type] || '📝';
  const label = TYPE_LABELS[contribution.type] || contribution.type;

  // Build the link URL based on contribution type
  let linkUrl = '#';
  if (contribution.type === 'TOPIC' && contribution.topic) {
    linkUrl = `/topics/${contribution.topic.id}`;
  } else if (contribution.type === 'RESPONSE' && contribution.topic) {
    linkUrl = `/topics/${contribution.topic.id}#response-${contribution.id}`;
  } else if (contribution.type === 'VOTE' && contribution.topic && contribution.responseId) {
    linkUrl = `/topics/${contribution.topic.id}#response-${contribution.responseId}`;
  } else if (contribution.type === 'PROPOSITION' && contribution.topic && contribution.responseId) {
    linkUrl = `/topics/${contribution.topic.id}#response-${contribution.responseId}`;
  }

  return (
    <Link
      to={linkUrl}
      className={`block p-4 rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750
        transition-colors ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <span className="text-xl flex-shrink-0" aria-hidden="true">
          {icon}
        </span>

        <div className="flex-1 min-w-0">
          {/* Type label and time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {label}
              {contribution.type === 'VOTE' && contribution.voteDirection && (
                <span className="ml-1">{contribution.voteDirection === 'UP' ? '👍' : '👎'}</span>
              )}
            </span>
            <time
              dateTime={new Date(contribution.createdAt).toISOString()}
              className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0"
            >
              {formatRelativeDate(contribution.createdAt)}
            </time>
          </div>

          {/* Content preview */}
          {contribution.contentPreview && (
            <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-2">
              {contribution.contentPreview}
            </p>
          )}

          {/* Proposition text for propositions */}
          {contribution.type === 'PROPOSITION' && contribution.propositionText && (
            <p className="text-sm italic text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
              &ldquo;{contribution.propositionText}&rdquo;
            </p>
          )}

          {/* Topic context */}
          {showTopicContext && contribution.topic && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>in</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                {contribution.topic.title}
              </span>
            </div>
          )}

          {/* Engagement stats */}
          {(contribution.upvoteCount !== undefined ||
            contribution.downvoteCount !== undefined ||
            contribution.replyCount !== undefined) && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              {contribution.upvoteCount !== undefined && <span>👍 {contribution.upvoteCount}</span>}
              {contribution.downvoteCount !== undefined && (
                <span>👎 {contribution.downvoteCount}</span>
              )}
              {contribution.replyCount !== undefined && <span>💬 {contribution.replyCount}</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ContributionItem;
