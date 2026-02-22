/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User Ranking System Types
 *
 * Types for the tiered user ranking system that tracks user engagement,
 * quality of contributions, and assigns global tier levels.
 */

/**
 * User tier levels in the ranking system.
 * Each tier represents a level of reputation and access.
 */
export type TierLevel = 'NEWCOMER' | 'CONTRIBUTOR' | 'TRUSTED' | 'LEADER' | 'EXPERT';

/**
 * Numeric mapping for tier levels (1-5)
 */
export const TIER_LEVEL_NUMBERS: Record<TierLevel, number> = {
  NEWCOMER: 1,
  CONTRIBUTOR: 2,
  TRUSTED: 3,
  LEADER: 4,
  EXPERT: 5,
};

/**
 * Score thresholds for each tier level
 */
export const TIER_THRESHOLDS: Record<TierLevel, { min: number; max: number }> = {
  NEWCOMER: { min: 0.0, max: 0.19 },
  CONTRIBUTOR: { min: 0.2, max: 0.39 },
  TRUSTED: { min: 0.4, max: 0.59 },
  LEADER: { min: 0.6, max: 0.79 },
  EXPERT: { min: 0.8, max: 1.0 },
};

/**
 * User ranking information including composite score and tier details
 */
export interface UserRank {
  /** User ID this ranking belongs to */
  userId: string;

  /** User's display name (may be null if not set) */
  displayName: string | null;

  /** Overall composite score (0.00 - 1.00) */
  compositeScore: number;

  /** Current tier level */
  tierLevel: TierLevel;

  /** Score threshold for next tier (1.0 if already at EXPERT) */
  nextTierThreshold: number;

  /** Progress towards next tier as percentage (0-100) */
  progressToNextTier: number;

  /** Engagement score component (0.00 - 1.00) */
  engagementScore: number;

  /** Quality score component (0.00 - 1.00) */
  qualityScore: number;

  /** Tenure bonus component (0.00 - 0.10) */
  tenureBonus: number;

  /** Array of badge IDs earned by the user */
  badges: string[];

  /** ISO timestamp of last score calculation */
  lastCalculated: string;

  /** ISO timestamp of last user activity (null if never active) */
  lastActivityAt: string | null;
}

/**
 * Tier metadata for display purposes
 */
export interface TierInfo {
  level: TierLevel;
  name: string;
  description: string;
  color: string;
  darkColor: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
  darkBorderColor: string;
}

/**
 * Get tier information for display
 */
export const getTierInfo = (tier: TierLevel): TierInfo => {
  const tiers: Record<TierLevel, TierInfo> = {
    NEWCOMER: {
      level: 'NEWCOMER',
      name: 'Newcomer',
      description: 'New to the community',
      color: 'text-gray-700',
      darkColor: 'dark:text-gray-300',
      bgColor: 'bg-gray-100',
      darkBgColor: 'dark:bg-gray-800',
      borderColor: 'border-gray-300',
      darkBorderColor: 'dark:border-gray-600',
    },
    CONTRIBUTOR: {
      level: 'CONTRIBUTOR',
      name: 'Contributor',
      description: 'Active community member',
      color: 'text-green-700',
      darkColor: 'dark:text-green-400',
      bgColor: 'bg-green-100',
      darkBgColor: 'dark:bg-green-900/30',
      borderColor: 'border-green-300',
      darkBorderColor: 'dark:border-green-700',
    },
    TRUSTED: {
      level: 'TRUSTED',
      name: 'Trusted',
      description: 'Trusted community member',
      color: 'text-blue-700',
      darkColor: 'dark:text-blue-400',
      bgColor: 'bg-blue-100',
      darkBgColor: 'dark:bg-blue-900/30',
      borderColor: 'border-blue-300',
      darkBorderColor: 'dark:border-blue-700',
    },
    LEADER: {
      level: 'LEADER',
      name: 'Leader',
      description: 'Community leader',
      color: 'text-purple-700',
      darkColor: 'dark:text-purple-400',
      bgColor: 'bg-purple-100',
      darkBgColor: 'dark:bg-purple-900/30',
      borderColor: 'border-purple-300',
      darkBorderColor: 'dark:border-purple-700',
    },
    EXPERT: {
      level: 'EXPERT',
      name: 'Expert',
      description: 'Expert contributor',
      color: 'text-amber-700',
      darkColor: 'dark:text-amber-400',
      bgColor: 'bg-amber-100',
      darkBgColor: 'dark:bg-amber-900/30',
      borderColor: 'border-amber-300',
      darkBorderColor: 'dark:border-amber-700',
    },
  };

  return tiers[tier];
};
