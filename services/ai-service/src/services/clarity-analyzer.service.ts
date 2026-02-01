import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';
import type { AnalysisResult } from './response-analyzer.service.js';

/**
 * Service for analyzing clarity and detecting unsourced claims
 * Identifies vague language, unsupported factual claims, and bias indicators
 */
@Injectable()
export class ClarityAnalyzerService {
  /**
   * Patterns for unsourced factual claims
   */
  private readonly unsourcedClaimPatterns = [
    /studies\s+show\s+that/gi,
    /research\s+(shows|proves|demonstrates)/gi,
    /scientists\s+(say|believe|found)/gi,
    /it('s| is)\s+(proven|a\s+fact)\s+that/gi,
    /\d+%\s+of\s+(people|users|respondents)/gi,
    /according\s+to\s+(experts|studies|research)/gi,
    /the\s+data\s+shows/gi,
  ];

  /**
   * Patterns for bias indicators (loaded language, one-sided framing)
   */
  private readonly biasPatterns = [
    // Loaded language
    /(obviously|clearly|undeniably)\s+\w+\s+(is|are)/gi,
    /any\s+reasonable\s+person\s+(would|knows)/gi,
    /it's\s+common\s+sense\s+that/gi,

    // One-sided framing
    /only\s+\w+\s+would\s+(think|believe|say)/gi,
    /of\s+course\s+\w+\s+(is|are|would)/gi,

    // Emotionally charged descriptors
    /\b(radical|extremist|fanatic)\s+\w+/gi,
    /\b(crazy|insane|lunatic)\s+\w+/gi,
  ];

  /**
   * Patterns for vague hedging language (may indicate lack of clarity)
   */
  private readonly vagueLanguagePatterns = [
    /some\s+people\s+say/gi,
    /I\s+heard\s+that/gi,
    /they\s+say\s+that/gi,
    /word\s+on\s+the\s+street/gi,
    /rumor\s+has\s+it/gi,
  ];

  /**
   * Analyze content for clarity issues, unsourced claims, and bias
   * @param content The text to analyze
   * @returns Analysis result if issues detected, null otherwise
   */
  async analyze(content: string): Promise<AnalysisResult | null> {
    const unsourcedClaims = this.detectUnsourcedClaims(content);
    const biasIndicators = this.detectBiasIndicators(content);

    // Prioritize unsourced claims over bias
    if (unsourcedClaims.length > 0) {
      return this.createUnsourcedFeedback(unsourcedClaims);
    }

    if (biasIndicators.length > 0) {
      return this.createBiasFeedback(biasIndicators);
    }

    return null;
  }

  /**
   * Detect unsourced factual claims
   */
  private detectUnsourcedClaims(content: string): string[] {
    const matches: string[] = [];

    for (const pattern of this.unsourcedClaimPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    // Also check for vague language that might indicate unsourced claims
    for (const pattern of this.vagueLanguagePatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    return matches;
  }

  /**
   * Detect bias indicators
   */
  private detectBiasIndicators(content: string): string[] {
    const matches: string[] = [];

    for (const pattern of this.biasPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    return matches;
  }

  /**
   * Create feedback for unsourced claims
   */
  private createUnsourcedFeedback(matches: string[]): AnalysisResult {
    const confidenceScore = Math.min(0.88, 0.65 + matches.length * 0.08);
    const examples = [...new Set(matches)]
      .slice(0, 2)
      .map((m) => `"${m}"`)
      .join(', ');

    return {
      type: FeedbackType.UNSOURCED,
      suggestionText:
        'Consider providing specific sources for factual claims. Include links, citations, or specific study names to strengthen your argument.',
      reasoning: `Detected ${matches.length} instance(s) of potentially unsourced claims (e.g., ${examples}). While these may be based on real research, providing specific sources helps others verify and engage with your evidence more effectively.`,
      confidenceScore,
      educationalResources: {
        links: [
          {
            title: 'How to Cite Sources',
            url: 'https://en.wikipedia.org/wiki/Citation',
          },
          {
            title: 'Evaluating Information Sources',
            url: 'https://en.wikipedia.org/wiki/Source_criticism',
          },
        ],
      },
    };
  }

  /**
   * Create feedback for bias indicators
   */
  private createBiasFeedback(matches: string[]): AnalysisResult {
    const confidenceScore = Math.min(0.85, 0.6 + matches.length * 0.08);
    const examples = [...new Set(matches)]
      .slice(0, 2)
      .map((m) => `"${m}"`)
      .join(', ');

    return {
      type: FeedbackType.BIAS,
      subtype: 'loaded_language',
      suggestionText:
        'Consider using more neutral language to present your argument. Avoid loaded terms and acknowledge alternative perspectives where relevant.',
      reasoning: `Detected ${matches.length} instance(s) of potentially biased framing (e.g., ${examples}). Using loaded language or one-sided framing may make your argument less persuasive to those who don't already agree with you.`,
      confidenceScore,
      educationalResources: {
        links: [
          {
            title: 'Neutral Point of View',
            url: 'https://en.wikipedia.org/wiki/Wikipedia:Neutral_point_of_view',
          },
          {
            title: 'Loaded Language',
            url: 'https://en.wikipedia.org/wiki/Loaded_language',
          },
        ],
      },
    };
  }
}
