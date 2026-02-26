/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

/**
 * Types of grooming patterns that can be detected
 */
export type GroomingPatternType =
  | 'isolation_attempt' // Trying to isolate child from support
  | 'secrecy_request' // Asking to keep things secret
  | 'inappropriate_contact' // Suggesting private communication
  | 'age_probing' // Asking about age repeatedly
  | 'gift_offering' // Unsolicited gift offers
  | 'excessive_flattery' // Over-the-top compliments
  | 'boundary_testing'; // Testing child's comfort limits

/**
 * Result of grooming pattern analysis
 */
export interface GroomingDetectionResult {
  detected: boolean;
  confidence: number; // 0.0 to 1.0
  patternType: GroomingPatternType | null;
  flaggedPhrases: string[];
  recommendedAction: 'BLOCK' | 'REVIEW' | 'FLAG' | 'ALLOW';
  explanation: string;
}

/**
 * Pattern match details for detailed analysis
 */
export interface PatternMatch {
  type: GroomingPatternType;
  match: string;
  severity: number; // 1-3 where 3 is most severe
}

/**
 * Detailed analysis result for moderator review
 */
export interface DetailedGroomingAnalysis {
  allPatternsFound: PatternMatch[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  moderatorNotes: string;
  originalContent: string;
  timestamp: Date;
}

/**
 * Pattern configuration with severity weighting
 */
interface PatternConfig {
  patterns: RegExp[];
  severity: number; // 1-3 where 3 is most severe
  baseConfidence: number;
}

/**
 * Service for detecting potential grooming patterns in content
 * Used to protect minors in child-friendly discussion topics
 *
 * @remarks
 * This service uses regex-based pattern matching to identify concerning
 * language patterns commonly associated with grooming behavior.
 * Patterns are categorized by type and severity, with confidence
 * scores used to determine recommended actions.
 *
 * @example
 * ```typescript
 * const detector = new GroomingDetectorService();
 * const result = await detector.analyze("Don't tell your parents");
 * if (result.recommendedAction === 'BLOCK') {
 *   // Block content from child-accessible topic
 * }
 * ```
 */
@Injectable()
export class GroomingDetectorService {
  /**
   * Pattern severity order for determining primary pattern type
   * Higher index = more severe
   */
  private readonly patternSeverityOrder: GroomingPatternType[] = [
    'age_probing',
    'excessive_flattery',
    'gift_offering',
    'secrecy_request',
    'isolation_attempt',
    'inappropriate_contact',
    'boundary_testing',
  ];

  /**
   * Grooming detection patterns organized by type
   */
  private readonly groomingPatterns: Record<GroomingPatternType, PatternConfig> = {
    isolation_attempt: {
      patterns: [
        /don['']?t\s+tell\s+(your\s+)?parents/gi,
        /our\s+little\s+secret/gi,
        /just\s+between\s+us/gi,
        /don['']?t\s+tell\s+anyone/gi,
        /keep\s+this\s+from\s+(your\s+)?(parents|mom|dad|family)/gi,
        /no\s+one\s+needs\s+to\s+know/gi,
      ],
      severity: 3,
      baseConfidence: 0.45,
    },
    secrecy_request: {
      patterns: [
        /keep\s+this\s+between\s+us/gi,
        /don['']?t\s+show\s+anyone/gi,
        /delete\s+this\s+(message|chat|conversation)/gi,
        /erase\s+(our|the|this)\s+(messages|chat|conversation)/gi,
        /clear\s+(the|your)\s+(history|chat)/gi,
      ],
      severity: 2,
      baseConfidence: 0.4,
    },
    inappropriate_contact: {
      patterns: [
        /\bDM\s+me\b/gi,
        /text\s+me\s+privately/gi,
        /give\s+me\s+your\s+(number|phone|email|address)/gi,
        /add\s+me\s+on\s+(snapchat|instagram|discord|whatsapp|tiktok)/gi,
        /message\s+me\s+on\s+\w+/gi,
        /call\s+me\s+(privately|directly)/gi,
        /let['']?s\s+talk\s+(somewhere\s+else|privately|alone)/gi,
        /contact\s+me\s+(directly|privately)/gi,
      ],
      severity: 3,
      baseConfidence: 0.45,
    },
    age_probing: {
      patterns: [
        /how\s+old\s+are\s+you/gi,
        /are\s+you\s+alone/gi,
        /when\s+are\s+your\s+parents\s+home/gi,
        /where\s+do\s+you\s+live/gi,
        /what\s+school\s+do\s+you\s+(go\s+to|attend)/gi,
        /are\s+your\s+parents\s+(home|there|around)/gi,
        /who['']?s\s+home\s+with\s+you/gi,
        /are\s+you\s+home\s+alone/gi,
      ],
      severity: 2,
      baseConfidence: 0.35,
    },
    gift_offering: {
      patterns: [
        /i['']?ll\s+buy\s+you/gi,
        /send\s+you\s+gifts/gi,
        /i\s+have\s+something\s+(special\s+)?for\s+you/gi,
        /send\s+you\s+money/gi,
        /get\s+you\s+anything\s+you\s+want/gi,
        /buy\s+you\s+anything/gi,
        /give\s+you\s+presents/gi,
        /i['']?ll\s+give\s+you\s+\$?\d+/gi,
      ],
      severity: 2,
      baseConfidence: 0.4,
    },
    excessive_flattery: {
      patterns: [
        /you['']?re\s+so\s+mature\s+for\s+your\s+age/gi,
        /not\s+like\s+other\s+kids/gi,
        /you\s+understand\s+me\s+(better\s+than|like\s+no\s+one)/gi,
        /(special|unique)\s+connection/gi,
        /you['']?re\s+(different|special)\s+from\s+others/gi,
        /only\s+you\s+understand\s+me/gi,
        /i['']?ve\s+never\s+met\s+anyone\s+like\s+you/gi,
        /we\s+have\s+a\s+special\s+(bond|relationship)/gi,
      ],
      severity: 2,
      baseConfidence: 0.4,
    },
    boundary_testing: {
      patterns: [
        /have\s+you\s+ever\s+(kissed|dated|been\s+with)/gi,
        /do\s+you\s+have\s+a\s+(boyfriend|girlfriend)/gi,
        /send\s+me\s+a\s+(pic|photo|picture)/gi,
        /what\s+are\s+you\s+wearing/gi,
        /show\s+me\s+(yourself|your)/gi,
        /are\s+you\s+a\s+virgin/gi,
        /have\s+you\s+(had|done)\s+(sex|it)/gi,
        /what\s+do\s+you\s+look\s+like/gi,
        /describe\s+yourself\s+to\s+me/gi,
      ],
      severity: 3,
      baseConfidence: 0.5,
    },
  };

