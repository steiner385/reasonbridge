/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import type { FramingSuggestionDto } from '../suggestions/dto/framing-suggestions.dto.js';

/**
 * Result from framing suggestions analysis
 */
export interface FramingSuggestionResult {
  originalTitle: string;
  suggestedTitle: string | null;
  suggestions: FramingSuggestionDto[];
  neutralityScore: number;
  clarityScore: number;
  inclusivityScore: number;
  confidenceScore: number;
  reasoning: string;
}

/**
 * Patterns for detecting loaded/biased language
 */
const LOADED_LANGUAGE_PATTERNS: Array<{
  pattern: RegExp;
  replacement: string;
  explanation: string;
}> = [
  {
    pattern: /\b(obviously|clearly|undeniably|unquestionably)\b/gi,
    replacement: '',
    explanation: 'Presupposes agreement where there may be debate',
  },
  {
    pattern: /\b(ridiculous|absurd|insane|crazy)\b/gi,
    replacement: 'controversial',
    explanation: 'Uses dismissive language that may alienate those with different views',
  },
  {
    pattern: /\b(must|should always|never should)\b/gi,
    replacement: 'could',
    explanation: 'Imposes moral judgment that may not be universally shared',
  },
  {
    pattern: /\b(everyone knows|nobody thinks|all agree)\b/gi,
    replacement: 'some argue',
    explanation: 'Makes unsupported universal claims',
  },
  {
    pattern: /\b(the real|the actual|the true)\b/gi,
    replacement: 'one perspective on',
    explanation: 'Implies other perspectives are false or illegitimate',
  },
  {
    pattern: /\b(radical|extreme|dangerous)\b/gi,
    replacement: 'significant',
    explanation: 'Uses emotionally charged language that may polarize discussion',
  },
];

/**
 * Patterns for detecting one-sided framing
 */
