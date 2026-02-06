/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a viewpoint in a divergence point
 */
export interface DivergenceViewpoint {
  /**
   * The position or stance taken by this group
   */
  position: string;

  /**
   * Number of participants holding this viewpoint
   */
  participantCount: number;

  /**
   * Percentage of total participants (0-100)
   */
  percentage: number;

  /**
   * Supporting reasoning for this viewpoint
   */
  reasoning: string[];
}

/**
 * Represents a point where discussion viewpoints diverge
 */
export interface DivergencePoint {
  /**
   * The proposition where divergence occurs
   */
  proposition: string;

  /**
   * ID of the proposition (if applicable)
   */
  propositionId?: string;

  /**
   * Different viewpoints at this divergence point
   */
  viewpoints: DivergenceViewpoint[];

  /**
   * Measure of how polarized the divergence is (0.00-1.00)
   * 0 = no polarization (uniform distribution)
   * 1 = maximum polarization (binary split)
   */
  polarizationScore: number;

  /**
   * Total number of participants at this divergence point
   */
  totalParticipants: number;

  /**
   * Underlying values driving the divergence (if identified)
   */
  underlyingValues?: string[];
}

/**
 * Analysis result for divergence points in a discussion
 */
export interface DivergenceAnalysis {
  /**
   * ID of the analyzed topic
   */
  topicId: string;

  /**
   * Identified divergence points
   */
  divergencePoints: DivergencePoint[];

  /**
   * Overall polarization score for the discussion (0.00-1.00)
   */
  overallPolarization: number;

  /**
   * Number of participants analyzed
   */
  participantCount: number;

  /**
   * When this analysis was generated
   */
  analyzedAt: Date;
}
