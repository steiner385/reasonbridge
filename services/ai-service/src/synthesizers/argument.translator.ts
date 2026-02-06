/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

/**
 * Moral foundation based on Haidt's Moral Foundations Theory
 */
export type MoralFoundation =
  | 'care'
  | 'fairness'
  | 'loyalty'
  | 'authority'
  | 'sanctity'
  | 'liberty';

/**
 * Profile indicating which moral foundations a person/group prioritizes
 */
export interface MoralFoundationProfile {
  /** Care/harm - compassion for those who are suffering */
  care: number; // 0.00-1.00
  /** Fairness/cheating - proportionality and justice */
  fairness: number; // 0.00-1.00
  /** Loyalty/betrayal - commitment to group */
  loyalty: number; // 0.00-1.00
  /** Authority/subversion - respect for tradition and authority */
  authority: number; // 0.00-1.00
  /** Sanctity/degradation - purity and sacredness */
  sanctity: number; // 0.00-1.00
  /** Liberty/oppression - freedom from coercion */
  liberty: number; // 0.00-1.00
}

/**
 * Input for argument translation
 */
export interface TranslationInput {
  /** The original argument/response text */
  originalArgument: string;
  /** Moral foundation profile of the source */
  sourceProfile: MoralFoundationProfile;
  /** Moral foundation profile of the target audience */
  targetProfile: MoralFoundationProfile;
  /** Optional context about the discussion topic */
  context?: {
    topicId: string;
    propositionStatement?: string;
  };
}

/**
 * Result of argument translation
 */
export interface TranslationResult {
  /** The reframed argument */
  reframedArgument: string;
  /** Confidence score (0.00-1.00) */
  confidenceScore: number;
  /** Explanation of why this reframing is relevant */
  reasoning: string;
  /** Which foundations were bridged */
  bridgedFoundations: {
    source: MoralFoundation[];
    target: MoralFoundation[];
  };
  /** Educational resources about the moral foundations used */
  educationalResources?: Array<{
    title: string;
    url: string;
  }>;
}

/**
 * Argument Translator (Cross-Foundation Bridge Suggester)
 *
 * Implements the bridging suggestion algorithm that helps participants
 * reframe arguments across different moral worldviews. Uses Moral
 * Foundations Theory to translate arguments from one value system to
 * another, facilitating cross-ideological communication.
 *
 * This is a pattern-based implementation that provides reasonable
 * translations based on moral foundation profiles. It will be enhanced
 * with AI-powered analysis using AWS Bedrock in future iterations.
 *
 * Related to FR-017a: Offer "translation" suggestions that reframe
 * arguments in terms of moral foundations the other side prioritizes.
 */
@Injectable()
export class ArgumentTranslator {
  /**
   * Minimum confidence threshold for displaying suggestions (per FR-014c)
   */
  private readonly CONFIDENCE_THRESHOLD = 0.8; // 80%

  /**
   * Foundation-specific keywords and framing patterns
   */
  private readonly foundationKeywords: Record<MoralFoundation, string[]> = {
    care: [
      'suffering',
      'harm',
      'compassion',
      'empathy',
      'protection',
      'vulnerable',
      'well-being',
      'support',
      'help',
      'care',
    ],
    fairness: [
      'fair',
      'justice',
      'equal',
      'rights',
      'deserve',
      'proportional',
      'equitable',
      'balance',
      'impartial',
      'merit',
    ],
    loyalty: [
      'community',
      'group',
      'team',
      'together',
      'unity',
      'solidarity',
      'collective',
      'tradition',
      'heritage',
      'belonging',
    ],
    authority: [
      'order',
      'structure',
      'tradition',
      'respect',
      'hierarchy',
      'institution',
      'established',
      'authority',
      'leadership',
      'stability',
    ],
    sanctity: [
      'sacred',
      'pure',
      'dignity',
      'integrity',
      'virtue',
      'moral',
      'principle',
      'values',
      'consecrated',
      'wholesome',
    ],
    liberty: [
      'freedom',
      'choice',
      'autonomy',
      'rights',
      'liberty',
      'independent',
      'self-determination',
      'individual',
      'voluntary',
      'unconstrained',
    ],
  };

