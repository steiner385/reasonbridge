/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TierLevel } from '@prisma/client';

/**
 * UserRankDto - Data transfer object for user ranking information
 *
 * Contains the user's composite score, tier level, and progress towards the next tier.
 */
export class UserRankDto {
  /** The unique identifier of the user */
  userId: string;

  /** User's display name */
  displayName: string | null;

  /** The overall composite score (0-1) combining all ranking factors */
  compositeScore: number;

  /** Current tier level based on composite score */
  tierLevel: TierLevel;

  /** Score threshold required to reach the next tier */
  nextTierThreshold: number;

  /** Progress percentage towards the next tier (0-100) */
  progressToNextTier: number;

  /** User's engagement score component (0-1) */
  engagementScore: number;

  /** User's quality score component (0-1) */
  qualityScore: number;

  /** Tenure bonus component (0-1, scales with account age up to 1 year) */
  tenureBonus: number;

  /** Badges earned by the user */
  badges: string[];

  /** When the rank was last calculated */
  lastCalculated: Date;

  /** User's last activity timestamp */
  lastActivityAt: Date | null;

  constructor(data: {
    userId: string;
    displayName: string | null;
    compositeScore: number;
    tierLevel: TierLevel;
    nextTierThreshold: number;
    engagementScore: number;
    qualityScore: number;
    tenureBonus: number;
    badges: string[];
    lastCalculated: Date;
    lastActivityAt: Date | null;
  }) {
    this.userId = data.userId;
    this.displayName = data.displayName;
    this.compositeScore = data.compositeScore;
    this.tierLevel = data.tierLevel;
    this.nextTierThreshold = data.nextTierThreshold;
    this.engagementScore = data.engagementScore;
    this.qualityScore = data.qualityScore;
    this.tenureBonus = data.tenureBonus;
    this.badges = data.badges;
    this.lastCalculated = data.lastCalculated;
    this.lastActivityAt = data.lastActivityAt;

    // Calculate progress to next tier
    this.progressToNextTier = this.calculateProgress();
  }

  /**
   * Calculate percentage progress toward the next tier
   */
  private calculateProgress(): number {
    // Get current tier threshold
    const currentThresholds: Record<TierLevel, number> = {
      [TierLevel.NEWCOMER]: 0,
      [TierLevel.CONTRIBUTOR]: 0.2,
      [TierLevel.TRUSTED]: 0.4,
      [TierLevel.LEADER]: 0.6,
      [TierLevel.EXPERT]: 0.8,
    };

    const currentThreshold = currentThresholds[this.tierLevel];

    // If at max tier, progress is 100%
    if (this.tierLevel === TierLevel.EXPERT) {
      return 100;
    }

    // Calculate progress within current tier range
    const rangeSize = this.nextTierThreshold - currentThreshold;
    const progressInRange = this.compositeScore - currentThreshold;
    const percentage = (progressInRange / rangeSize) * 100;

    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * Check if user is close to reaching the next tier (within 10%)
   */
  isCloseToNextTier(): boolean {
    if (this.tierLevel === TierLevel.EXPERT) {
      return false;
    }
    return this.nextTierThreshold - this.compositeScore <= 0.02;
  }

  /**
   * Get a human-readable tier name
   */
  getTierDisplayName(): string {
    const displayNames: Record<TierLevel, string> = {
      [TierLevel.NEWCOMER]: 'Newcomer',
      [TierLevel.CONTRIBUTOR]: 'Contributor',
      [TierLevel.TRUSTED]: 'Trusted',
      [TierLevel.LEADER]: 'Leader',
      [TierLevel.EXPERT]: 'Expert',
    };
    return displayNames[this.tierLevel];
  }
}
