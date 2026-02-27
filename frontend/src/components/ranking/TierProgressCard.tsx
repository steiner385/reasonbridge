/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { TierLevel, UserRank } from '../../types/ranking';
import { getTierInfo } from '../../types/ranking';
import TierBadge from './TierBadge';

/**
 * Mapping from current tier to next tier
 */
const NEXT_TIER_MAP: Record<TierLevel, TierLevel | null> = {
  NEWCOMER: 'CONTRIBUTOR',
  CONTRIBUTOR: 'TRUSTED',
  TRUSTED: 'LEADER',
  LEADER: 'EXPERT',
  EXPERT: null,
};

export interface TierProgressCardProps {
  /** User's ranking data */
  rank: UserRank;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TierProgressCard Component
 *
 * Displays a user's ranking progress on their dashboard, including:
 * - Current tier badge and name
 * - Progress bar to next tier
 * - Composite score display
 * - Score breakdown (engagement, quality, tenure, badges)
 * - Next tier information
 *
 * @remarks
 * - **EXPERT tier**: Shows "Max tier reached" instead of progress bar
 * - **Dark mode**: Full Tailwind dark mode support via `dark:` variants
 * - **Accessibility**: Progress bar has ARIA attributes for screen readers
 *
 * @example
 * ```tsx
 * // On user dashboard
 * <TierProgressCard rank={userRank} />
 *
 * // With custom styling
 * <TierProgressCard rank={userRank} className="max-w-md" />
 * ```
 */
const TierProgressCard: React.FC<TierProgressCardProps> = ({ rank, className = '' }) => {
  const tierInfo = getTierInfo(rank.tierLevel);
  const nextTier = NEXT_TIER_MAP[rank.tierLevel];
  const nextTierInfo = nextTier ? getTierInfo(nextTier) : null;
  const isMaxTier = rank.tierLevel === 'EXPERT';

  // Format score to 3 decimal places
  const formattedScore = rank.compositeScore.toFixed(3);

  // Format percentages
  const engagementPercent = Math.round(rank.engagementScore * 100);
  const qualityPercent = Math.round(rank.qualityScore * 100);
  // Tenure bonus is 0-0.10, so multiply by 1000 to get percentage with 1 decimal
  const tenurePercent = (rank.tenureBonus * 100).toFixed(1);

  return (
    <div
      className={`rounded-xl border bg-white p-4 sm:p-6 dark:bg-gray-800 dark:border-gray-700 ${className}`}
    >
      {/* Header: Tier Badge and Name */}
      <div className="flex items-center gap-3 mb-4">
        <TierBadge tier={rank.tierLevel} variant="icon" size="lg" />
        <h3 className={`text-lg font-semibold ${tierInfo.color} ${tierInfo.darkColor}`}>
          {tierInfo.name}
        </h3>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-600 mb-4" />

      {/* Score and Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Score:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formattedScore}</span>
          </span>
          {!isMaxTier && nextTierInfo && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Progress to{' '}
              <span className={`font-medium ${nextTierInfo.color} ${nextTierInfo.darkColor}`}>
                {nextTierInfo.name}
              </span>
            </span>
          )}
          {isMaxTier && (
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Max tier reached
            </span>
          )}
        </div>

        {/* Progress Bar (only for non-EXPERT tiers) */}
        {!isMaxTier && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={rank.progressToNextTier}
                aria-label={`Progress to ${nextTierInfo?.name || 'next tier'}: ${rank.progressToNextTier}%`}
                className={`h-full rounded-full transition-all duration-300 ${
                  // Use tier-specific colors for the progress bar
                  rank.tierLevel === 'NEWCOMER'
                    ? 'bg-gray-500'
                    : rank.tierLevel === 'CONTRIBUTOR'
                      ? 'bg-green-500'
                      : rank.tierLevel === 'TRUSTED'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                }`}
                style={{ width: `${rank.progressToNextTier}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
              {rank.progressToNextTier}%
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-600 mb-4" />

      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Score Breakdown:
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Engagement:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {engagementPercent}%
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Quality:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">{qualityPercent}%</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Tenure:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">{tenurePercent}%</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Badges:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {rank.badges.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierProgressCard;