  /**
   * Analyze content for grooming patterns
   *
   * @param content - The text content to analyze
   * @returns GroomingDetectionResult with detection status, confidence, and recommendations
   */
  async analyze(content: string): Promise<GroomingDetectionResult> {
    const matches = this.detectPatterns(content);

    if (matches.length === 0) {
      return {
        detected: false,
        confidence: 0,
        patternType: null,
        flaggedPhrases: [],
        recommendedAction: 'ALLOW',
        explanation: 'No grooming patterns detected in the content.',
      };
    }

    // Calculate confidence based on matches
    const confidence = this.calculateConfidence(matches);

    // Get the most severe pattern type
    const primaryPatternType = this.getMostSeverePattern(matches);

    // Get all flagged phrases
    const flaggedPhrases = matches.map((m) => m.match);

    // Determine recommended action
    const recommendedAction = this.getRecommendedAction(confidence);

    // Generate explanation
    const explanation = this.generateExplanation(primaryPatternType, matches.length, confidence);

    return {
      detected: true,
      confidence,
      patternType: primaryPatternType,
      flaggedPhrases,
      recommendedAction,
      explanation,
    };
  }

  /**
   * Check if content should be blocked for child-accessible topics
   * Returns true if content requires BLOCK or REVIEW action
   *
   * @param content - The text content to check
   * @returns true if content should be blocked from children
   */
  async shouldBlockForChildren(content: string): Promise<boolean> {
    const result = await this.analyze(content);
    return result.recommendedAction === 'BLOCK' || result.recommendedAction === 'REVIEW';
  }

  /**
   * Get detailed analysis for moderator review
   *
   * @param content - The text content to analyze
   * @returns DetailedGroomingAnalysis with full pattern breakdown
   */
  async getDetailedAnalysis(content: string): Promise<DetailedGroomingAnalysis> {
    const matches = this.detectPatterns(content);
    const confidence = this.calculateConfidence(matches);

    const riskLevel = this.getRiskLevel(confidence, matches.length);
    const moderatorNotes = this.generateModeratorNotes(matches, confidence);

    return {
      allPatternsFound: matches,
      riskLevel,
      moderatorNotes,
      originalContent: content,
      timestamp: new Date(),
    };
  }

  /**
   * Detect all pattern matches in content
   *
   * @param content - The text to analyze
   * @returns Array of pattern matches
   */
  private detectPatterns(content: string): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const [patternType, config] of Object.entries(this.groomingPatterns)) {
      for (const pattern of config.patterns) {
        const foundMatches = content.match(pattern);
        if (foundMatches) {
          for (const match of foundMatches) {
            matches.push({
              type: patternType as GroomingPatternType,
              match,
              severity: config.severity,
            });
          }
        }
      }
    }

