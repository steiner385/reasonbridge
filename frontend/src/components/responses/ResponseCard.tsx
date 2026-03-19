/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Card, { CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { useAuthContext } from '../../contexts/AuthContext';
import type { Response } from '../../types/response';
import { getResponseStatusDescription } from '../../lib/statusDescriptions';

export interface ResponseCardProps {
  /**
   * The response data to display
   */
  response: Response;

  /**
   * Whether to show the full content or a truncated version
   */
  truncated?: boolean;

  /**
   * Maximum length for truncated content (in characters)
   */
  truncateLength?: number;

  /**
   * Optional callback when the card is clicked
   */
  onClick?: () => void;

  /**
   * Whether to highlight the card (e.g., for selected/focused states)
   */
  highlighted?: boolean;

  /**
   * Optional action buttons or menu to show in the header
   */
  actions?: React.ReactNode;

  /**
   * Whether to show proposition tags
   */
  showPropositions?: boolean;
}

const ResponseCard: React.FC<ResponseCardProps> = ({
  response,
  truncated = false,
  truncateLength = 300,
  onClick,
  highlighted = false,
  actions,
  showPropositions = false,
}) => {
  const { user } = useAuthContext();
  const isAuthor = user?.id === response.authorId;
  const isPendingReview = response.status === 'PENDING_REVIEW';
  // Format timestamp
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Truncate content if needed
  const displayContent = React.useMemo(() => {
    if (!truncated || response.content.length <= truncateLength) {
      return response.content;
    }
    return response.content.substring(0, truncateLength).trim() + '...';
  }, [response.content, truncated, truncateLength]);

  const isTruncated = truncated && response.content.length > truncateLength;

  return (
    <Card
      variant={highlighted ? 'outlined' : 'default'}
      padding="md"
      hoverable={!!onClick}
      clickable={!!onClick}
      onClick={onClick}
      fullWidth
      className={highlighted ? 'border-primary-500' : ''}
      data-testid="response-card"
      data-response-id={response.id}
    >
      <CardHeader action={actions} className="mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {response.author?.displayName || 'Anonymous'}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-500">{formatDate(response.createdAt)}</span>
          {response.revisionCount > 0 && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                edited {response.revisionCount} {response.revisionCount === 1 ? 'time' : 'times'}
              </span>
            </>
          )}
          {isPendingReview && (
            <>
              <span className="text-gray-400">•</span>
              <Tooltip content={getResponseStatusDescription('PENDING_REVIEW')}>
                <span
                  className={`inline-flex items-center text-xs px-2 py-0.5 rounded cursor-help ${
                    isAuthor
                      ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {isAuthor ? 'Being checked' : 'Pending Review'}
                </span>
              </Tooltip>
            </>
          )}
        </div>
      </CardHeader>

      <CardBody>
        <MarkdownRenderer content={displayContent} className="prose-sm" />

        {isTruncated && (
          <button
            className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
            onClick={onClick}
          >
            Read more
          </button>
        )}

        {/* Metadata Badges */}
        {(response.containsOpinion || response.containsFactualClaims) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {response.containsOpinion && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                Opinion
              </span>
            )}
            {response.containsFactualClaims && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                Factual Claims
              </span>
            )}
          </div>
        )}

        {/* Cited Sources */}
        {response.citedSources && response.citedSources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Sources ({response.citedSources.length})
            </h4>
            <ul className="space-y-1">
              {response.citedSources.slice(0, 3).map((source, index) => (
                <li key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      className="h-3 w-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span className="truncate">{source.title || source.url}</span>
                  </a>
                </li>
              ))}
              {response.citedSources.length > 3 && (
                <li className="text-xs text-gray-500">+{response.citedSources.length - 3} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Propositions */}
        {showPropositions && response.propositions && response.propositions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Related Propositions
            </h4>
            <div className="space-y-2">
              {response.propositions.map((prop) => (
                <div
                  key={prop.id}
                  className="text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600"
                >
                  <p className="text-gray-800 dark:text-gray-200">{prop.statement}</p>
                  {prop.relevanceScore !== undefined && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      Relevance: {(prop.relevanceScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>

      {/* Author's pending review notice - child-friendly message */}
      {isPendingReview && isAuthor && (
        <CardFooter bordered>
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sky-700 dark:text-sky-300">
              Your response is being checked by a helper. It will show up soon!
            </span>
          </div>
        </CardFooter>
      )}

      {(response.status === 'HIDDEN' || response.status === 'REMOVED') && (
        <CardFooter bordered>
          <Tooltip content={getResponseStatusDescription(response.status)}>
            <div className="flex items-center gap-2 text-sm cursor-help">
              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">
                This response is {response.status === 'HIDDEN' ? 'hidden' : 'removed'}
              </span>
            </div>
          </Tooltip>
        </CardFooter>
      )}
    </Card>
  );
};

export default ResponseCard;
