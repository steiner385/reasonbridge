/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';
import type { AnalysisResult } from './response-analyzer.service.js';

/**
 * Service for analyzing emotional tone and detecting inflammatory language
 * Detects personal attacks, hostile tone, and aggressive language
 */
@Injectable()
export class ToneAnalyzerService {
  // Patterns that indicate inflammatory language
  private readonly inflammatoryPatterns = [
    // Personal attacks - direct (you)
    /you('re| are)\s+(stupid|dumb|idiot|moron|fool|ignorant|ridiculous)/gi,
    /shut\s+up/gi,
    /get\s+lost/gi,

    // Personal attacks - third person (they/people/others)
    // Allow optional adverbs (really, very, so, etc.) between "are" and insult
    /\b(they|these\s+people|those\s+people|those\s+folks|people\s+like\s+(you|this|that))\s+(are|'re)\s+(really|very|so|completely|totally|absolutely)?\s*(stupid|dumb|idiots?|morons?|fools?|ignorant|ridiculous)/gi,
    /\b(this|that|these|those)\s+(is|are)\s+(really|very|so|completely|totally|absolutely)?\s*(stupid|dumb|idiotic|moronic|foolish|ignorant|ridiculous)/gi,

    // Aggressive language
    /\b(hate|despise)\s+(you|your|them|this|these)/gi,
    /you\s+make\s+me\s+(sick|angry)/gi,
    /\b(makes?|making)\s+me\s+(sick|angry)/gi,

    // Dismissive attacks
    /\b(typical|classic)\s+(liberal|conservative|leftist|right-wing)/gi,
    /wake\s+up\s+sheeple/gi,
    /\b(everyone|anyone)\s+who\s+(thinks?|believes?|says?)\s+(this|that)\s+is\s+(stupid|dumb|an?\s+idiot)/gi,

    // Excessive profanity in aggressive context
    /f\*+ck\s+(you|off|this|that|them)/gi,
    /\bb[s$]+t\b/gi,

    // All caps with aggressive intent (3+ words)
    /\b[A-Z]{4,}\s+[A-Z]{4,}\s+[A-Z]{4,}/g,
  ];

  // Hostile tone indicators
  private readonly hostileToneIndicators = [
    /obviously\s+(you|they)\s+(don't|can't|won't)/gi,
    /clearly\s+you\s+(don't|can't|haven't)/gi,
    /anyone\s+with\s+half\s+a\s+brain/gi,
    /it's\s+obvious\s+that\s+you/gi,
  ];

  /**
   * Analyze content for emotional tone and inflammatory language
   * @param content The text to analyze
   * @returns Analysis result if inflammatory language detected, null otherwise
   */
  async analyze(content: string): Promise<AnalysisResult | null> {
    const issues: { pattern: string; match: string }[] = [];

    // Check for inflammatory patterns
    for (const pattern of this.inflammatoryPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          pattern: 'inflammatory',
          match: matches[0],
        });
      }
    }

    // Check for hostile tone
    for (const pattern of this.hostileToneIndicators) {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          pattern: 'hostile_tone',
          match: matches[0],
        });
      }
    }

    // If no issues found, return null
    if (issues.length === 0) {
      return null;
    }

    // Calculate confidence based on number of matches
    const confidenceScore = Math.min(0.95, 0.65 + issues.length * 0.1);

    // Determine subtype based on most common pattern
    const subtype = this.determineSubtype(issues);

    return {
      type: FeedbackType.INFLAMMATORY,
      subtype,
      suggestionText: this.createSuggestion(subtype),
      reasoning: this.createReasoning(issues),
      confidenceScore,
      educationalResources: {
        links: [
          {
            title: 'Constructive Communication Guide',
            url: 'https://en.wikipedia.org/wiki/Nonviolent_Communication',
          },
          {
            title: 'Avoiding Personal Attacks in Discussions',
            url: 'https://en.wikipedia.org/wiki/Ad_hominem',
          },
        ],
      },
    };
  }

  /**
   * Determine the subtype based on detected issues
   */
  private determineSubtype(issues: { pattern: string; match: string }[]): string {
    const hasInflammatory = issues.some((i) => i.pattern === 'inflammatory');
    const hasHostileTone = issues.some((i) => i.pattern === 'hostile_tone');

    if (hasInflammatory && hasHostileTone) {
      return 'personal_attack_with_hostile_tone';
    } else if (hasInflammatory) {
      return 'personal_attack';
    } else {
      return 'hostile_tone';
    }
  }

  /**
   * Create a suggestion based on the subtype
   */
  private createSuggestion(subtype: string): string {
    switch (subtype) {
      case 'personal_attack':
        return 'Consider rephrasing to focus on ideas rather than personal characteristics. Attack the argument, not the person.';
      case 'hostile_tone':
        return 'Your message may come across as hostile. Consider using more neutral language to foster constructive dialogue.';
      case 'personal_attack_with_hostile_tone':
        return 'This response contains personal attacks and hostile language. Reframe your points to focus on the topic at hand with respectful language.';
      default:
        return 'Consider revising inflammatory language to maintain a constructive tone.';
    }
  }

  /**
   * Create reasoning explanation for the user
   */
  private createReasoning(issues: { pattern: string; match: string }[]): string {
    const uniqueMatches = [...new Set(issues.map((i) => i.match))];
    const examples = uniqueMatches
      .slice(0, 2)
      .map((m) => `"${m}"`)
      .join(', ');

    return `Detected ${issues.length} instance(s) of potentially inflammatory language (e.g., ${examples}). While passion is valuable, personal attacks or hostile tone can shut down productive dialogue and violate community standards.`;
  }
}
