/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { TierLevel, ExpertiseLevel } from '../../types/ranking';
import { getTierInfo, getExpertiseInfo } from '../../types/ranking';
import TierBadge from './TierBadge';

export interface TierGateBannerProps {
  /** Type of restriction - tier-based or expertise-based */
  restrictionType: 'tier' | 'expertise';
  /** Required level to access the topic */
  requiredLevel: TierLevel | ExpertiseLevel;
  /** User's current level */
  currentLevel: TierLevel | ExpertiseLevel;
  /** Tag/topic name for expertise restrictions */
  tagName?: string;
  /** Whether provisional access can be requested */
  allowProvisionalAccess?: boolean;
  /** Callback when user requests provisional access */
  onRequestAccess?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Warning icon SVG path
 */
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

/**
 * Arrow right icon for links
 */
const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

/**
 * TierGateBanner Component
 *
 * Displays a banner when a user doesn't meet the tier or expertise requirements
 * for a restricted topic. Shows the required level, the user's current level,
 * and provides options to request provisional access or improve their ranking.
 *
 * @remarks
 * - **Tier restriction**: Requires a minimum global tier level
 * - **Expertise restriction**: Requires a minimum expertise level in a specific topic
 * - **Provisional access**: Optional button to request temporary access
 * - **Dark mode**: Full Tailwind dark mode support via `dark:` variants
 * - **Accessibility**: Uses role="alert" for screen readers
 *
 * @example
 * ```tsx
 * // Tier restriction
 * <TierGateBanner
 *   restrictionType="tier"
 *   requiredLevel="TRUSTED"
 *   currentLevel="CONTRIBUTOR"
 *   allowProvisionalAccess={true}
 *   onRequestAccess={handleRequestAccess}
 * />
 *
 * // Expertise restriction
 * <TierGateBanner
 *   restrictionType="expertise"
 *   requiredLevel="EXPERT"
 *   currentLevel="FAMILIAR"
 *   tagName="Climate Science"
 * />
 * ```
 */
const TierGateBanner: React.FC<TierGateBannerProps> = ({
  restrictionType,
  requiredLevel,
  currentLevel,
  tagName,
  allowProvisionalAccess = false,
  onRequestAccess,
  className = '',
}) => {
  const isTierRestriction = restrictionType === 'tier';

  // Get display info for required and current levels
  const requiredInfo = isTierRestriction
    ? getTierInfo(requiredLevel as TierLevel)
    : getExpertiseInfo(requiredLevel as ExpertiseLevel);

  const currentInfo = isTierRestriction
    ? getTierInfo(currentLevel as TierLevel)
    : getExpertiseInfo(currentLevel as ExpertiseLevel);

  // Build the restriction message
  const restrictionMessage = isTierRestriction ? 'This topic requires' : 'This topic requires';

  const levelSuffix = isTierRestriction ? 'tier or higher' : 'level expertise';

  const currentLevelLabel = isTierRestriction ? 'Your current tier:' : 'Your current level:';

  const improveLinkText = isTierRestriction ? 'Improve Your Tier' : 'Build Expertise';

  return (
    <div
      role="alert"
      className={`
        rounded-lg border p-4
        bg-amber-50 border-amber-200 text-amber-800
        dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200
        ${className}
      `}
    >
      {/* Header with warning icon and message */}
      <div className="flex items-start gap-3">
        <WarningIcon className="h-5 w-5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
        <div className="flex-1 space-y-3">
          {/* Restriction message */}
          <div className="space-y-1">
            <p className="font-medium">
              {restrictionMessage}{' '}
              <span className="inline-flex items-center gap-1">
                {isTierRestriction ? (
                  <TierBadge tier={requiredLevel as TierLevel} variant="full" size="sm" />
                ) : (
                  <>
                    <span className="font-semibold">{requiredInfo.name}</span>
                  </>
                )}
              </span>{' '}
              {levelSuffix}
              {!isTierRestriction && tagName && (
                <>
                  {' '}
                  in <span className="font-semibold">{tagName}</span>
                </>
              )}
            </p>
          </div>

          {/* Current level display */}
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {currentLevelLabel}{' '}
            {isTierRestriction ? (
              <TierBadge tier={currentLevel as TierLevel} variant="full" size="sm" />
            ) : (
              <span className="font-medium">{currentInfo.name}</span>
            )}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {allowProvisionalAccess && (
              <button
                type="button"
                onClick={onRequestAccess}
                className="
                  inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                  bg-amber-100 text-amber-800 hover:bg-amber-200
                  dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700
                  transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
                  dark:focus:ring-offset-gray-900
                "
              >
                Request Access
              </button>
            )}
            <Link
              to="/ranking"
              className="
                inline-flex items-center gap-1 text-sm font-medium
                text-amber-700 hover:text-amber-800
                dark:text-amber-300 dark:hover:text-amber-200
                underline-offset-2 hover:underline
              "
            >
              {improveLinkText}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierGateBanner;
