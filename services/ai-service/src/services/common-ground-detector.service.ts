import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../ai/bedrock.service.js';
import {
  CommonGroundSynthesizer,
  type TopicData,
  type SynthesisResult,
  type PropositionWithAlignments,
} from '../common-ground/common-ground.synthesizer.js';
import type {
  Misunderstanding,
  GenuineDisagreement,
} from '../common-ground/dto/common-ground-analysis.dto.js';

/**
 * AI-Assisted Common Ground Detector
 *
 * Enhances pattern-based common ground detection with AI-powered semantic analysis.
 * Uses AWS Bedrock to:
 * - Cluster nuanced responses semantically (not just keyword matching)
 * - Identify underlying moral values in disagreements
 * - Generate clarifying explanations for misunderstandings
 *
 * Falls back to pattern-based detection when AI is unavailable.
 */
@Injectable()
export class CommonGroundDetectorService {
  private readonly logger = new Logger(CommonGroundDetectorService.name);

  constructor(
    private readonly synthesizer: CommonGroundSynthesizer,
    private readonly bedrock: BedrockService,
  ) {}

  /**
   * Detect common ground with AI-assisted enhancement
   *
   * @param topicData - Discussion topic data
   * @returns Enhanced synthesis result with AI-powered insights
   */
  async detectCommonGround(topicData: TopicData): Promise<SynthesisResult> {
    // Start with pattern-based synthesis
    const baseResult = await this.synthesizer.synthesize(topicData);

    // Check if AI is available
    const aiReady = await this.bedrock.isReady();

    if (!aiReady) {
      this.logger.debug(
        'AI not available, returning pattern-based analysis',
      );
      return baseResult;
    }

    // Enhance with AI-powered analysis
    const enhancedMisunderstandings = await this.enhanceMisunderstandings(
      baseResult.misunderstandings,
      topicData.propositions,
    );

    const enhancedDisagreements = await this.enhanceDisagreements(
      baseResult.genuineDisagreements,
    );

    return {
      ...baseResult,
      misunderstandings: enhancedMisunderstandings,
      genuineDisagreements: enhancedDisagreements,
    };
  }

  /**
   * Enhance misunderstanding detection with semantic clustering
   */
  private async enhanceMisunderstandings(
    misunderstandings: Misunderstanding[],
    propositions: PropositionWithAlignments[],
  ): Promise<Misunderstanding[]> {
    const enhanced: Misunderstanding[] = [];

    for (const misunderstanding of misunderstandings) {
      // Find the proposition for this misunderstanding
      const proposition = propositions.find(
        (p) => p.statement === misunderstanding.topic,
      );

      if (!proposition) {
        enhanced.push(misunderstanding);
        continue;
      }

      // Extract nuanced explanations
      const nuancedTexts = proposition.alignments
        .filter((a) => a.stance === 'NUANCED' && a.nuanceExplanation)
        .map((a) => a.nuanceExplanation!);

      if (nuancedTexts.length === 0) {
        enhanced.push(misunderstanding);
        continue;
      }

      try {
        // Use AI to cluster semantically similar interpretations
        const clusters = await this.bedrock.clusterTexts(nuancedTexts, 3);

        if (clusters.length === 0) {
          // AI clustering failed, use pattern-based result
          enhanced.push(misunderstanding);
          continue;
        }

        // Generate AI-powered clarification
        const interpretations = clusters.map((c) => ({
          interpretation: c.theme,
          participantCount: c.members.length,
        }));

        const clarification = await this.bedrock.generateClarification(
          misunderstanding.topic,
          interpretations,
        );

        enhanced.push({
          topic: misunderstanding.topic,
          interpretations,
          clarification,
        });
      } catch (error) {
        this.logger.error(
          'Failed to enhance misunderstanding with AI',
          error,
        );
        enhanced.push(misunderstanding);
      }
    }

    return enhanced;
  }

  /**
   * Enhance disagreement analysis with value identification
   */
  private async enhanceDisagreements(
    disagreements: GenuineDisagreement[],
  ): Promise<GenuineDisagreement[]> {
    const enhanced: GenuineDisagreement[] = [];

    for (const disagreement of disagreements) {
      try {
        // Extract all reasoning from viewpoints
        const allReasoning = disagreement.viewpoints.flatMap(
          (v) => v.reasoning,
        );

        if (allReasoning.length === 0) {
          enhanced.push(disagreement);
          continue;
        }

        // Use AI to identify underlying values
        const values = await this.bedrock.identifyValues(allReasoning);

        if (
          values.length === 0 ||
          (values[0] && values[0].includes('AI-powered moral foundations analysis'))
        ) {
          // AI value detection failed, use pattern-based result
          enhanced.push(disagreement);
          continue;
        }

        enhanced.push({
          ...disagreement,
          underlyingValues: values,
        });
      } catch (error) {
        this.logger.error('Failed to enhance disagreement with AI', error);
        enhanced.push(disagreement);
      }
    }

    return enhanced;
  }
}