  /**
   * Translation templates for each moral foundation
   */
  private readonly translationTemplates: Record<
    MoralFoundation,
    {
      prefix: string;
      connector: string;
      examples: string[];
    }
  > = {
    care: {
      prefix: 'When we consider the impact on people who might be harmed,',
      connector: 'which helps protect those who are vulnerable',
      examples: [
        'This approach supports the well-being of everyone involved',
        'When people feel safe and supported, the entire community benefits',
        'Protecting those who are vulnerable should be our first priority',
      ],
    },
    fairness: {
      prefix: 'From a fairness perspective,',
      connector: 'which ensures equal treatment for all',
      examples: [
        'Everyone deserves an equal opportunity to participate',
        'A just system treats all participants proportionally to their contributions',
        'Fairness requires that we give each person what they deserve',
      ],
    },
    loyalty: {
      prefix: 'Considering our shared community values,',
      connector: 'which strengthens our collective bonds',
      examples: [
        'When we stand together as a community, we all benefit',
        'Our shared heritage and values unite us',
        'Building solidarity helps us achieve common goals',
      ],
    },
    authority: {
      prefix: 'Looking at established practices and institutions,',
      connector: 'which maintains stability and order',
      examples: [
        'Respecting established structures provides predictability',
        'Traditional institutions offer time-tested solutions',
        'Maintaining order helps everyone understand expectations',
      ],
    },
    sanctity: {
      prefix: 'From the perspective of our core values and principles,',
      connector: 'which upholds human dignity and integrity',
      examples: [
        'Preserving the integrity of our principles matters',
        'This honors the dignity of every individual involved',
        'Maintaining moral consistency strengthens our values',
      ],
    },
    liberty: {
      prefix: 'Considering individual freedom and autonomy,',
      connector: 'which respects personal choice',
      examples: [
        'People should have the freedom to make their own decisions',
        'Voluntary participation leads to better outcomes than coercion',
        'Respecting individual autonomy is essential',
      ],
    },
  };

  /**
   * Translate an argument from one moral foundation profile to another
   *
   * @param input - Translation input with source/target profiles
   * @returns Translation result with reframed argument and metadata
   */
  async translate(input: TranslationInput): Promise<TranslationResult> {
    // Identify dominant foundations in source and target
    const sourceFoundations = this.identifyDominantFoundations(input.sourceProfile);
    const targetFoundations = this.identifyDominantFoundations(input.targetProfile);

    // Detect which foundations are already present in the argument
    const presentFoundations = this.detectFoundationsInText(input.originalArgument);

    // Select target foundation for reframing (prioritize missing foundations)
    const targetFoundation = this.selectTargetFoundation(
      targetFoundations,
      presentFoundations,
      sourceFoundations,
    );

    // Generate reframed argument
    const reframedArgument = this.generateReframing(
      input.originalArgument,
      targetFoundation,
      sourceFoundations,
    );

    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(
      input.originalArgument,
      sourceFoundations,
      targetFoundations,
      presentFoundations,
    );

    // Generate reasoning explanation
    const reasoning = this.generateReasoning(sourceFoundations, targetFoundation, confidenceScore);

    // Add educational resources
    const educationalResources = this.getEducationalResources(targetFoundation);

    return {
      reframedArgument,
      confidenceScore,
      reasoning,
      bridgedFoundations: {
        source: sourceFoundations,
        target: [targetFoundation],
      },
      educationalResources,
    };
  }

  /**
   * Identify the dominant moral foundations in a profile
   * Returns foundations sorted by strength (highest first)
   */
  private identifyDominantFoundations(profile: MoralFoundationProfile): MoralFoundation[] {
    const foundations = Object.entries(profile) as [MoralFoundation, number][];

    return foundations
      .filter(([_, score]) => score >= 0.5) // Only consider significant foundations
      .sort(([_, scoreA], [__, scoreB]) => scoreB - scoreA)
      .map(([foundation]) => foundation);
  }

  /**
   * Detect which moral foundations are present in the argument text
   */
  private detectFoundationsInText(text: string): MoralFoundation[] {
    const lowerText = text.toLowerCase();
    const detected: MoralFoundation[] = [];

    for (const [foundation, keywords] of Object.entries(this.foundationKeywords)) {
      const matchCount = keywords.filter((keyword) => lowerText.includes(keyword)).length;
      if (matchCount >= 1) {
        detected.push(foundation as MoralFoundation);
      }
    }

    return detected;
  }

