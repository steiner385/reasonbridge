/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ExpertiseSection - Profile section wrapper for expertise badges display
 *
 * Displays user's domain expertise badges with horizontal scroll on mobile.
 *
 * @remarks
 * **Features:**
 * - Horizontal scroll on mobile for better UX with many badges
 * - Stacked layout on desktop/tablet
 * - Empty state when user has no expertise badges
 * - Accessible with proper ARIA labeling
 */

import type { TopicExpertise } from '../../types/ranking';
import ExpertiseBadge from '../ranking/ExpertiseBadge';

export interface ExpertiseSectionProps {
  /** List of user's expertise in topics */
  expertise: TopicExpertise[];
  /** Maximum number of badges to display (default: 5) */
  maxDisplay?: number;
  /** Whether to show "see all" link when truncated */
  showSeeAll?: boolean;
  /** Callback when "see all" is clicked */
  onSeeAll?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ExpertiseSection component with responsive layout
 */
export function ExpertiseSection({
  expertise,
  maxDisplay = 5,
  showSeeAll = true,
  onSeeAll,
  className = '',
}: ExpertiseSectionProps) {
  // Empty state
  if (!expertise || expertise.length === 0) {
    return (
      <div
        className={`text-center py-4 text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="expertise-section-empty"
      >
        <span className="text-2xl mb-2 block" aria-hidden="true">
          📚
        </span>
        <p className="text-sm">No expertise badges yet</p>
        <p className="text-xs mt-1">Contribute to topics to earn expertise</p>
      </div>
    );
  }

  const displayExpertise = expertise.slice(0, maxDisplay);
  const hasMore = expertise.length > maxDisplay;
  const remainingCount = expertise.length - maxDisplay;

  return (
    <div className={`${className}`} data-testid="expertise-section">
      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden">
        <div
          className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          role="list"
          aria-label="Expertise badges"
        >
          {displayExpertise.map((exp) => (
            <div key={exp.tagId} className="flex-shrink-0" role="listitem">
              <ExpertiseBadge expertise={exp} variant="full" size="sm" showTag />
            </div>
          ))}
          {hasMore && showSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              className="flex-shrink-0 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400
                hover:text-blue-700 dark:hover:text-blue-300 transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              +{remainingCount} more
            </button>
          )}
        </div>
      </div>

      {/* Desktop/Tablet: Stacked layout */}
      <div className="hidden md:block">
        <div className="space-y-2" role="list" aria-label="Expertise badges">
          {displayExpertise.map((exp) => (
            <div key={exp.tagId} role="listitem">
              <ExpertiseBadge expertise={exp} variant="full" size="sm" showTag />
            </div>
          ))}
        </div>
        {hasMore && showSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400
              hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            See all {expertise.length} expertise badges
          </button>
        )}
      </div>
    </div>
  );
}

export default ExpertiseSection;