const ONE_SIDED_PATTERNS: Array<{
  pattern: RegExp;
  suggestion: string;
  explanation: string;
}> = [
  {
    pattern: /^(why|how) (we should|we must|we need to)/i,
    suggestion: 'Consider: "What are the arguments for and against..."',
    explanation: 'Question presupposes a particular conclusion',
  },
  {
    pattern: /^(the problem with|the issue with|what\'s wrong with)/i,
    suggestion: 'Consider: "Perspectives on..."',
    explanation: 'Frames the topic negatively from the start',
  },
  {
    pattern: /^(the benefits of|the advantages of|why .* is good)/i,
    suggestion: 'Consider: "Examining... — benefits and drawbacks"',
    explanation: 'Frames the topic positively without acknowledging counterarguments',
  },
];

/**
 * Framing suggestion synthesizer
 * Analyzes topic titles and descriptions to suggest more neutral, clear, and inclusive framings
 *
 * Feature 016: Topic Management - AI Framing Suggestions (T215)
 */
@Injectable()
export class FramingSuggester {
  /**
   * Generate framing suggestions for a topic
   * @param title The topic title to analyze
   * @param description The topic description to analyze
   * @param context Optional context about the topic
   * @returns Framing suggestions with scores
   */
  async suggest(
    title: string,
    description: string,
    context?: string,
  ): Promise<FramingSuggestionResult> {
    const suggestions: FramingSuggestionDto[] = [];

    // Analyze title for loaded language
    const titleSuggestions = this.analyzeLoadedLanguage(title, 'title');
    suggestions.push(...titleSuggestions);

    // Analyze title for one-sided framing
    const oneSidedSuggestions = this.analyzeOneSidedFraming(title);
    suggestions.push(...oneSidedSuggestions);

    // Analyze description for loaded language
    const descriptionSuggestions = this.analyzeLoadedLanguage(description, 'description');
    suggestions.push(...descriptionSuggestions);

    // Check for clarity issues
    const claritySuggestions = this.analyzeClarityIssues(title, description);
    suggestions.push(...claritySuggestions);

    // Generate suggested title if needed
    const suggestedTitle = this.generateSuggestedTitle(title, titleSuggestions);

    // Calculate scores
    const neutralityScore = this.calculateNeutralityScore(suggestions);
    const clarityScore = this.calculateClarityScore(title, description);
    const inclusivityScore = this.calculateInclusivityScore(title, description);
    const confidenceScore = this.calculateConfidence(title, description, suggestions);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      suggestions,
      neutralityScore,
      clarityScore,
      inclusivityScore,
    );

    return {
      originalTitle: title,
      suggestedTitle,
      suggestions,
      neutralityScore,
      clarityScore,
      inclusivityScore,
      confidenceScore,
      reasoning,
    };
  }

  /**
   * Analyze text for loaded/biased language
   */
  private analyzeLoadedLanguage(
    text: string,
    source: 'title' | 'description',
  ): FramingSuggestionDto[] {
    const suggestions: FramingSuggestionDto[] = [];

    for (const { pattern, replacement, explanation } of LOADED_LANGUAGE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const suggestedText = replacement
            ? text.replace(match, replacement).replace(/\s+/g, ' ').trim()
            : text.replace(match, '').replace(/\s+/g, ' ').trim();

          suggestions.push({
            issueType: 'LOADED_LANGUAGE',
            originalText: `${source === 'title' ? 'Title' : 'Description'}: "${match}"`,
            suggestedText: suggestedText !== text ? `Remove or replace "${match}"` : '',
            explanation,
            confidenceScore: 0.7,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Analyze title for one-sided framing
   */
  private analyzeOneSidedFraming(title: string): FramingSuggestionDto[] {
    const suggestions: FramingSuggestionDto[] = [];

    for (const { pattern, suggestion, explanation } of ONE_SIDED_PATTERNS) {
      if (pattern.test(title)) {
        suggestions.push({
          issueType: 'ONE_SIDED',
          originalText: title,
          suggestedText: suggestion,
          explanation,
          confidenceScore: 0.75,
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze for clarity issues
   */
  private analyzeClarityIssues(title: string, description: string): FramingSuggestionDto[] {
    const suggestions: FramingSuggestionDto[] = [];

    // Check for overly long title
    if (title.length > 100) {
      suggestions.push({
        issueType: 'UNCLEAR',
        originalText: title,
        suggestedText: 'Consider shortening the title to under 100 characters',
        explanation: 'Long titles can be harder to scan and understand quickly',
        confidenceScore: 0.6,
      });
    }

    // Check for vague title
    const vaguePatterns = /^(thoughts on|discussion about|question about|topic:)/i;
    if (vaguePatterns.test(title)) {
      suggestions.push({
        issueType: 'UNCLEAR',
        originalText: title,
        suggestedText: 'Start with the specific subject matter',
        explanation: 'Generic prefixes add no information and delay the main topic',
        confidenceScore: 0.65,
      });
    }

    // Check for missing question mark on questions
    const seemsLikeQuestion =
      /^(what|why|how|when|where|who|which|should|could|would|is|are|do|does)/i;
    if (seemsLikeQuestion.test(title) && !title.endsWith('?')) {
      suggestions.push({
        issueType: 'IMPROVEMENT',
        originalText: title,
        suggestedText: `${title}?`,
        explanation: 'Questions should end with a question mark for clarity',
        confidenceScore: 0.8,
      });
    }

    // Check description length
    if (description.length < 100) {
      suggestions.push({
        issueType: 'UNCLEAR',
        originalText: 'Description is brief',
        suggestedText: 'Consider expanding the description to provide more context',
        explanation:
          'A fuller description helps participants understand the scope and intent of the discussion',
        confidenceScore: 0.5,
      });
    }

    return suggestions;
  }

  /**
   * Generate a suggested title based on identified issues
   */
  private generateSuggestedTitle(
    originalTitle: string,
    suggestions: FramingSuggestionDto[],
  ): string | null {
    // If no significant issues, return null
    const significantIssues = suggestions.filter(
      (s) =>
        s.confidenceScore >= 0.7 &&
        (s.issueType === 'LOADED_LANGUAGE' || s.issueType === 'ONE_SIDED'),
    );

    if (significantIssues.length === 0) {
      return null;
    }

    // Apply loaded language fixes
    let improvedTitle = originalTitle;
    for (const { pattern, replacement } of LOADED_LANGUAGE_PATTERNS) {
      improvedTitle = improvedTitle.replace(pattern, replacement).replace(/\s+/g, ' ').trim();
    }

    // If title changed, return it
    if (improvedTitle !== originalTitle && improvedTitle.length > 0) {
      return improvedTitle;
    }

    return null;
  }

  /**
   * Calculate neutrality score (0-1, higher is more neutral)
   */
  private calculateNeutralityScore(suggestions: FramingSuggestionDto[]): number {
    const loadedLanguageCount = suggestions.filter((s) => s.issueType === 'LOADED_LANGUAGE').length;
    const oneSidedCount = suggestions.filter((s) => s.issueType === 'ONE_SIDED').length;
    const polarizingCount = suggestions.filter((s) => s.issueType === 'POLARIZING').length;

    const totalIssues = loadedLanguageCount + oneSidedCount + polarizingCount;

    // Start at 1.0 and subtract for each issue
    const score = Math.max(0, 1.0 - totalIssues * 0.15);
    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate clarity score based on title and description quality
   */
  private calculateClarityScore(title: string, description: string): number {
    let score = 1.0;

    // Penalize very long or very short titles
    if (title.length > 100) score -= 0.15;
    if (title.length < 20) score -= 0.1;

    // Penalize short descriptions
    if (description.length < 100) score -= 0.2;
    if (description.length < 50) score -= 0.15;

    // Penalize vague prefixes
    if (/^(thoughts on|discussion about|question about|topic:)/i.test(title)) {
      score -= 0.1;
    }

    return Math.max(0, Math.round(score * 100) / 100);
  }

  /**
   * Calculate inclusivity score based on language patterns
   */
  private calculateInclusivityScore(title: string, description: string): number {
    let score = 1.0;
    const combinedText = `${title} ${description}`.toLowerCase();

    // Check for exclusive language
    const exclusivePatterns = [
      /\b(we all know|everyone agrees|nobody thinks)\b/i,
      /\b(real .* believe|true .* think)\b/i,
      /\b(smart people|intelligent people|rational people)\b/i,
    ];

    for (const pattern of exclusivePatterns) {
      if (pattern.test(combinedText)) {
        score -= 0.15;
      }
    }

    // Bonus for inclusive language
    const inclusivePatterns = [
      /\b(different perspectives|various viewpoints|multiple views)\b/i,
      /\b(open to|welcoming|seeking input)\b/i,
      /\b(exploring|examining|considering)\b/i,
    ];

    for (const pattern of inclusivePatterns) {
      if (pattern.test(combinedText)) {
        score += 0.05;
      }
    }

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  /**
   * Calculate overall confidence in the analysis
   */
  private calculateConfidence(
    title: string,
    description: string,
    suggestions: FramingSuggestionDto[],
  ): number {
    let confidence = 0.7; // Base confidence

    // More text provides better analysis
    if (description.length > 200) confidence += 0.1;
    if (description.length > 500) confidence += 0.05;

    // Having suggestions increases confidence (we found patterns)
    if (suggestions.length > 0) confidence += 0.1;

    // Many suggestions might indicate the patterns are too aggressive
    if (suggestions.length > 5) confidence -= 0.1;

    return Math.min(1, Math.round(confidence * 100) / 100);
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    suggestions: FramingSuggestionDto[],
    neutralityScore: number,
    clarityScore: number,
    inclusivityScore: number,
  ): string {
    const parts: string[] = [];

    const issueCount = suggestions.length;
    if (issueCount === 0) {
      parts.push('The topic framing appears well-balanced with no significant issues detected.');
    } else {
      parts.push(
        `Found ${issueCount} potential framing improvement${issueCount === 1 ? '' : 's'}.`,
      );
    }

    // Comment on scores
    if (neutralityScore < 0.7) {
      parts.push(
        `Neutrality could be improved (${(neutralityScore * 100).toFixed(0)}%) - consider removing loaded language.`,
      );
    }

    if (clarityScore < 0.7) {
      parts.push(
        `Clarity could be improved (${(clarityScore * 100).toFixed(0)}%) - consider refining the title and expanding the description.`,
      );
    }

    if (inclusivityScore < 0.7) {
      parts.push(
        `Inclusivity could be improved (${(inclusivityScore * 100).toFixed(0)}%) - avoid language that presupposes agreement.`,
      );
    }

    if (neutralityScore >= 0.8 && clarityScore >= 0.8 && inclusivityScore >= 0.8) {
      parts.push('Overall, this topic is well-framed for constructive discussion.');
    }

    parts.push(
      'Note: This is a rule-based analysis. AI-powered semantic understanding will provide more nuanced suggestions in future iterations.',
    );

    return parts.join(' ');
  }
}
