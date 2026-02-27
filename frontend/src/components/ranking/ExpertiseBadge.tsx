/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ExpertiseLevel, TopicExpertise } from '../../types/ranking';
import { getExpertiseInfo } from '../../types/ranking';

/**
 * SVG paths for each expertise level icon
 * Using d paths directly to avoid creating components during render
 */
const EXPERTISE_ICON_PATHS: Record<ExpertiseLevel, string> = {
  // Novice - book/learning representing new learner
  NOVICE:
    'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  // Familiar - lightbulb representing growing understanding
  FAMILIAR:
    'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  // Knowledgeable - academic cap representing expertise
  KNOWLEDGEABLE:
    'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
  // Expert - trophy/star representing mastery
  EXPERT:
    'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
};

/**
 * ExpertiseIcon component that renders the appropriate icon for an expertise level
 */
interface ExpertiseIconProps {
  level: ExpertiseLevel;
  className?: string;
}

const ExpertiseIcon: React.FC<ExpertiseIconProps> = ({ level, className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={EXPERTISE_ICON_PATHS[level]} />
  </svg>
);

export interface ExpertiseBadgeProps {
  /** The user's topic expertise data */
  expertise: TopicExpertise;
  /** Display variant - icon only or full with text */
  variant?: 'icon' | 'full';
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the tag/topic name */
  showTag?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ExpertiseBadge Component
 *
 * Displays a user's domain-specific expertise level as a badge with icon and color.
 * Supports compact (icon-only) and full variants for different use cases.
 *
 * @remarks
 * - **Compact variant**: Icon-only, suitable for inline use on responses and avatars
 * - **Full variant**: Icon + level name, suitable for profile pages and cards
 * - **showTag**: When true, displays "Expert in Climate Science" format
 * - **Dark mode**: Full Tailwind dark mode support via `dark:` variants
 * - **Accessibility**: ARIA labels and semantic role for screen readers
 *
 * @example
 * ```tsx
 * // Compact badge on response
 * <ExpertiseBadge expertise={userExpertise} variant="icon" size="sm" />
 *
 * // Full badge with tag name
 * <ExpertiseBadge expertise={userExpertise} variant="full" showTag />
 * ```
 */
const ExpertiseBadge: React.FC<ExpertiseBadgeProps> = ({
  expertise,
  variant = 'icon',
  size = 'md',
  showTag = false,
  showTooltip = true,
  className = '',
}) => {
  const expertiseInfo = getExpertiseInfo(expertise.expertiseLevel);

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
  const colorStyles = `${expertiseInfo.bgColor} ${expertiseInfo.darkBgColor} ${expertiseInfo.color} ${expertiseInfo.darkColor} ${expertiseInfo.borderColor} ${expertiseInfo.darkBorderColor}`;

  // Build the display text
  const levelText = expertiseInfo.name;
  const fullText = showTag ? `${levelText} in ${expertise.tagName}` : levelText;
  const tooltipText = `${levelText} in ${expertise.tagName}`;
  const ariaLabelText = `Expertise: ${levelText} in ${expertise.tagName}`;

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size].badge} ${colorStyles} ${className}`}
      role="status"
      aria-label={ariaLabelText}
      title={showTooltip ? tooltipText : undefined}
    >
      <ExpertiseIcon level={expertise.expertiseLevel} className={sizeStyles[size].icon} />
      {variant === 'full' && <span>{fullText}</span>}
    </span>
  );
};

export default ExpertiseBadge;
