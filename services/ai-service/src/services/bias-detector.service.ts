/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';
import type { AnalysisResult } from './response-analyzer.service.js';

/**
 * Service for detecting cognitive biases in arguments
 * Identifies confirmation bias patterns and System 1/System 2 thinking indicators
 */
@Injectable()
export class BiasDetectorService {
  /**
   * Confirmation bias patterns - selective attention to confirming information
   */
  private readonly confirmationBiasPatterns = [
    // Cherry-picking evidence
    /this\s+(proves|confirms|shows)\s+(exactly\s+)?what\s+I\s+(always\s+)?(said|thought|believed)/gi,
    /this\s+(proves|confirms|shows)\s+(exactly\s+)?what\s+I('ve| have)\s+(always\s+)?(said|thought|believed)/gi,
    /see,?\s+I\s+(knew|told\s+you)/gi,
    /just\s+as\s+I\s+(expected|predicted|thought)/gi,

    // Dismissing contrary evidence
    /that('s| is)\s+(just\s+)?(an?\s+)?exception/gi,
    /those\s+(studies|facts|data)\s+(are|don't)\s+(biased|count|matter)/gi,
    /ignore\s+(that|those|the)\s+(data|evidence|facts)/gi,

    // Selective source citation
    /my\s+(sources?|research)\s+(say|show|prove)/gi,
    /according\s+to\s+my\s+(sources?|research)/gi,

    // Confirmation language
    /this\s+(only\s+)?(confirms|validates|supports)\s+(my|what\s+I)/gi,
    /exactly\s+(what|as)\s+I\s+(thought|expected|said)/gi,
    /i('ve| have)\s+always\s+known\s+that/gi,
  ];

  /**
   * System 1 thinking patterns - fast, intuitive, emotional
   */
  private readonly system1Patterns = [
    // Gut feeling / intuition claims
    /I\s+(just\s+)?(know|feel|sense)\s+(that|it|this)/gi,
    /my\s+gut\s+(tells?|says?|feeling)/gi,
    /it('s| is)\s+just\s+obvious/gi,
    /common\s+sense\s+(tells?|says?|shows?)/gi,

    // Emotional certainty without evidence
    /I\s+(can('t|not)?|don't)\s+believe\s+(you|this|that)/gi,
    /how\s+can\s+(anyone|you)\s+(believe|think)/gi,
    /it('s| is)\s+(crazy|insane|unbelievable)\s+(to|that)/gi,

    // Quick dismissals
    /that('s| is)\s+(ridiculous|absurd|nonsense)/gi,
    /don't\s+be\s+(ridiculous|absurd|silly)/gi,
    /come\s+on,?\s+(seriously|really)/gi,
  ];

  /**
   * System 2 indicators - slow, deliberate, analytical (positive)
   * These are NOT biases but signs of good reasoning
   */
  private readonly system2Patterns = [
    /let\s+me\s+(think|consider|analyze)\s+(about|this)/gi,
    /on\s+(the\s+)?one\s+hand.*on\s+(the\s+)?other\s+hand/gi,
    /the\s+evidence\s+(suggests|indicates|shows)\s+that/gi,
    /there\s+are\s+(multiple|several|different)\s+(perspectives|views|sides)/gi,
    /i\s+could\s+be\s+wrong,?\s+but/gi,
    /while\s+I\s+(disagree|don't\s+agree),?\s+I\s+(understand|see)/gi,
  ];

  /**
   * Analyze content for cognitive biases
   * @param content The text to analyze
   * @returns Analysis result if biases detected, null otherwise
   */
  async analyze(content: string): Promise<AnalysisResult | null> {
    const detectedBiases: { type: string; match: string }[] = [];

    // Check for confirmation bias
    for (const pattern of this.confirmationBiasPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedBiases.push({
          type: 'confirmation_bias',
          match: matches[0],
        });
      }
    }

    // Check for System 1 thinking patterns
    for (const pattern of this.system1Patterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedBiases.push({
          type: 'system1_thinking',
          match: matches[0],
        });
      }
    }

    // Check for System 2 patterns (these are positive, reduce concern)
    let hasSystem2 = false;
    for (const pattern of this.system2Patterns) {
      if (pattern.test(content)) {
        hasSystem2 = true;
        break;
      }
    }

    // If no biases found or System 2 thinking present, return null
    if (detectedBiases.length === 0 || (hasSystem2 && detectedBiases.length === 1)) {
      return null;
    }

    // Get the most prevalent bias type
    const primaryBias = this.getMostCommonBias(detectedBiases);

    // Calculate confidence (higher for multiple instances)
    const confidenceScore = Math.min(0.9, 0.65 + detectedBiases.length * 0.08);

    return {
      type: FeedbackType.BIAS,
      subtype: primaryBias,
      suggestionText: this.createSuggestion(primaryBias),
      reasoning: this.createReasoning(primaryBias, detectedBiases),
      confidenceScore,
      educationalResources: this.getEducationalResources(primaryBias),
    };
  }

  /**
   * Determine the most common bias type
   */
  private getMostCommonBias(biases: { type: string; match: string }[]): string {
    const counts = biases.reduce(
      (acc, b) => {
        acc[b.type] = (acc[b.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] ?? 'unknown';
  }

  /**
   * Create a suggestion based on the bias type
   */
  private createSuggestion(biasType: string): string {
    const suggestions: Record<string, string> = {
      confirmation_bias:
        'Consider seeking out evidence that might challenge your view. What would change your mind on this topic?',
      system1_thinking:
        'Take a moment to reflect on the reasoning behind your position. What specific evidence supports this view?',
    };

    return suggestions[biasType] || 'Consider examining your reasoning for potential blind spots.';
  }

  /**
   * Create reasoning explanation
   */
  private createReasoning(
    biasType: string,
    detectedBiases: { type: string; match: string }[],
  ): string {
    const biasNames: Record<string, string> = {
      confirmation_bias: 'Confirmation Bias (selective attention to confirming evidence)',
      system1_thinking: 'System 1 Thinking (intuitive responses without deliberation)',
    };

    const biasName = biasNames[biasType] || biasType;
    const count = detectedBiases.filter((b) => b.type === biasType).length;

    return `Detected ${count} indicator(s) of ${biasName}. Being aware of cognitive biases can help strengthen your arguments by ensuring you've genuinely engaged with opposing viewpoints.`;
  }

  /**
   * Get educational resources for a specific bias
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic educational resources structure
  private getEducationalResources(biasType: string): any {
    const resources: Record<string, { links: Array<{ title: string; url: string }> }> = {
      confirmation_bias: {
        links: [
          {
            title: 'Confirmation Bias',
            url: 'https://en.wikipedia.org/wiki/Confirmation_bias',
          },
          {
            title: 'How to Overcome Confirmation Bias',
            url: 'https://www.verywellmind.com/what-is-a-confirmation-bias-2795024',
          },
        ],
      },
      system1_thinking: {
        links: [
          {
            title: 'Thinking, Fast and Slow',
            url: 'https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow',
          },
          {
            title: 'Dual Process Theory',
            url: 'https://en.wikipedia.org/wiki/Dual_process_theory',
          },
        ],
      },
    };

    return (
      resources[biasType] || {
        links: [
          {
            title: 'List of Cognitive Biases',
            url: 'https://en.wikipedia.org/wiki/List_of_cognitive_biases',
          },
        ],
      }
    );
  }
}
