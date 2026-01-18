import { Injectable } from '@nestjs/common';
import type {
  AgreementZone,
  Misunderstanding,
  GenuineDisagreement,
} from './dto/common-ground-analysis.dto.js';

/**
 * Input data for common ground synthesis
 */
export interface TopicData {
  topicId: string;
  propositions: PropositionWithAlignments[];
  responses: ResponseData[];
  participantCount: number;
}

/**
 * Proposition with alignment data
 */
export interface PropositionWithAlignments {
  id: string;
  statement: string;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number | null;
  alignments: {
    userId: string;
    stance: 'SUPPORT' | 'OPPOSE' | 'NUANCED';
    nuanceExplanation?: string;
  }[];
}

/**
 * Response data for analysis
 */
export interface ResponseData {
  id: string;
  authorId: string;
  content: string;
  containsOpinion: boolean;
  containsFactualClaims: boolean;
}

/**
 * Synthesis result from common ground analysis
 */
export interface SynthesisResult {
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number | null;
}

/**
 * Common Ground Synthesizer
 *
 * Analyzes discussion data to identify:
 * 1. Agreement zones - propositions with high consensus
 * 2. Misunderstandings - participants talking past each other
 * 3. Genuine disagreements - well-understood opposing viewpoints
 *
 * This is a pattern-based implementation that will be enhanced
 * with AI-powered analysis using AWS Bedrock in future iterations.
 */
@Injectable()
export class CommonGroundSynthesizer {
  /**
   * Minimum alignment percentage to consider a zone as "agreement"
   */
  private readonly AGREEMENT_THRESHOLD = 0.7; // 70%

  /**
   * Minimum alignment percentage for high consensus
   */
  private readonly HIGH_CONSENSUS_THRESHOLD = 0.85; // 85%

  /**
   * Minimum nuanced responses to flag potential misunderstanding
   */
  private readonly NUANCE_THRESHOLD = 0.3; // 30%

  /**
   * Synthesize common ground analysis from topic data
   *
   * @param topicData - Discussion topic data including propositions and responses
   * @returns Synthesis result with agreement zones, misunderstandings, and disagreements
   */
  async synthesize(topicData: TopicData): Promise<SynthesisResult> {
    // Identify agreement zones (high consensus propositions)
    const agreementZones = this.identifyAgreementZones(topicData.propositions);

    // Identify potential misunderstandings (high nuanced responses)
    const misunderstandings = this.identifyMisunderstandings(
      topicData.propositions
    );

    // Identify genuine disagreements (balanced oppose/support with low nuance)
    const genuineDisagreements = this.identifyGenuineDisagreements(
      topicData.propositions
    );

    // Calculate overall consensus score
    const overallConsensusScore = this.calculateOverallConsensus(
      topicData.propositions
    );

    return {
      agreementZones,
      misunderstandings,
      genuineDisagreements,
      overallConsensusScore,
    };
  }

  /**
   * Identify propositions with high agreement
   */
  private identifyAgreementZones(
    propositions: PropositionWithAlignments[]
  ): AgreementZone[] {
    const agreementZones: AgreementZone[] = [];

    for (const prop of propositions) {
      const totalAlignments =
        prop.supportCount + prop.opposeCount + prop.nuancedCount;

      // Skip propositions without sufficient participation
      if (totalAlignments < 3) {
        continue;
      }

      const agreementPercentage = (prop.supportCount / totalAlignments) * 100;

      // Check if this meets the agreement threshold
      if (agreementPercentage >= this.AGREEMENT_THRESHOLD * 100) {
        // Extract supporting evidence from nuanced explanations
        const supportingEvidence = prop.alignments
          .filter(
            (a) =>
              (a.stance === 'SUPPORT' || a.stance === 'NUANCED') &&
              a.nuanceExplanation
          )
          .map((a) => a.nuanceExplanation!)
          .slice(0, 3); // Take top 3 evidence points

        agreementZones.push({
          proposition: prop.statement,
          agreementPercentage: Math.round(agreementPercentage),
          supportingEvidence,
          participantCount: prop.supportCount,
        });
      }
    }

    // Sort by agreement percentage (highest first)
    return agreementZones.sort(
      (a, b) => b.agreementPercentage - a.agreementPercentage
    );
  }

  /**
   * Identify potential misunderstandings based on nuanced responses
   */
  private identifyMisunderstandings(
    propositions: PropositionWithAlignments[]
  ): Misunderstanding[] {
    const misunderstandings: Misunderstanding[] = [];

    for (const prop of propositions) {
      const totalAlignments =
        prop.supportCount + prop.opposeCount + prop.nuancedCount;

      // Skip propositions without sufficient participation
      if (totalAlignments < 3) {
        continue;
      }

      const nuancedPercentage = prop.nuancedCount / totalAlignments;

      // High nuanced count suggests participants see the issue differently
      if (nuancedPercentage >= this.NUANCE_THRESHOLD) {
        // Group nuanced explanations into interpretations
        const interpretations = this.groupInterpretations(prop.alignments);

        // Only include if we found distinct interpretations
        if (interpretations.length >= 2) {
          misunderstandings.push({
            topic: prop.statement,
            interpretations,
            clarification: `This proposition has ${prop.nuancedCount} nuanced responses, suggesting participants may interpret key terms differently. AI-powered semantic analysis will provide specific clarification.`,
          });
        }
      }
    }

    return misunderstandings;
  }

