/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { FactCheckStatus } from '../../types/factCheck';
import { factCheckService } from '../../services/factCheckService';
import type { FactCheckResult } from '../../types/factCheck';

/**
 * Check/verified icon
 */
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

/**
 * Info/context icon
 */
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

/**
 * Warning icon for conflicts
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
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

/**
 * Loading spinner
 */
const LoadingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`${className} animate-spin`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export type BadgeVariant = 'has-context' | 'no-context' | 'conflicts' | 'loading' | 'idle';

export interface FactCheckBadgeProps {
  /** Current fact-check status */
  status?: FactCheckStatus;
  /** Fact-check results (used to derive variant) */
  results?: FactCheckResult[];
  /** Direct variant override */
  variant?: BadgeVariant;
  /** Number of sources found */
  sourceCount?: number;
  /** Whether to show text label */
  showLabel?: boolean;
  /** Size of the badge */
  size?: 'sm' | 'md';
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Small indicator badge showing fact-check status
 *
 * T260: Create fact-check badge/indicator
 *
 * Displays a compact visual indicator of fact-check status:
 * - Has context: Green badge with check icon
 * - No context: Gray badge with info icon
 * - Conflicts: Amber badge with warning icon
 * - Loading: Spinning indicator
 */
const FactCheckBadge: React.FC<FactCheckBadgeProps> = ({
  status,
  results,
  variant: variantProp,
  sourceCount,
  showLabel = false,
  size = 'sm',
  onClick,
  className = '',
}) => {
  // Derive variant from props
  let variant: BadgeVariant = variantProp || 'idle';

  if (!variantProp) {
    if (status === 'loading') {
      variant = 'loading';
    } else if (status === 'success' && results) {
      variant = factCheckService.getOverallStatus(results);
    } else if (status === 'no-results') {
      variant = 'no-context';
    }
  }

  // Calculate source count if not provided
  const displaySourceCount =
    sourceCount ?? (results?.reduce((sum, r) => sum + r.sources.length, 0) || 0);

  // Don't render if idle
  if (variant === 'idle') {
    return null;
  }

  // Style configurations
  const sizeStyles = {
    sm: 'h-5 px-1.5 text-xs gap-1',
    md: 'h-6 px-2 text-sm gap-1.5',
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    'has-context':
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    'no-context':
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    conflicts:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    loading:
      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    idle: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700',
  };

  const icons: Record<BadgeVariant, React.ReactNode> = {
    'has-context': <CheckIcon className={iconSize[size]} />,
    'no-context': <InfoIcon className={iconSize[size]} />,
    conflicts: <WarningIcon className={iconSize[size]} />,
    loading: <LoadingIcon className={iconSize[size]} />,
    idle: null,
  };

  const labels: Record<BadgeVariant, string> = {
    'has-context': `${displaySourceCount} source${displaySourceCount !== 1 ? 's' : ''}`,
    'no-context': 'No context',
    conflicts: 'Conflicting',
    loading: 'Checking...',
    idle: '',
  };

  const ariaLabels: Record<BadgeVariant, string> = {
    'has-context': `Fact-check found ${displaySourceCount} source${displaySourceCount !== 1 ? 's' : ''}`,
    'no-context': 'No fact-check context found',
    conflicts: 'Fact-check sources have conflicting information',
    loading: 'Checking facts...',
    idle: '',
  };

  const baseStyles =
    'inline-flex items-center justify-center rounded-full border font-medium transition-colors';
  const interactiveStyles = onClick
    ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500'
    : '';

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      onClick={onClick}
      aria-label={ariaLabels[variant]}
      title={ariaLabels[variant]}
      {...(onClick && { type: 'button' })}
    >
      {icons[variant]}
      {showLabel && <span>{labels[variant]}</span>}
    </Component>
  );
};

export default FactCheckBadge;
