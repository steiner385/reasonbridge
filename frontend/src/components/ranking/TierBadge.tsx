/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { TierLevel } from '../../types/ranking';
import { getTierInfo } from '../../types/ranking';
import { Tooltip } from '../ui/Tooltip';
import { getTierDescription } from '../../lib/statusDescriptions';

/**
 * SVG paths for each tier icon
 * Using d paths directly to avoid creating components during render
 */
const TIER_ICON_PATHS: Record<TierLevel, string> = {
  // Newcomer - seedling/sprout representing new growth
  NEWCOMER:
    'M12 18v-6m0 0c-2.485 0-4.5-2.015-4.5-4.5S9.515 3 12 3s4.5 2.015 4.5 4.5S14.485 12 12 12z',
  // Contributor - star representing active participation
  CONTRIBUTOR:
    'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  // Trusted - shield with check representing trust and reliability
  TRUSTED:
    'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  // Leader - flag representing leadership and guidance
  LEADER:
    'M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5',
  // Expert - trophy representing expertise and achievement
  EXPERT:
    'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044 0a6.726 6.726 0 002.749-1.35m0 0a6.772 6.772 0 01-3.044 0m3.044 0a6.003 6.003 0 005.395-4.972c-.962-.203-1.933-.377-2.915-.52',
};

/**
 * TierIcon component that renders the appropriate icon for a tier
 */
interface TierIconProps {
  tier: TierLevel;
  className?: string;
}

const TierIcon: React.FC<TierIconProps> = ({ tier, className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={TIER_ICON_PATHS[tier]} />
  </svg>
);

export interface TierBadgeProps {
  /** The user's tier level */
  tier: TierLevel;
  /** Display variant - icon only or full with text */
  variant?: 'icon' | 'full';
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TierBadge Component
 *
 * Displays a user's global tier as a badge with icon and color.
 * Supports compact (icon-only) and full variants for different use cases.
 *
 * @remarks
 * - **Compact variant**: Icon-only, suitable for inline use on avatars and posts
 * - **Full variant**: Icon + tier name, suitable for profile pages and cards
 * - **Dark mode**: Full Tailwind dark mode support via `dark:` variants
 * - **Accessibility**: ARIA labels and semantic role for screen readers
 *
 * @example
 * ```tsx
 * // Compact badge on avatar
 * <TierBadge tier="TRUSTED" variant="icon" size="sm" />
 *
 * // Full badge on profile
 * <TierBadge tier="EXPERT" variant="full" size="md" />
 * ```
 */
const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  variant = 'icon',
  size = 'md',
  showTooltip = true,
  className = '',
}) => {
  const tierInfo = getTierInfo(tier);

  // Size styles
  const sizeStyles = {
    sm: {
      badge: 'h-5 px-1.5 text-xs gap-1',
      icon: 'h-3 w-3',
    },
    md: {
      badge: 'h-6 px-2 text-sm gap-1.5',
      icon: 'h-4 w-4',
    },
    lg: {
      badge: 'h-7 px-2.5 text-base gap-2',
      icon: 'h-5 w-5',
    },
  };

  // Base styles
  const baseStyles =
    'inline-flex items-center justify-center rounded-full border font-medium transition-colors';

  // Color styles combining light and dark mode
  const colorStyles = `${tierInfo.bgColor} ${tierInfo.darkBgColor} ${tierInfo.color} ${tierInfo.darkColor} ${tierInfo.borderColor} ${tierInfo.darkBorderColor}`;

  const tooltipContent = (
    <div className="max-w-xs">
      <strong className="block mb-1">{tierInfo.name}</strong>
      <p className="text-xs">{getTierDescription(tier)}</p>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} disabled={!showTooltip}>
      <span
        className={`${baseStyles} ${sizeStyles[size].badge} ${colorStyles} ${className}`}
        role="status"
        aria-label={`User tier: ${tierInfo.name}`}
        data-tour="tier-badge"
      >
        <TierIcon tier={tier} className={sizeStyles[size].icon} />
        {variant === 'full' && <span>{tierInfo.name}</span>}
      </span>
    </Tooltip>
  );
};

export default TierBadge;
