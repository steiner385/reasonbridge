import { Injectable, Logger } from '@nestjs/common';
import type {
  DivergencePoint,
  DivergenceViewpoint,
  DivergenceAnalysis,
} from './divergence-point.dto.js';

/**
 * Input data for a proposition with alignments
 */
export interface PropositionAlignment {
  id: string;
  statement: string;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  alignments: {
    userId: string;
    stance: 'SUPPORT' | 'OPPOSE' | 'NUANCED';
    nuanceExplanation?: string;
  }[];
}

/**
 * Divergence Point Service
 *
 * Identifies points where discussion viewpoints diverge, analyzing:
 * - Propositions with significant opposition
 * - Distribution of viewpoints (support vs oppose)
 * - Polarization levels
 * - Underlying patterns in disagreements
 *
 * A divergence point represents a genuine disagreement where participants
 * have clearly understood but opposing positions (not misunderstandings).
 */
@Injectable()
export class DivergencePointService {
  private readonly logger = new Logger(DivergencePointService.name);

  /**
   * Minimum percentage for a viewpoint to be considered significant
   */
  private readonly SIGNIFICANT_VIEWPOINT_THRESHOLD = 0.2; // 20%

  /**
   * Minimum total participants to analyze divergence
   */
  private readonly MIN_PARTICIPANTS = 3;

  /**
   * Maximum nuanced percentage to consider as genuine disagreement
   * (higher nuance suggests misunderstanding rather than clear disagreement)
   */
  private readonly MAX_NUANCE_FOR_DIVERGENCE = 0.4; // 40%

  /**
   * Identify divergence points in a discussion
   *
   * @param topicId - ID of the topic being analyzed
   * @param propositions - Propositions with alignment data
   * @returns Divergence analysis with identified points
   */
  async identifyDivergencePoints(
    topicId: string,
    propositions: PropositionAlignment[],
  ): Promise<DivergenceAnalysis> {
    const divergencePoints: DivergencePoint[] = [];

    // Analyze each proposition for divergence
    for (const proposition of propositions) {
      const divergence = this.analyzePropositionDivergence(proposition);

      if (divergence) {
        divergencePoints.push(divergence);
      }
    }

    // Calculate overall polarization
    const overallPolarization = this.calculateOverallPolarization(divergencePoints);

    // Count unique participants across all propositions
    const participantCount = this.countUniqueParticipants(propositions);

    this.logger.debug(
      `Identified ${divergencePoints.length} divergence points in topic ${topicId}`,
    );

    return {
      topicId,
      divergencePoints,
      overallPolarization,
      participantCount,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze a single proposition for divergence
   *
   * @param proposition - Proposition with alignment data
   * @returns DivergencePoint if divergence is found, null otherwise
   */
  private analyzePropositionDivergence(
    proposition: PropositionAlignment,
  ): DivergencePoint | null {
    const totalParticipants =
      proposition.supportCount + proposition.opposeCount + proposition.nuancedCount;

    // Skip if insufficient participation
    if (totalParticipants < this.MIN_PARTICIPANTS) {
      return null;
    }

    const supportPercentage = proposition.supportCount / totalParticipants;
    const opposePercentage = proposition.opposeCount / totalParticipants;
    const nuancedPercentage = proposition.nuancedCount / totalParticipants;

    // Check if this is a genuine divergence (not a misunderstanding)
    // Divergence requires:
    // 1. Significant support AND opposition
    // 2. Low nuance (high nuance suggests misunderstanding)
    const hasSignificantSupport = supportPercentage >= this.SIGNIFICANT_VIEWPOINT_THRESHOLD;
    const hasSignificantOpposition = opposePercentage >= this.SIGNIFICANT_VIEWPOINT_THRESHOLD;
    const isLowNuance = nuancedPercentage < this.MAX_NUANCE_FOR_DIVERGENCE;

    if (!hasSignificantSupport || !hasSignificantOpposition || !isLowNuance) {
      return null;
    }

    // Build viewpoints
    const viewpoints: DivergenceViewpoint[] = [];

    // Support viewpoint
    if (proposition.supportCount > 0) {
      const supportReasoning = proposition.alignments
        .filter((a) => a.stance === 'SUPPORT' && a.nuanceExplanation)
        .map((a) => a.nuanceExplanation!)
        .slice(0, 3); // Top 3 reasons

      viewpoints.push({
        position: 'Support',
        participantCount: proposition.supportCount,
        percentage: Math.round(supportPercentage * 100),
        reasoning: supportReasoning.length > 0 ? supportReasoning : ['Supports this proposition'],
      });
    }

    // Oppose viewpoint
    if (proposition.opposeCount > 0) {
      const opposeReasoning = proposition.alignments
        .filter((a) => a.stance === 'OPPOSE' && a.nuanceExplanation)
        .map((a) => a.nuanceExplanation!)
        .slice(0, 3); // Top 3 reasons

      viewpoints.push({
        position: 'Oppose',
        participantCount: proposition.opposeCount,
        percentage: Math.round(opposePercentage * 100),
        reasoning: opposeReasoning.length > 0 ? opposeReasoning : ['Opposes this proposition'],
      });
    }

    // Calculate polarization score for this divergence point
    // Higher score = more polarized (closer to 50/50 split)
    const polarizationScore = this.calculatePolarization(supportPercentage, opposePercentage);

    return {
      proposition: proposition.statement,
      propositionId: proposition.id,
      viewpoints,
      polarizationScore,
      totalParticipants,
    };
  }

  /**
   * Calculate polarization score
   *
   * Polarization is highest when viewpoints are evenly split (50/50)
   * and lowest when there's a large majority on one side
   *
   * @param supportPercentage - Support percentage (0-1)
   * @param opposePercentage - Oppose percentage (0-1)
   * @returns Polarization score (0-1)
   */
  private calculatePolarization(supportPercentage: number, opposePercentage: number): number {
    // Use Gini impurity-like formula: 1 - sum(p_i^2)
    // This peaks at 0.5 when distribution is even
    const purity = supportPercentage ** 2 + opposePercentage ** 2;
    const impurity = 1 - purity;

    // Normalize to 0-1 range where 0.5 (even split) = 1.0 (max polarization)
    // Maximum impurity is 0.5 (when split is 50/50)
    const maxImpurity = 0.5;
    const normalizedPolarization = impurity / maxImpurity;

    return Math.round(normalizedPolarization * 100) / 100;
  }

  /**
   * Calculate overall polarization across all divergence points
   *
   * @param divergencePoints - Identified divergence points
   * @returns Overall polarization score (0-1)
   */
  private calculateOverallPolarization(divergencePoints: DivergencePoint[]): number {
    if (divergencePoints.length === 0) {
      return 0;
    }

    // Weight each divergence point by participant count
    let weightedSum = 0;
    let totalWeight = 0;

    for (const point of divergencePoints) {
      weightedSum += point.polarizationScore * point.totalParticipants;
      totalWeight += point.totalParticipants;
    }

    const averagePolarization = weightedSum / totalWeight;
    return Math.round(averagePolarization * 100) / 100;
  }

  /**
   * Count unique participants across propositions
   *
   * @param propositions - All propositions
   * @returns Count of unique participants
   */
  private countUniqueParticipants(propositions: PropositionAlignment[]): number {
    const uniqueUsers = new Set<string>();

    for (const proposition of propositions) {
      for (const alignment of proposition.alignments) {
        uniqueUsers.add(alignment.userId);
      }
    }

    return uniqueUsers.size;
  }
}
