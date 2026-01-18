import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@unite-discord/db-models';
import type { AnalysisResult } from './response-analyzer.service.js';

/**
 * Service for detecting logical fallacies in arguments
 * Identifies common fallacies like ad hominem, strawman, false dichotomy, etc.
 */
@Injectable()
export class FallacyDetectorService {
  /**
   * Fallacy detection patterns with their identifiers
   */
  private readonly fallacyPatterns = {
    ad_hominem: [
      /you('re| are)\s+(just|only)\s+(a|an)\s+\w+/gi,
      /coming\s+from\s+(someone|you)/gi,
      /(you|your)\s+(lack|don't\s+have)\s+(credentials|experience|expertise)/gi,
      /what\s+would\s+you\s+know/gi,
    ],
    strawman: [
      /so\s+you('re| are)\s+saying\s+(that\s+)?we\s+should/gi,
      /by\s+that\s+logic/gi,
      /if\s+we\s+follow\s+your\s+reasoning/gi,
      /you\s+think\s+that\s+all\s+\w+\s+are/gi,
    ],
    false_dichotomy: [
      /either\s+\w+\s+or\s+\w+/gi,
      /you('re| are)\s+(either|with\s+us\s+or\s+against\s+us)/gi,
      /only\s+two\s+(options|choices)/gi,
      /if\s+you\s+don't\s+\w+,?\s+then\s+you\s+must/gi,
    ],
    slippery_slope: [
      /if\s+we\s+allow\s+\w+,?\s+(then\s+)?next\s+thing/gi,
      /this\s+will\s+lead\s+to/gi,
      /where\s+does\s+it\s+(end|stop)/gi,
      /it's\s+a\s+slippery\s+slope/gi,
    ],
    appeal_to_emotion: [
      /think\s+of\s+the\s+children/gi,
      /how\s+would\s+you\s+feel\s+if/gi,
      /imagine\s+if\s+it\s+was\s+your/gi,
      /this\s+makes\s+me\s+(so\s+)?(angry|sad|upset)/gi,
    ],
    hasty_generalization: [
      /all\s+\w+\s+are\s+(always|never)/gi,
      /every(one)?\s+knows\s+that/gi,
      /(no\s+one|nobody)\s+thinks\s+that/gi,
      /\w+\s+always\s+(does|says|thinks)/gi,
    ],
    appeal_to_authority: [
      /experts\s+agree/gi,
      /studies\s+show/gi,
      /science\s+says/gi,
      /\w+\s+said\s+(so|it)/gi,
    ],
  };

  /**
   * Analyze content for logical fallacies
   * @param content The text to analyze
   * @returns Analysis result if fallacies detected, null otherwise
   */
  async analyze(content: string): Promise<AnalysisResult | null> {
    const detectedFallacies: { type: string; match: string }[] = [];

    // Check each fallacy type
    for (const [fallacyType, patterns] of Object.entries(this.fallacyPatterns)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          detectedFallacies.push({
            type: fallacyType,
            match: matches[0],
          });
        }
      }
    }

    // If no fallacies found, return null
    if (detectedFallacies.length === 0) {
      return null;
    }

    // Get the most prevalent fallacy type
    const primaryFallacy = this.getMostCommonFallacy(detectedFallacies);

    // Calculate confidence (higher for multiple instances)
    const confidenceScore = Math.min(0.92, 0.7 + detectedFallacies.length * 0.08);

    return {
      type: FeedbackType.FALLACY,
      subtype: primaryFallacy,
      suggestionText: this.createSuggestion(primaryFallacy),
      reasoning: this.createReasoning(primaryFallacy, detectedFallacies),
      confidenceScore,
      educationalResources: this.getEducationalResources(primaryFallacy),
    };
  }

  /**
   * Determine the most common fallacy type
   */
  private getMostCommonFallacy(fallacies: { type: string; match: string }[]): string {
    const counts = fallacies.reduce(
      (acc, f) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] ?? 'unknown';
  }

  /**
   * Create a suggestion based on the fallacy type
   */
  private createSuggestion(fallacyType: string): string {
    const suggestions: Record<string, string> = {
      ad_hominem:
        'Focus on addressing the argument itself rather than attacking the person making it. What specific claims can you refute?',
      strawman:
        'Ensure you\'re responding to the actual argument being made, not a misrepresented version. Can you quote their exact position?',
      false_dichotomy:
        'Consider whether there are more than two options available. Are there middle-ground positions or alternative approaches?',
      slippery_slope:
        'Provide evidence for each step in the causal chain. What specific mechanisms would lead to the predicted outcome?',
      appeal_to_emotion:
        'While emotions are valid, consider supporting your point with factual reasoning. What objective evidence supports this position?',
      hasty_generalization:
        'Avoid sweeping generalizations. Can you provide specific examples or acknowledge exceptions?',
      appeal_to_authority:
        'When citing authorities, provide specific sources and be open to counter-evidence. Which studies or experts specifically?',
    };

    return suggestions[fallacyType] || 'Consider strengthening your logical reasoning.';
  }

  /**
   * Create reasoning explanation
   */
  private createReasoning(
    fallacyType: string,
    detectedFallacies: { type: string; match: string }[],
  ): string {
    const fallacyNames: Record<string, string> = {
      ad_hominem: 'Ad Hominem (attacking the person)',
      strawman: 'Strawman (misrepresenting the argument)',
      false_dichotomy: 'False Dichotomy (presenting only two options)',
      slippery_slope: 'Slippery Slope (claiming cascading consequences without evidence)',
      appeal_to_emotion: 'Appeal to Emotion (using feelings instead of logic)',
      hasty_generalization: 'Hasty Generalization (overgeneralizing from limited examples)',
      appeal_to_authority: 'Appeal to Authority (citing sources without specifics)',
    };

    const fallacyName = fallacyNames[fallacyType] || fallacyType;
    const count = detectedFallacies.filter((f) => f.type === fallacyType).length;

    return `Detected ${count} instance(s) of ${fallacyName}. Logical fallacies can weaken your argument even when your underlying point may be valid. Consider restructuring your reasoning to strengthen your position.`;
  }

  /**
   * Get educational resources for a specific fallacy
   */
  private getEducationalResources(fallacyType: string): any {
    const resources: Record<string, any> = {
      ad_hominem: {
        links: [
          {
            title: 'Ad Hominem Fallacy',
            url: 'https://en.wikipedia.org/wiki/Ad_hominem',
          },
          {
            title: 'Arguing Against the Person',
            url: 'https://yourlogicalfallacyis.com/ad-hominem',
          },
        ],
      },
      strawman: {
        links: [
          {
            title: 'Straw Man Fallacy',
            url: 'https://en.wikipedia.org/wiki/Straw_man',
          },
          {
            title: 'Misrepresenting Arguments',
            url: 'https://yourlogicalfallacyis.com/strawman',
          },
        ],
      },
      false_dichotomy: {
        links: [
          {
            title: 'False Dilemma',
            url: 'https://en.wikipedia.org/wiki/False_dilemma',
          },
          {
            title: 'Black or White Thinking',
            url: 'https://yourlogicalfallacyis.com/black-or-white',
          },
        ],
      },
      slippery_slope: {
        links: [
          {
            title: 'Slippery Slope Fallacy',
            url: 'https://en.wikipedia.org/wiki/Slippery_slope',
          },
          {
            title: 'Understanding Slippery Slopes',
            url: 'https://yourlogicalfallacyis.com/slippery-slope',
          },
        ],
      },
      appeal_to_emotion: {
        links: [
          {
            title: 'Appeal to Emotion',
            url: 'https://en.wikipedia.org/wiki/Appeal_to_emotion',
          },
          {
            title: 'Emotional Reasoning',
            url: 'https://yourlogicalfallacyis.com/appeal-to-emotion',
          },
        ],
      },
      hasty_generalization: {
        links: [
          {
            title: 'Hasty Generalization',
            url: 'https://en.wikipedia.org/wiki/Hasty_generalization',
          },
          {
            title: 'Overgeneralization',
            url: 'https://yourlogicalfallacyis.com/composition-division',
          },
        ],
      },
      appeal_to_authority: {
        links: [
          {
            title: 'Appeal to Authority',
            url: 'https://en.wikipedia.org/wiki/Argument_from_authority',
          },
          {
            title: 'When Authorities Aren\'t Enough',
            url: 'https://yourlogicalfallacyis.com/appeal-to-authority',
          },
        ],
      },
    };

    return (
      resources[fallacyType] || {
        links: [
          {
            title: 'Logical Fallacies',
            url: 'https://en.wikipedia.org/wiki/List_of_fallacies',
          },
        ],
      }
    );
  }
}
