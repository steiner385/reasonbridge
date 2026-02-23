/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { ExpertiseLevel } from '@prisma/client';

/**
 * Input parameters for calculating expertise score
 */
export interface ExpertiseScoreInput {
  /** Number of responses in this category */
  categoryResponseCount: number;
  /** Average quality score of responses in this category (0-1) */
  avgQualityScore: number;
  /** Sum of verified credential boosts for this category */
  credentialBoostTotal: number;
  /** Days since first response in this category */
  daysSinceFirstResponse: number;
}

/**
 * ExpertiseCalculatorService - Calculates domain-specific expertise scores
 *
 * Formula:
 * expertiseScore =
 *   (categoryEngagement × 0.40) +
 *   (categoryQuality × 0.30) +
 *   (credentialBoost × 0.20) +
 *   (categoryTenure × 0.10)
 *
 * Where:
 * - categoryEngagement = min(1.0, categoryResponseCount / 50)
 * - categoryQuality = avgQualityScore in category
 * - credentialBoost = sum of verified credential boosts (capped at 1.0)
 * - categoryTenure = min(1.0, daysSinceFirstCategoryResponse / 180)
 *
 * Expertise Levels:
 * - NOVICE: 0.00 - 0.24
 * - FAMILIAR: 0.25 - 0.49
 * - KNOWLEDGEABLE: 0.50 - 0.74
 * - EXPERT: 0.75 - 1.00
 */
@Injectable()
export class ExpertiseCalculatorService {
  private readonly ENGAGEMENT_THRESHOLD = 50; // responses
  private readonly TENURE_THRESHOLD = 180; // days

  private readonly WEIGHT_ENGAGEMENT = 0.4;
  private readonly WEIGHT_QUALITY = 0.3;
  private readonly WEIGHT_CREDENTIAL = 0.2;
  private readonly WEIGHT_TENURE = 0.1;

  /**
   * Calculate the expertise score for a user in a specific category
   * @param input - The input parameters for calculation
   * @returns A score between 0 and 1
   */
  calculateExpertiseScore(input: ExpertiseScoreInput): number {
    // Calculate each component with caps
    const categoryEngagement = Math.min(
      1.0,
      input.categoryResponseCount / this.ENGAGEMENT_THRESHOLD,
    );
    const categoryQuality = input.avgQualityScore;
    const credentialBoost = Math.min(1.0, input.credentialBoostTotal);
    const categoryTenure = Math.min(1.0, input.daysSinceFirstResponse / this.TENURE_THRESHOLD);

    // Apply weights
    const score =
      categoryEngagement * this.WEIGHT_ENGAGEMENT +
      categoryQuality * this.WEIGHT_QUALITY +
      credentialBoost * this.WEIGHT_CREDENTIAL +
      categoryTenure * this.WEIGHT_TENURE;

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine expertise level based on expertise score
   * @param score - The expertise score (0-1)
   * @returns The expertise level
   */
  determineExpertiseLevel(score: number): ExpertiseLevel {
    if (score >= 0.75) return ExpertiseLevel.EXPERT;
    if (score >= 0.5) return ExpertiseLevel.KNOWLEDGEABLE;
    if (score >= 0.25) return ExpertiseLevel.FAMILIAR;
    return ExpertiseLevel.NOVICE;
  }

  /**
   * Get the score threshold needed for the next expertise level
   * @param currentLevel - The current expertise level
   * @returns The score threshold for the next level
   */
  getNextLevelThreshold(currentLevel: ExpertiseLevel): number {
    switch (currentLevel) {
      case ExpertiseLevel.NOVICE:
        return 0.25;
      case ExpertiseLevel.FAMILIAR:
        return 0.5;
      case ExpertiseLevel.KNOWLEDGEABLE:
        return 0.75;
      case ExpertiseLevel.EXPERT:
        return 1.0; // Already at max
    }
  }
}