  /**
   * Select the best target foundation for reframing
   * Prioritizes: 1) Target's top foundation not in argument, 2) Target's top foundation overall
   */
  private selectTargetFoundation(
    targetFoundations: MoralFoundation[],
    presentFoundations: MoralFoundation[],
    sourceFoundations: MoralFoundation[],
  ): MoralFoundation {
    // Try to find a target foundation that's not already present
    const missingTargetFoundations = targetFoundations.filter(
      (f) => !presentFoundations.includes(f),
    );

    if (missingTargetFoundations.length > 0) {
      return missingTargetFoundations[0]!;
    }

    // Fallback: use the target's top foundation
    if (targetFoundations.length > 0) {
      return targetFoundations[0]!;
    }

    // Last resort: use 'fairness' as a universal bridge
    return 'fairness';
  }

  /**
   * Generate the reframed argument using the target foundation
   */
  private generateReframing(
    originalArgument: string,
    targetFoundation: MoralFoundation,
    sourceFoundations: MoralFoundation[],
  ): string {
    const template = this.translationTemplates[targetFoundation];

    // Extract the core claim from the original argument (simplified pattern matching)
    const coreClaim = this.extractCoreClaim(originalArgument);

    // Build reframed argument using template
    const reframed = `${template.prefix} ${coreClaim.toLowerCase()}, ${template.connector}.`;

    return reframed;
  }

  /**
   * Extract the core claim from an argument
   * This is a simplified implementation; AI enhancement will provide semantic extraction
   */
  private extractCoreClaim(argument: string): string {
    // Remove common filler words and phrases
    let claim = argument
      .replace(/^(I think|In my opinion|I believe|It seems to me that|Clearly)/i, '')
      .trim();

    // If it's a long argument, take the first sentence
    const sentences = claim.split(/[.!?]+/);
    if (sentences.length > 0 && sentences[0]!.length > 0) {
      claim = sentences[0]!.trim();
    }

    // Ensure it starts with lowercase (will be preceded by template prefix)
    return claim.charAt(0).toLowerCase() + claim.slice(1);
  }

  /**
   * Calculate confidence score for the translation
   */
  private calculateConfidence(
    originalArgument: string,
    sourceFoundations: MoralFoundation[],
    targetFoundations: MoralFoundation[],
    presentFoundations: MoralFoundation[],
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost if we have clear source and target profiles
    if (sourceFoundations.length >= 2 && targetFoundations.length >= 2) {
      confidence += 0.1;
    }

    // Boost if argument has sufficient length for meaningful translation
    if (originalArgument.length > 50) {
      confidence += 0.05;
    }

    // Boost if target foundation is clearly different from present foundations
    if (
      presentFoundations.length > 0 &&
      targetFoundations.length > 0 &&
      !presentFoundations.includes(targetFoundations[0]!)
    ) {
      confidence += 0.1;
    }

    // Reduce if profiles are very similar (less need for translation)
    const overlap = sourceFoundations.filter((f) => targetFoundations.includes(f)).length;
    if (overlap >= 3) {
      confidence -= 0.15;
    }

    return Math.min(0.95, Math.max(0.5, confidence));
  }

  /**
   * Generate reasoning explanation for the translation
   */
  private generateReasoning(
    sourceFoundations: MoralFoundation[],
    targetFoundation: MoralFoundation,
    confidenceScore: number,
  ): string {
    const sourceList = sourceFoundations.join(', ') || 'general values';
    const reason = `This reframing translates the argument from ${sourceList} to emphasize ${targetFoundation}, which may resonate more with the other perspective. `;

    if (confidenceScore >= this.CONFIDENCE_THRESHOLD) {
      return (
        reason +
        'This bridging suggestion is based on moral foundations theory and may help facilitate cross-ideological understanding.'
      );
    } else {
      return (
        reason +
        'Note: This is a pattern-based suggestion. AI-powered semantic analysis will provide more precise translations in future updates.'
      );
    }
  }

  /**
   * Get educational resources for a moral foundation
   */
  private getEducationalResources(
    foundation: MoralFoundation,
  ): Array<{ title: string; url: string }> {
    const baseUrl = 'https://moralfoundations.org';

    return [
      {
        title: `Understanding ${foundation.charAt(0).toUpperCase() + foundation.slice(1)} Foundation`,
        url: `${baseUrl}/${foundation}`,
      },
      {
        title: 'Moral Foundations Theory Overview',
        url: `${baseUrl}/overview`,
      },
    ];
  }
}
