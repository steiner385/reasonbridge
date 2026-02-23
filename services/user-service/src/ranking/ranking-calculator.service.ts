/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { TierLevel } from '@prisma/client';

export interface CompositeScoreInput {
  trustAverage: number;
  verificationLevel: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
  engagementScore: number;
  qualityScore: number;
  accountAgeDays: number;
}

/**
 * RankingCalculatorService - Calculates user composite scores and tier levels
 *
 * Formula:
 * compositeScore =
 *   (trustAverage × 0.40) +
 *   (verificationWeight × 0.20) +
 *   (engagementScore × 0.20) +
 *   (qualityScore × 0.15) +
 *   (tenureBonus × 0.05)
 */
@Injectable()
export class RankingCalculatorService {
  private readonly VERIFICATION_WEIGHTS = {
    BASIC: 0.2,
    ENHANCED: 0.6,
    VERIFIED_HUMAN: 1.0,
  };

  /**
   * Calculate the composite score for ranking
   */
  calculateCompositeScore(input: CompositeScoreInput): number {
    const verificationWeight = this.VERIFICATION_WEIGHTS[input.verificationLevel];
    const tenureBonus = Math.min(1.0, input.accountAgeDays / 365);

    const score =
      input.trustAverage * 0.4 +
      verificationWeight * 0.2 +
      input.engagementScore * 0.2 +
      input.qualityScore * 0.15 +
      tenureBonus * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine tier level based on composite score
   */
  determineTierLevel(compositeScore: number): TierLevel {
    if (compositeScore >= 0.8) return TierLevel.EXPERT;
    if (compositeScore >= 0.6) return TierLevel.LEADER;
    if (compositeScore >= 0.4) return TierLevel.TRUSTED;
    if (compositeScore >= 0.2) return TierLevel.CONTRIBUTOR;
    return TierLevel.NEWCOMER;
  }

  /**
   * Get the score threshold needed for the next tier
   */
  getNextTierThreshold(currentTier: TierLevel): number {
    switch (currentTier) {
      case TierLevel.NEWCOMER:
        return 0.2;
      case TierLevel.CONTRIBUTOR:
        return 0.4;
      case TierLevel.TRUSTED:
        return 0.6;
      case TierLevel.LEADER:
        return 0.8;
      case TierLevel.EXPERT:
        return 1.0; // Already at max
    }
  }
}
