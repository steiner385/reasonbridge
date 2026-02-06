/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Trust Score Badge Component
 * Displays user's overall trust score and dimensional breakdown
 * Based on Mayer's ABI Model: Ability, Benevolence, Integrity
 */

import type { User } from '../../types/user';
import { VerificationLevel } from '../../types/user';

interface TrustScoreBadgeProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showDimensions?: boolean;
  showLabel?: boolean;
  showVerification?: boolean;
  className?: string;
  onClick?: () => void;
  compact?: boolean;
}

interface TrustScores {
  ability: number;
  benevolence: number;
  integrity: number;
  overall: number;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  trustworthy: boolean;
}

/**
 * Calculate trust scores from individual dimensions
 */
const calculateTrustScores = (user: User): TrustScores => {
  const ability = user.trustScoreAbility;
  const benevolence = user.trustScoreBenevolence;
  const integrity = user.trustScoreIntegrity;
  const overall = (ability + benevolence + integrity) / 3;

  let level: TrustScores['level'];
  if (overall >= 0.8) level = 'very_high';
  else if (overall >= 0.6) level = 'high';
  else if (overall >= 0.4) level = 'medium';
  else if (overall >= 0.2) level = 'low';
  else level = 'very_low';

  return {
    ability: Math.round(ability * 100),
    benevolence: Math.round(benevolence * 100),
    integrity: Math.round(integrity * 100),
    overall: Math.round(overall * 100),
    level,
    trustworthy: overall >= 0.6,
  };
};

/**
 * Get color classes based on trust level
 */
const getTrustLevelColor = (
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high',
): {
  bg: string;
  text: string;
  border: string;
  bar: string;
} => {
  switch (level) {
    case 'very_high':
      return {
        bg: 'bg-green-50',
        text: 'text-green-900',
        border: 'border-green-300',
        bar: 'bg-green-500',
      };
    case 'high':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-900',
        border: 'border-emerald-300',
        bar: 'bg-emerald-500',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-900',
        border: 'border-yellow-300',
        bar: 'bg-yellow-500',
      };
    case 'low':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-900',
        border: 'border-orange-300',
        bar: 'bg-orange-500',
      };
    case 'very_low':
      return {
        bg: 'bg-red-50',
        text: 'text-red-900',
        border: 'border-red-300',
        bar: 'bg-red-500',
      };
  }
};

/**
 * Get human-readable label for trust level
 */
const getTrustLevelLabel = (
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high',
): string => {
  const labels: Record<string, string> = {
    very_high: 'Very High Trust',
    high: 'High Trust',
    medium: 'Medium Trust',
    low: 'Low Trust',
    very_low: 'Very Low Trust',
  };
  return labels[level] || 'Unknown';
};

/**
 * Get verification badge color
 */
const getVerificationColor = (
  level: VerificationLevel,
): {
  bg: string;
  text: string;
  border: string;
} => {
  switch (level) {
    case VerificationLevel.VERIFIED_HUMAN:
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-900',
        border: 'border-purple-300',
      };
    case VerificationLevel.ENHANCED:
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-900',
        border: 'border-blue-300',
      };
    case VerificationLevel.BASIC:
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-900',
        border: 'border-gray-300',
      };
  }
};

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({
  user,
  size = 'md',
  showDimensions = false,
  showLabel = true,
  showVerification = true,
  className = '',
  onClick,
  compact = false,
}) => {
  const scores = calculateTrustScores(user);
  const colors = getTrustLevelColor(scores.level);
  const verificationColors = getVerificationColor(user.verificationLevel);

  if (compact) {
    // Compact inline badge
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
        title={getTrustLevelLabel(scores.level)}
        role="status"
        aria-label={`Trust score: ${scores.overall}%`}
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : undefined}
      >
        <span>⭐</span>
        <span>{scores.overall}%</span>
      </span>
    );
  }

  // Full badge with details
  const sizeClasses =
    size === 'sm' ? 'p-3 text-sm' : size === 'lg' ? 'p-6 text-base' : 'p-4 text-sm';

  return (
    <div
      className={`rounded-lg border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Header with overall score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span className="font-bold text-lg">{scores.overall}%</span>
          </div>
          {showVerification && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full border ${verificationColors.bg} ${verificationColors.text} ${verificationColors.border}`}
            >
              {user.verificationLevel === 'VERIFIED_HUMAN'
                ? 'Verified'
                : user.verificationLevel === 'ENHANCED'
                  ? 'Enhanced'
                  : 'Basic'}
            </span>
          )}
        </div>
        <p className="font-semibold">{getTrustLevelLabel(scores.level)}</p>
        <p className="text-xs opacity-75 mt-1">
          {scores.trustworthy ? '✓ Trustworthy' : '⚠ Low trust'}
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all`}
            style={{ width: `${scores.overall}%` }}
          />
        </div>
      </div>

      {/* Dimensional breakdown */}
      {showDimensions && (
        <div className="space-y-2 text-xs border-t border-current border-opacity-20 pt-3">
          <div className="flex items-center justify-between">
            <span>Ability</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${scores.ability}%` }} />
              </div>
              <span className="font-semibold w-10 text-right">{scores.ability}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Benevolence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${scores.benevolence}%` }} />
              </div>
              <span className="font-semibold w-10 text-right">{scores.benevolence}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Integrity</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${scores.integrity}%` }} />
              </div>
              <span className="font-semibold w-10 text-right">{scores.integrity}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Info text */}
      {showLabel && (
        <p className="text-xs opacity-75 mt-3 border-t border-current border-opacity-20 pt-2">
          Based on contributions, engagement, and verification status
        </p>
      )}
    </div>
  );
};

export default TrustScoreBadge;