    return matches;
  }

  /**
   * Calculate confidence score based on matches
   *
   * @param matches - Array of detected pattern matches
   * @returns Confidence score between 0.0 and 1.0
   */
  private calculateConfidence(matches: PatternMatch[]): number {
    if (matches.length === 0) {
      return 0;
    }

    // Start with base confidence from the most severe match
    const maxSeverity = Math.max(...matches.map((m) => m.severity));
    let confidence = 0.3 + maxSeverity * 0.1;

    // Add confidence for each additional match (diminishing returns)
    for (let i = 1; i < matches.length; i++) {
      confidence += 0.1 / Math.sqrt(i);
    }

    // Bonus for multiple pattern types (more concerning)
    const uniqueTypes = new Set(matches.map((m) => m.type)).size;
    if (uniqueTypes > 1) {
      confidence += 0.1 * (uniqueTypes - 1);
    }

    // Cap at 1.0
    return Math.min(1.0, confidence);
  }

  /**
   * Get the most severe pattern type from matches
   *
   * @param matches - Array of detected pattern matches
   * @returns The most severe pattern type
   */
  private getMostSeverePattern(matches: PatternMatch[]): GroomingPatternType {
    // Sort matches by severity order (index in patternSeverityOrder)
    const sorted = [...matches].sort((a, b) => {
      const aIndex = this.patternSeverityOrder.indexOf(a.type);
      const bIndex = this.patternSeverityOrder.indexOf(b.type);
      // Higher index = more severe
      return bIndex - aIndex;
    });

    return sorted[0]?.type ?? 'age_probing';
  }

  /**
   * Determine recommended action based on confidence
   *
   * @param confidence - Confidence score (0.0-1.0)
   * @returns Recommended action
   */
  private getRecommendedAction(confidence: number): 'BLOCK' | 'REVIEW' | 'FLAG' | 'ALLOW' {
    if (confidence >= 0.8) {
      return 'BLOCK';
    }
    if (confidence >= 0.6) {
      return 'REVIEW';
    }
    if (confidence >= 0.4) {
      return 'FLAG';
    }
    return 'ALLOW';
  }

  /**
   * Generate human-readable explanation
   *
   * @param patternType - Primary pattern type detected
   * @param matchCount - Number of patterns matched
   * @param confidence - Confidence score
   * @returns Explanation string
   */
  private generateExplanation(
    patternType: GroomingPatternType,
    matchCount: number,
    confidence: number,
  ): string {
    const patternDescriptions: Record<GroomingPatternType, string> = {
      isolation_attempt: 'attempts to isolate the reader from support systems',
      secrecy_request: 'requests to keep communications secret',
      inappropriate_contact: 'suggestions for private or off-platform communication',
      age_probing: 'questions probing for age or personal details',
      gift_offering: 'unsolicited offers of gifts or money',
      excessive_flattery: 'excessive flattery or special relationship claims',
      boundary_testing: 'boundary-testing or inappropriate personal questions',
    };

    const description = patternDescriptions[patternType];
    const severity = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium-high' : 'moderate';

    return `Detected ${matchCount} concerning pattern(s) with ${severity} confidence. Primary concern: ${description}. This content may not be appropriate for child-accessible discussions.`;
  }

  /**
   * Determine risk level for detailed analysis
   *
   * @param confidence - Confidence score
   * @param matchCount - Number of patterns matched
   * @returns Risk level
   */
  private getRiskLevel(
    confidence: number,
    matchCount: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (matchCount === 0) {
      return 'low';
    }
    if (confidence >= 0.8) {
      return 'critical';
    }
    if (confidence >= 0.6) {
      return 'high';
    }
    if (confidence >= 0.4) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate moderator notes for detailed analysis
   *
   * @param matches - Array of pattern matches
   * @param confidence - Overall confidence score
   * @returns Notes for moderators
   */
  private generateModeratorNotes(matches: PatternMatch[], confidence: number): string {
    if (matches.length === 0) {
      return 'No concerning patterns detected. Content appears safe.';
    }

    const typeBreakdown = matches.reduce(
      (acc, match) => {
        acc[match.type] = (acc[match.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const breakdownStr = Object.entries(typeBreakdown)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    const action = this.getRecommendedAction(confidence);

    return (
      `Detected ${matches.length} grooming indicator(s). ` +
      `Pattern breakdown: ${breakdownStr}. ` +
      `Confidence: ${(confidence * 100).toFixed(1)}%. ` +
      `Recommended action: ${action}. ` +
      `Review flagged phrases and context before making final decision.`
    );
  }
}
