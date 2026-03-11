/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Inline Trust Badge Component
 *
 * A compact, inline trust indicator for use in response headers and
 * other contexts where space is limited. Works with partial user data
 * (UserSummary) that may or may not include trust scores.
 *
 * When trust data is available, shows a small colored badge with the
 * overall trust score. When not available, shows nothing.
 */

interface InlineTrustBadgeProps {
  /** Trust score for ability (0-1) */
  trustScoreAbility?: number;
  /** Trust score for benevolence (0-1) */
  trustScoreBenevolence?: number;
  /** Trust score for integrity (0-1) */
  trustScoreIntegrity?: number;
  /** Verification level */
  verificationLevel?: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
  /** Additional CSS classes */
  className?: string;
}

type TrustLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * Calculate overall trust score and level
 */
function calculateTrust(
  ability?: number,
  benevolence?: number,
  integrity?: number,
): { overall: number; level: TrustLevel } | null {
  if (ability === undefined || benevolence === undefined || integrity === undefined) {
    return null;
  }

  const overall = (ability + benevolence + integrity) / 3;

  let level: TrustLevel;
  if (overall >= 0.8) level = 'very_high';
  else if (overall >= 0.6) level = 'high';
  else if (overall >= 0.4) level = 'medium';
  else if (overall >= 0.2) level = 'low';
  else level = 'very_low';

  return { overall: Math.round(overall * 100), level };
}

/**
 * Get color classes based on trust level
 */
function getLevelColors(level: TrustLevel): string {
  switch (level) {
    case 'very_high':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'high':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'low':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'very_low':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
}

/**
 * Get verification badge
 */
function getVerificationBadge(
  level?: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN',
): { icon: string; color: string } | null {
  if (!level || level === 'BASIC') return null;

  if (level === 'VERIFIED_HUMAN') {
    return {
      icon: '✓',
      color: 'text-purple-600 dark:text-purple-400',
    };
  }

  return {
    icon: '◆',
    color: 'text-blue-600 dark:text-blue-400',
  };
}

export function InlineTrustBadge({
  trustScoreAbility,
  trustScoreBenevolence,
  trustScoreIntegrity,
  verificationLevel,
  className = '',
}: InlineTrustBadgeProps) {
  const trust = calculateTrust(trustScoreAbility, trustScoreBenevolence, trustScoreIntegrity);

  const verification = getVerificationBadge(verificationLevel);

  // If no trust data and no special verification, don't render anything
  if (!trust && !verification) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={
        trust ? `Trust score: ${trust.overall}%` : verification ? 'Verified user' : undefined
      }
    >
      {/* Trust score badge */}
      {trust && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${getLevelColors(trust.level)}`}
          title={`Trust: ${trust.overall}%`}
        >
          ⭐ {trust.overall}%
        </span>
      )}

      {/* Verification badge */}
      {verification && (
        <span
          className={`text-xs font-bold ${verification.color}`}
          title={
            verificationLevel === 'VERIFIED_HUMAN' ? 'Verified human' : 'Enhanced verification'
          }
        >
          {verification.icon}
        </span>
      )}
    </span>
  );
}

export default InlineTrustBadge;
