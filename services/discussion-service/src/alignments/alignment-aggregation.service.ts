/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AlignmentAggregationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Update alignment aggregation counts and consensus score for a proposition
   * Called after alignment create/update/delete operations
   */
  async updatePropositionAggregates(propositionId: string): Promise<void> {
    // Get all alignments for this proposition
    const alignments = await this.prisma.alignment.findMany({
      where: { propositionId },
      select: { stance: true },
    });

    // Count alignments by stance
    const supportCount = alignments.filter((a) => a.stance === 'SUPPORT').length;
    const opposeCount = alignments.filter((a) => a.stance === 'OPPOSE').length;
    const nuancedCount = alignments.filter((a) => a.stance === 'NUANCED').length;

    // Calculate consensus score
    const consensusScore = this.calculateConsensusScore(supportCount, opposeCount, nuancedCount);

    // Update proposition with aggregated data
    await this.prisma.proposition.update({
      where: { id: propositionId },
      data: {
        supportCount,
        opposeCount,
        nuancedCount,
        consensusScore,
      },
    });
  }

  /**
   * Calculate consensus score based on alignment distribution
   * Returns a decimal between 0.00 and 1.00 representing agreement level
   *
   * Formula:
   * - If no alignments: null (no consensus data)
   * - Otherwise: (support_count - oppose_count) / total_alignments
   *   Normalized to 0.00-1.00 range: ((score + 1) / 2)
   *
   * Examples:
   * - All support (10-0-0): score = 10/10 = 1.0, normalized = 1.00
   * - All oppose (0-10-0): score = -10/10 = -1.0, normalized = 0.00
   * - Balanced (5-5-0): score = 0/10 = 0.0, normalized = 0.50
   * - Mixed with nuanced (6-2-2): score = 4/10 = 0.4, normalized = 0.70
   */
  private calculateConsensusScore(
    supportCount: number,
    opposeCount: number,
    nuancedCount: number,
  ): number | null {
    const totalAlignments = supportCount + opposeCount + nuancedCount;

    // No alignments = no consensus score
    if (totalAlignments === 0) {
      return null;
    }

    // Calculate raw score: (support - oppose) / total
    // This gives a value between -1 and 1
    const rawScore = (supportCount - opposeCount) / totalAlignments;

    // Normalize to 0.00-1.00 range
    const normalizedScore = (rawScore + 1) / 2;

    // Round to 2 decimal places (Prisma will convert to Decimal when storing)
    return Math.round(normalizedScore * 100) / 100;
  }

  /**
   * Get current aggregation stats for a proposition without updating
   */
  async getPropositionAggregates(propositionId: string): Promise<{
    supportCount: number;
    opposeCount: number;
    nuancedCount: number;
    consensusScore: number | null;
  }> {
    const proposition = await this.prisma.proposition.findUnique({
      where: { id: propositionId },
      select: {
        supportCount: true,
        opposeCount: true,
        nuancedCount: true,
        consensusScore: true,
      },
    });

    if (!proposition) {
      throw new Error(`Proposition with ID ${propositionId} not found`);
    }

    return {
      ...proposition,
      consensusScore: proposition.consensusScore ? Number(proposition.consensusScore) : null,
    };
  }

  /**
   * Recalculate aggregates for all propositions using batch SQL aggregation.
   * Useful for data migration or fixing inconsistencies.
   *
   * Uses a single aggregation query instead of N+1 queries for efficiency.
   * With 10,000 propositions: 2 queries instead of 20,001.
   */
  async recalculateAllAggregates(): Promise<number> {
    // Batch aggregate all alignment counts in a single query
    const aggregates = await this.prisma.$queryRaw<
      Array<{
        proposition_id: string;
        support_count: bigint;
        oppose_count: bigint;
        nuanced_count: bigint;
      }>
    >`
      SELECT
        p.id as proposition_id,
        COUNT(CASE WHEN a.stance = 'SUPPORT' THEN 1 END) as support_count,
        COUNT(CASE WHEN a.stance = 'OPPOSE' THEN 1 END) as oppose_count,
        COUNT(CASE WHEN a.stance = 'NUANCED' THEN 1 END) as nuanced_count
      FROM propositions p
      LEFT JOIN alignments a ON p.id = a.proposition_id
      GROUP BY p.id
    `;

    if (aggregates.length === 0) {
      return 0;
    }

    // Build batch update operations
    const updates = aggregates.map((agg) => {
      const supportCount = Number(agg.support_count);
      const opposeCount = Number(agg.oppose_count);
      const nuancedCount = Number(agg.nuanced_count);
      const consensusScore = this.calculateConsensusScore(supportCount, opposeCount, nuancedCount);

      return this.prisma.proposition.update({
        where: { id: agg.proposition_id },
        data: {
          supportCount,
          opposeCount,
          nuancedCount,
          consensusScore,
        },
      });
    });

    // Execute all updates in a single transaction
    await this.prisma.$transaction(updates);

    return aggregates.length;
  }
}
