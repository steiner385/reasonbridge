/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExpertiseLevel } from '@prisma/client';

/**
 * TopicExpertiseDto - Data transfer object for topic expertise information
 *
 * Contains the user's expertise score, level, and progress within a specific topic/tag.
 */
export class TopicExpertiseDto {
  /** The unique identifier of the user */
  userId: string;

  /** The unique identifier of the topic tag */
  tagId: string;

  /** Name of the topic tag for display purposes */
  tagName: string;

  /** The calculated expertise score (0-1) */
  expertiseScore: number;

  /** Current expertise level based on score */
  expertiseLevel: ExpertiseLevel;

  /** Number of responses in this topic category */
  responseCount: number;

  /** Average quality score of responses in this category (0-1) */
  avgQualityScore: number;

  /** Credential boost from verified credentials (0-1) */
  credentialBoost: number;

  /** Progress percentage towards the next expertise level (0-100) */
  progressToNextLevel: number;

  /** Timestamp of last activity in this topic */
  lastActive: Date | null;

  constructor(data: {
    userId: string;
    tagId: string;
    tagName: string;
    expertiseScore: number;
    expertiseLevel: ExpertiseLevel;
    responseCount: number;
    avgQualityScore: number;
    credentialBoost: number;
    lastActive: Date | null;
  }) {
    this.userId = data.userId;
    this.tagId = data.tagId;
    this.tagName = data.tagName;
    this.expertiseScore = data.expertiseScore;
    this.expertiseLevel = data.expertiseLevel;
    this.responseCount = data.responseCount;
    this.avgQualityScore = data.avgQualityScore;
    this.credentialBoost = data.credentialBoost;
    this.lastActive = data.lastActive;

    // Calculate progress to next level
    this.progressToNextLevel = this.calculateProgress();
  }

  /**
   * Calculate percentage progress toward the next expertise level
   */
  private calculateProgress(): number {
    const thresholds: Record<ExpertiseLevel, { min: number; max: number }> = {
      [ExpertiseLevel.NOVICE]: { min: 0, max: 0.25 },
      [ExpertiseLevel.FAMILIAR]: { min: 0.25, max: 0.5 },
      [ExpertiseLevel.KNOWLEDGEABLE]: { min: 0.5, max: 0.75 },
      [ExpertiseLevel.EXPERT]: { min: 0.75, max: 1.0 },
    };

    const range = thresholds[this.expertiseLevel];

    // If at max level (EXPERT), progress is 100%
    if (this.expertiseLevel === ExpertiseLevel.EXPERT) {
      return 100;
    }

    // Calculate progress within current level range
    const rangeSize = range.max - range.min;
    const progressInRange = this.expertiseScore - range.min;
    const percentage = (progressInRange / rangeSize) * 100;

    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * Check if user is close to reaching the next expertise level (within 5%)
   */
  isCloseToNextLevel(): boolean {
    if (this.expertiseLevel === ExpertiseLevel.EXPERT) {
      return false;
    }

    const nextThresholds: Record<ExpertiseLevel, number> = {
      [ExpertiseLevel.NOVICE]: 0.25,
      [ExpertiseLevel.FAMILIAR]: 0.5,
      [ExpertiseLevel.KNOWLEDGEABLE]: 0.75,
      [ExpertiseLevel.EXPERT]: 1.0,
    };

    const nextThreshold = nextThresholds[this.expertiseLevel];
    return nextThreshold - this.expertiseScore <= 0.05;
  }

  /**
   * Get a human-readable expertise level name
   */
  getLevelDisplayName(): string {
    const displayNames: Record<ExpertiseLevel, string> = {
      [ExpertiseLevel.NOVICE]: 'Novice',
      [ExpertiseLevel.FAMILIAR]: 'Familiar',
      [ExpertiseLevel.KNOWLEDGEABLE]: 'Knowledgeable',
      [ExpertiseLevel.EXPERT]: 'Expert',
    };
    return displayNames[this.expertiseLevel];
  }
}