  /**
   * Group alignments into distinct interpretations
   */
  private groupInterpretations(
    alignments: PropositionWithAlignments['alignments']
  ): Misunderstanding['interpretations'] {
    const nuancedAlignments = alignments.filter(
      (a) => a.stance === 'NUANCED' && a.nuanceExplanation
    );

    // For pattern-based implementation, group by stance
    // AI enhancement will use semantic clustering
    const supportNuanced = nuancedAlignments.filter((a) =>
      a.nuanceExplanation?.toLowerCase().includes('support')
    );
    const opposeNuanced = nuancedAlignments.filter((a) =>
      a.nuanceExplanation?.toLowerCase().includes('oppose')
    );
    const contextNuanced = nuancedAlignments.filter(
      (a) =>
        a.nuanceExplanation &&
        !a.nuanceExplanation.toLowerCase().includes('support') &&
        !a.nuanceExplanation.toLowerCase().includes('oppose')
    );

    const interpretations: Misunderstanding['interpretations'] = [];

    if (supportNuanced.length > 0) {
      interpretations.push({
        interpretation: 'Support with conditions or caveats',
        participantCount: supportNuanced.length,
      });
    }

    if (opposeNuanced.length > 0) {
      interpretations.push({
        interpretation: 'Opposition with exceptions',
        participantCount: opposeNuanced.length,
      });
    }

    if (contextNuanced.length > 0) {
      interpretations.push({
        interpretation: 'Context-dependent position',
        participantCount: contextNuanced.length,
      });
    }

    return interpretations;
  }

  /**
   * Identify genuine disagreements (not based on misunderstanding)
   */
  private identifyGenuineDisagreements(
    propositions: PropositionWithAlignments[]
  ): GenuineDisagreement[] {
    const genuineDisagreements: GenuineDisagreement[] = [];

    for (const prop of propositions) {
      const totalAlignments =
        prop.supportCount + prop.opposeCount + prop.nuancedCount;

      // Skip propositions without sufficient participation
      if (totalAlignments < 3) {
        continue;
      }

      const supportPercentage = prop.supportCount / totalAlignments;
      const opposePercentage = prop.opposeCount / totalAlignments;
      const nuancedPercentage = prop.nuancedCount / totalAlignments;

      // Genuine disagreement: significant support AND opposition, low nuance
      const hasSignificantSupport = supportPercentage >= 0.25;
      const hasSignificantOpposition = opposePercentage >= 0.25;
      const lowNuance = nuancedPercentage < this.NUANCE_THRESHOLD;

      if (hasSignificantSupport && hasSignificantOpposition && lowNuance) {
        const viewpoints: GenuineDisagreement['viewpoints'] = [];

        // Support viewpoint
        const supportReasons = prop.alignments
          .filter((a) => a.stance === 'SUPPORT' && a.nuanceExplanation)
          .map((a) => a.nuanceExplanation!)
          .slice(0, 2);

        if (supportReasons.length > 0 || prop.supportCount > 0) {
          viewpoints.push({
            position: 'Support',
            participantCount: prop.supportCount,
            reasoning: supportReasons.length > 0 ? supportReasons : ['Supports this proposition'],
          });
        }

        // Opposition viewpoint
        const opposeReasons = prop.alignments
          .filter((a) => a.stance === 'OPPOSE' && a.nuanceExplanation)
          .map((a) => a.nuanceExplanation!)
          .slice(0, 2);

        if (opposeReasons.length > 0 || prop.opposeCount > 0) {
          viewpoints.push({
            position: 'Oppose',
            participantCount: prop.opposeCount,
            reasoning: opposeReasons.length > 0 ? opposeReasons : ['Opposes this proposition'],
          });
        }

        genuineDisagreements.push({
          proposition: prop.statement,
          viewpoints,
          underlyingValues: [
            'Underlying values will be identified through AI-powered moral foundations analysis',
          ],
        });
      }
    }

    return genuineDisagreements;
  }

  /**
   * Calculate overall consensus score across all propositions
   *
   * @returns Consensus score (0.00-1.00) or null if insufficient data
   */
  private calculateOverallConsensus(
    propositions: PropositionWithAlignments[]
  ): number | null {
    // Filter propositions with alignment data
    const propositionsWithData = propositions.filter(
      (p) => p.supportCount + p.opposeCount + p.nuancedCount >= 3
    );

    if (propositionsWithData.length === 0) {
      return null;
    }

    // Calculate average consensus score
    // Use existing consensus scores if available, otherwise calculate
    let totalScore = 0;
    let countedPropositions = 0;

    for (const prop of propositionsWithData) {
      let score: number;

      if (prop.consensusScore !== null) {
        score = Number(prop.consensusScore);
      } else {
        // Calculate consensus score: normalized agreement
        const totalAlignments =
          prop.supportCount + prop.opposeCount + prop.nuancedCount;
        const agreementRatio =
          (prop.supportCount - prop.opposeCount) / totalAlignments;
        // Normalize to 0.00-1.00 range
        score = (agreementRatio + 1) / 2;
      }

      totalScore += score;
      countedPropositions += 1;
    }

    const averageScore = totalScore / countedPropositions;

    // Round to 2 decimal places
    return Math.round(averageScore * 100) / 100;
  }
}
