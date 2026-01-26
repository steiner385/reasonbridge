import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BridgingSuggestionDto } from '../suggestions/dto/bridging-suggestions.dto.js';

/**
 * Result from bridging suggestions analysis
 */
export interface BridgingSuggestionResult {
  suggestions: BridgingSuggestionDto[];
  overallConsensusScore: number;
  conflictAreas: string[];
  commonGroundAreas: string[];
  confidenceScore: number;
  reasoning: string;
}

/**
 * Bridging suggestion synthesizer
 * Analyzes propositions and alignments to suggest ways to bridge different perspectives
 */
@Injectable()
export class BridgingSuggester {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate bridging suggestions for a topic
   * @param topicId The topic ID to analyze
   * @returns Bridging suggestions with confidence scores
   */
  async suggest(topicId: string): Promise<BridgingSuggestionResult> {
    // Fetch all propositions for this topic with their alignments
    const propositions = await this.prisma.proposition.findMany({
      where: { topicId },
      include: {
        alignments: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    // If no propositions exist, return empty result
    if (propositions.length === 0) {
      return {
        suggestions: [],
        overallConsensusScore: 0,
        conflictAreas: [],
        commonGroundAreas: [],
        confidenceScore: 0.5,
        reasoning:
          'No propositions found for this topic. Bridging suggestions require active discussion with multiple viewpoints.',
      };
    }

    // Analyze propositions to find bridging opportunities
    const suggestions: BridgingSuggestionDto[] = [];
    const conflictAreas: string[] = [];
    const commonGroundAreas: string[] = [];

    // Calculate overall consensus score from proposition data
    let totalConsensusScore = 0;
    let propositionsWithConsensus = 0;

    for (const proposition of propositions) {
      if (proposition.consensusScore !== null) {
        totalConsensusScore += Number(proposition.consensusScore);
        propositionsWithConsensus++;
      }

      // Analyze alignment distribution
      const alignmentCounts = {
        SUPPORT: proposition.supportCount,
        OPPOSE: proposition.opposeCount,
        NUANCED: proposition.nuancedCount,
      };

      // Identify propositions with significant disagreement (good bridging opportunities)
      const hasDisagreement =
        (alignmentCounts.SUPPORT > 0 && alignmentCounts.OPPOSE > 0) || alignmentCounts.NUANCED > 0;

      if (hasDisagreement) {
        // This proposition has multiple perspectives - good candidate for bridging
        const bridgingSuggestion = this.generateBridgingSuggestion(proposition, alignmentCounts);
        suggestions.push(bridgingSuggestion);

        // Track conflict areas
        if (alignmentCounts.SUPPORT > 0 && alignmentCounts.OPPOSE > 0) {
          conflictAreas.push(proposition.statement.substring(0, 100));
        }
      }

      // Identify common ground (high consensus or strong support)
      if (proposition.consensusScore && Number(proposition.consensusScore) > 0.7) {
        commonGroundAreas.push(proposition.statement.substring(0, 100));
      }
    }

    const overallConsensusScore =
      propositionsWithConsensus > 0 ? totalConsensusScore / propositionsWithConsensus : 0;

    // Calculate overall confidence based on data availability
    const confidenceScore = this.calculateConfidence(propositions.length, suggestions.length);

    const reasoning = this.generateReasoning(
      propositions.length,
      suggestions.length,
      overallConsensusScore,
      conflictAreas.length,
      commonGroundAreas.length,
    );

    return {
      suggestions,
      overallConsensusScore,
      conflictAreas,
      commonGroundAreas,
      confidenceScore,
      reasoning,
    };
  }

  /**
   * Generate a bridging suggestion for a specific proposition
   */
  private generateBridgingSuggestion(
    proposition: any,
    alignmentCounts: { SUPPORT: number; OPPOSE: number; NUANCED: number },
  ): BridgingSuggestionDto {
    const totalAlignments =
      alignmentCounts.SUPPORT + alignmentCounts.OPPOSE + alignmentCounts.NUANCED;

    // Determine dominant positions
    let sourcePosition = 'SUPPORT';
    let targetPosition = 'OPPOSE';

    if (alignmentCounts.OPPOSE > alignmentCounts.SUPPORT) {
      sourcePosition = 'OPPOSE';
      targetPosition = 'SUPPORT';
    }

    // If nuanced views exist, they're often good bridging points
    if (alignmentCounts.NUANCED > 0) {
      targetPosition = 'NUANCED';
    }

    // Generate bridging language based on the proposition
    const bridgingLanguage = this.generateBridgingLanguage(
      proposition.statement,
      sourcePosition,
      targetPosition,
    );

    // Identify common ground
    const commonGround = this.identifyCommonGround(proposition.statement, alignmentCounts);

    // Calculate confidence for this specific suggestion
    const confidenceScore = this.calculateSuggestionConfidence(
      totalAlignments,
      alignmentCounts.NUANCED,
    );

    const reasoning = `This proposition has ${alignmentCounts.SUPPORT} supporters, ${alignmentCounts.OPPOSE} opponents, and ${alignmentCounts.NUANCED} nuanced views. Bridging these perspectives could help find shared values.`;

    return {
      propositionId: proposition.id,
      sourcePosition,
      targetPosition,
      bridgingLanguage,
      commonGround,
      reasoning,
      confidenceScore,
    };
  }

  /**
   * Generate bridging language that connects perspectives
   */
  private generateBridgingLanguage(
    propositionText: string,
    sourcePosition: string,
    targetPosition: string,
  ): string {
    // Stub implementation - in production, this would use AI to generate contextual bridging language
    const bridgingPhrases = [
      `While there are different views on "${propositionText.substring(0, 50)}...", both perspectives share concerns about...`,
      `Consider how those who ${sourcePosition.toLowerCase()} and those who ${targetPosition.toLowerCase()} this idea might find common ground in...`,
      `Rather than viewing this as ${sourcePosition.toLowerCase()} vs ${targetPosition.toLowerCase()}, we could explore the underlying values both sides care about...`,
      `This disagreement may stem from different priorities rather than fundamentally opposed values. What if we focused on...`,
    ];

    // Return a random bridging phrase (would be AI-generated in production)
    const randomIndex = Math.floor(Math.random() * bridgingPhrases.length);
    return bridgingPhrases[randomIndex]!;
  }

  /**
   * Identify potential common ground between positions
   */
  private identifyCommonGround(
    propositionText: string,
    alignmentCounts: { SUPPORT: number; OPPOSE: number; NUANCED: number },
  ): string {
    // Stub implementation - would use semantic analysis in production
    const hasNuanced = alignmentCounts.NUANCED > 0;

    if (hasNuanced) {
      return 'The nuanced perspectives suggest there may be shared concerns or values that transcend simple support/oppose positions.';
    }

    return 'Both positions likely share fundamental values or goals, even if they disagree on this specific approach.';
  }

  /**
   * Calculate confidence score for a specific suggestion
   */
  private calculateSuggestionConfidence(totalAlignments: number, nuancedCount: number): number {
    let confidence = 0.5; // Base confidence

    // More alignments = higher confidence in the analysis
    if (totalAlignments >= 10) {
      confidence += 0.2;
    } else if (totalAlignments >= 5) {
      confidence += 0.1;
    }

    // Presence of nuanced views increases confidence (shows thoughtful engagement)
    if (nuancedCount > 0) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall confidence score for the analysis
   */
  private calculateConfidence(propositionCount: number, suggestionCount: number): number {
    let confidence = 0.5; // Base confidence

    // More propositions = more data to analyze
    if (propositionCount >= 10) {
      confidence += 0.2;
    } else if (propositionCount >= 5) {
      confidence += 0.1;
    }

    // Having suggestions indicates active disagreement to bridge
    if (suggestionCount > 0) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate reasoning explanation for the overall analysis
   */
  private generateReasoning(
    propositionCount: number,
    suggestionCount: number,
    consensusScore: number,
    conflictCount: number,
    commonGroundCount: number,
  ): string {
    const parts: string[] = [];

    parts.push(
      `Analyzed ${propositionCount} proposition${propositionCount === 1 ? '' : 's'} from this topic.`,
    );

    if (suggestionCount > 0) {
      parts.push(
        `Found ${suggestionCount} bridging opportunit${suggestionCount === 1 ? 'y' : 'ies'} where different perspectives could be connected.`,
      );
    }

    if (conflictCount > 0) {
      parts.push(
        `Identified ${conflictCount} area${conflictCount === 1 ? '' : 's'} of disagreement that could benefit from bridging dialogue.`,
      );
    }

    if (commonGroundCount > 0) {
      parts.push(
        `Found ${commonGroundCount} area${commonGroundCount === 1 ? '' : 's'} of common ground with high consensus.`,
      );
    }

    if (consensusScore > 0) {
      const consensusLevel =
        consensusScore > 0.7 ? 'high' : consensusScore > 0.4 ? 'moderate' : 'low';
      parts.push(
        `Overall consensus level is ${consensusLevel} (${(consensusScore * 100).toFixed(0)}%).`,
      );
    }

    parts.push(
      'Note: This is a rule-based analysis. AI-powered semantic understanding will provide more nuanced bridging suggestions in future iterations.',
    );

    return parts.join(' ');
  }
}
