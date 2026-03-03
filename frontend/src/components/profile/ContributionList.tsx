/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContributionList - Paginated list of user contributions
 *
 * Displays contributions with infinite scroll support, loading states,
 * error handling, and context-aware empty state messages.
 *
 * @remarks
 * **Features:**
 * - Infinite scroll via IntersectionObserver (loads more when sentinel enters viewport)
 * - Filter-aware empty states (different messages for topics/responses/votes)
 * - Own profile vs other profile messaging ("You haven't" vs "This user hasn't")
 * - Error state with message display
 * - Loading spinner for async operations
 *
 * **Performance:**
 * - Uses IntersectionObserver for efficient scroll detection
 * - Sentinel element triggers load without scroll listeners
 * - Memoizable callback via useCallback pattern
 *
 * @example
 * ```tsx
 * <ContributionList
 *   contributions={flattenContributions(query.data)}
 *   isLoading={query.isLoading || query.isFetchingNextPage}
 *   hasMore={query.hasNextPage}
 *   onLoadMore={() => query.fetchNextPage()}
 *   selectedType={contributionFilter}
 *   isOwnProfile={isOwner}
 * />
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';
import type {
  ContributionItem as ContributionItemType,
  ContributionType,
} from '../../types/contribution';
import { ContributionItem } from './ContributionItem';

export interface ContributionListProps {
  /** List of contributions to display */
  contributions: ContributionItemType[];
  /** Whether currently loading */
  isLoading?: boolean;
  /** Whether there's an error */
  isError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Callback to load more items */
  onLoadMore?: () => void;
  /** Selected filter type (for empty state message) */
  selectedType?: ContributionType | 'ALL';
  /** Whether viewing own profile */
  isOwnProfile?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get empty state message based on filter type
 */
function getEmptyStateMessage(
  type: ContributionType | 'ALL' | undefined,
  isOwnProfile: boolean,
): { title: string; description: string } {
  const subject = isOwnProfile ? "You haven't" : "This user hasn't";

  switch (type) {
    case 'TOPIC':
      return {
        title: 'No Topics',
        description: `${subject} created any topics yet.`,
      };
    case 'RESPONSE':
      return {
        title: 'No Responses',
        description: `${subject} posted any responses yet.`,
      };
    case 'VOTE':
      return {
        title: 'No Votes',
        description: `${subject} voted on any responses yet.`,
      };
    case 'PROPOSITION':
      return {
        title: 'No Propositions',
        description: `${subject} made any propositions yet.`,
      };
    case 'ALL':
    default:
      return {
        title: 'No Activity Yet',
        description: isOwnProfile
          ? 'Start contributing by creating topics, posting responses, or voting on discussions.'
          : "This user hasn't contributed to any discussions yet.",
      };
  }
}

/**
 * Contribution list with infinite scroll
 */
export function ContributionList({
  contributions,
  isLoading = false,
  isError = false,
  errorMessage,
  hasMore = false,
  onLoadMore,
  selectedType = 'ALL',
  isOwnProfile = false,
  className = '',
}: ContributionListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Set up intersection observer for infinite scroll
  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!hasMore || isLoading || !onLoadMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    setupObserver();
    return () => {
      observerRef.current?.disconnect();
    };
  }, [setupObserver]);

  // Error state
  if (isError) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 dark:text-red-400">
          {errorMessage || 'Failed to load contributions'}
        </p>
      </div>
    );
  }

  // Empty state
  if (!isLoading && contributions.length === 0) {
    const emptyState = getEmptyStateMessage(selectedType, isOwnProfile);
    return <EmptyState title={emptyState.title} message={emptyState.description} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Contribution items */}
      {contributions.map((contribution) => (
        <ContributionItem
          key={`${contribution.type}-${contribution.id}`}
          contribution={contribution}
          showTopicContext={true}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && <div ref={loadMoreRef} className="h-10" aria-hidden="true" />}

      {/* End of list message */}
      {!hasMore && contributions.length > 0 && !isLoading && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          No more contributions to load
        </p>
      )}
    </div>
  );
}

export default ContributionList;
