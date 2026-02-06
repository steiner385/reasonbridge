/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

export interface ScreeningResult {
  id: string;
  contentId: string;
  toneAnalysis: ToneAnalysis;
  fallacyDetection: FallacyDetection;
  claimExtraction: ClaimExtraction;
  responsePattern: ResponsePatternAnalysis;
  overallRiskScore: number;
  screened_at: Date;
}

export interface ToneAnalysis {
  isInflammatory: boolean;
  confidence: number;
  indicators: string[];
  intensity: 'low' | 'medium' | 'high';
}

export interface FallacyDetection {
  fallacies_found: Fallacy[];
  total_fallacies: number;
}

export interface Fallacy {
  type: string;
  description: string;
  confidence: number;
  text_span: string;
}

export interface ClaimExtraction {
  claims: Claim[];
  needs_fact_check: boolean;
}

export interface Claim {
  text: string;
  factual_nature: boolean;
  confidence: number;
}

export interface ResponsePatternAnalysis {
  system1_indicators: string[];
  system2_indicators: string[];
  predominant_system: 'system1' | 'system2' | 'mixed';
  emotional_charge: number;
}

// Inflammatory language patterns (System 1 response indicators)
const INFLAMMATORY_PATTERNS = [
  /\b(you're\s+stupid|idiot|moron|ignorant|fool)\b/gi,
  /\b(never\s+listen|always\s+wrong|completely\s+blind)\b/gi,
  /\b(destroy|attack|crush|eliminate)(ing)?\s+(the|their)\b/gi,
  /(\!\!+|\?\?+){2,}/g,
  /\b(hate|despise|disgusting|repulsive)\b/gi,
];

// Ad hominem and attacking person instead of argument
const AD_HOMINEM_PATTERNS = [
  /\b(you\s+are|you're)\s+(just|only)\s+(a|an|the)\s+\w+/gi,
  /\b(of\s+course)\s+(you|they|he|she)\s+would\s+say\s+that/gi,
  /\b(clearly)\s+you\s+(don't|can't)\s+understand/gi,
];

// Common fallacy patterns
const FALLACY_PATTERNS = {
  ad_hominem: {
    pattern: /\b(you're|you\s+are)\s+(stupid|dumb|ignorant|blind)/gi,
    description: 'Ad hominem attack - attacking the person instead of the argument',
  },
  straw_man: {
    pattern: /\b(so\s+you're\s+saying|so\s+what\s+you\s+mean|in\s+other\s+words)\s+that\s+\w+/gi,
    description: "Straw man fallacy - misrepresenting opponent's argument",
  },
  appeal_to_authority: {
    pattern: /\b(experts\s+say|everyone\s+knows|it's\s+common\s+knowledge|obviously)\b/gi,
    description: 'Appeal to authority - relying on authority instead of evidence',
  },
  false_dilemma: {
    pattern: /\b(either\s+\w+\s+or\s+\w+|you\s+either|there's\s+no\s+middle\s+ground)\b/gi,
    description: 'False dilemma - presenting only two options when more exist',
  },
  emotional_appeal: {
    pattern: /\b(think\s+of\s+the\s+children|won't\s+somebody|oh\s+my|my\s+goodness)\b/gi,
    description: 'Emotional appeal - using emotion instead of logic',
  },
  generalization: {
    pattern: /\b(all\s+\w+|every\s+\w+|never\s+\w+|always\s+\w+)\s+(is|are|do|does)\b/gi,
    description: 'Hasty generalization - making broad claims without sufficient evidence',
  },
};

// System 2 indicators (logical, deliberative thinking)
const SYSTEM2_INDICATORS = [
  /\b(consider|analyze|examine|evaluate|assess)\b/gi,
  /\b(evidence|data|research|study|findings)\b/gi,
  /\b(therefore|thus|consequently|moreover|furthermore)\b/gi,
  /\b(however|although|despite|whereas)\b/gi,
  /\b(let's\s+think|consider\s+this|on\s+the\s+other\s+hand)\b/gi,
];

// System 1 indicators (emotional, reactive thinking)
const SYSTEM1_INDICATORS = [
  /\b(feel|feeling|felt|feels)\b/gi,
  /\b(believe|believe\s+me|I\s+know)\b/gi,
  /\b(just|obviously|clearly|definitely|absolutely)\b/gi,
  /\b(hate|love|disgusting|amazing|terrible)\b/gi,
  /\b(everyone\s+knows|common\s+sense|it's\s+obvious)\b/gi,
];

// Factual claim patterns
const FACTUAL_CLAIM_PATTERNS = [
  /\b(studies?\s+show|research\s+indicates?|data\s+shows?|evidence\s+suggests?)\b/gi,
  /\b(\d+%|\d+\s+out\s+of|\d+\s+percent)\b/gi,
  /\b(in\s+\d{4}|according\s+to|the\s+(?:CDC|WHO|UN|FBI|EPA))\b/gi,
  /\b(scientist|expert|researcher|study|experiment)\s+(found|showed|demonstrated)\b/gi,
];

@Injectable()
export class ContentScreeningService {
  async screenContent(contentId: string, content: string): Promise<ScreeningResult> {
    const toneAnalysis = this.analyzeTone(content);
    const fallacyDetection = this.detectFallacies(content);
    const claimExtraction = this.extractClaims(content);
    const responsePattern = this.analyzeResponsePattern(content);

    const overallRiskScore = this.calculateRiskScore(
      toneAnalysis,
      fallacyDetection,
      claimExtraction,
      responsePattern,
    );

    return {
      id: `screening_${contentId}_${Date.now()}`,
      contentId,
      toneAnalysis,
      fallacyDetection,
      claimExtraction,
      responsePattern,
      overallRiskScore,
      screened_at: new Date(),
    };
  }

  private analyzeTone(content: string): ToneAnalysis {
    const indicators: string[] = [];
    let inflammatoryCount = 0;
    let adHominemCount = 0;

    // Check for inflammatory language
    for (const pattern of INFLAMMATORY_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        inflammatoryCount += matches.length;
        indicators.push(...matches.map((m) => `Inflammatory language: "${m}"`));
      }
    }

    // Check for ad hominem attacks
    for (const pattern of AD_HOMINEM_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        adHominemCount += matches.length;
        indicators.push(...matches.map((m) => `Ad hominem: "${m}"`));
      }
    }

    const totalIndicators = inflammatoryCount + adHominemCount;
    const confidence = Math.min(totalIndicators * 0.2, 1.0);
    const contentLength = content.length;
    const indicatorDensity = totalIndicators / (contentLength / 100);

    let intensity: 'low' | 'medium' | 'high' = 'low';
    if (indicatorDensity > 0.5) {
      intensity = 'high';
    } else if (indicatorDensity > 0.2) {
      intensity = 'medium';
    }

    return {
      isInflammatory: confidence > 0.3,
      confidence: Math.min(confidence, 1.0),
      indicators: indicators.slice(0, 10),
      intensity,
    };
  }

  private detectFallacies(content: string): FallacyDetection {
    const fallacies: Fallacy[] = [];

    for (const [fallacyType, { pattern, description }] of Object.entries(FALLACY_PATTERNS)) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        fallacies.push({
          type: fallacyType,
          description,
          confidence: 0.7,
          text_span: match[0],
        });
      }
    }

    return {
      fallacies_found: fallacies.slice(0, 10),
      total_fallacies: fallacies.length,
    };
  }

  private extractClaims(content: string): ClaimExtraction {
    const claims: Claim[] = [];
    let needsFactCheck = false;

    // Look for factual claim patterns
    for (const pattern of FACTUAL_CLAIM_PATTERNS) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        // Extract surrounding context for the claim
        const startIdx = Math.max(0, match.index - 50);
        const endIdx = Math.min(content.length, match.index + match[0].length + 50);
        const textSpan = content.substring(startIdx, endIdx).trim();

        claims.push({
          text: textSpan,
          factual_nature: true,
          confidence: 0.75,
        });
        needsFactCheck = true;
      }
    }

    // Look for common claim indicators
    const claimIndicators = [
      /\b(according\s+to|research\s+shows?|studies?\s+indicate?)\s+([^.!?]+[.!?])/gi,
    ];

    for (const pattern of claimIndicators) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[2]) {
          claims.push({
            text: match[2],
            factual_nature: true,
            confidence: 0.65,
          });
        }
      }
    }

    return {
      claims: claims.slice(0, 10),
      needs_fact_check: needsFactCheck,
    };
  }

  private analyzeResponsePattern(content: string): ResponsePatternAnalysis {
    const system1Indicators: string[] = [];
    const system2Indicators: string[] = [];

    // Count System 1 indicators
    for (const pattern of SYSTEM1_INDICATORS) {
      const matches = content.match(pattern);
      if (matches) {
        system1Indicators.push(...matches.slice(0, 5));
      }
    }

    // Count System 2 indicators
    for (const pattern of SYSTEM2_INDICATORS) {
      const matches = content.match(pattern);
      if (matches) {
        system2Indicators.push(...matches.slice(0, 5));
      }
    }

    const system1Count = system1Indicators.length;
    const system2Count = system2Indicators.length;

    let predominant_system: 'system1' | 'system2' | 'mixed' = 'mixed';
    if (system1Count > system2Count * 1.5) {
      predominant_system = 'system1';
    } else if (system2Count > system1Count * 1.5) {
      predominant_system = 'system2';
    }

    // Calculate emotional charge (0-1)
    const emotionalCharge = Math.min(system1Count / (system1Count + system2Count + 1), 1.0);

    return {
      system1_indicators: system1Indicators.slice(0, 5),
      system2_indicators: system2Indicators.slice(0, 5),
      predominant_system,
      emotional_charge: emotionalCharge,
    };
  }

  private calculateRiskScore(
    toneAnalysis: ToneAnalysis,
    fallacyDetection: FallacyDetection,
    claimExtraction: ClaimExtraction,
    responsePattern: ResponsePatternAnalysis,
  ): number {
    let riskScore = 0;

    // Tone analysis contributes up to 0.3
    if (toneAnalysis.isInflammatory) {
      riskScore += toneAnalysis.confidence * 0.3;
    }

    // Fallacy detection contributes up to 0.2
    const fallacyPenalty = Math.min(fallacyDetection.total_fallacies * 0.05, 0.2);
    riskScore += fallacyPenalty;

    // Claims needing fact-check contribute up to 0.2
    if (claimExtraction.needs_fact_check && claimExtraction.claims.length > 0) {
      riskScore += Math.min(claimExtraction.claims.length * 0.05, 0.2);
    }

    // System 1 dominance contributes up to 0.3
    if (responsePattern.predominant_system === 'system1') {
      riskScore += responsePattern.emotional_charge * 0.3;
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Get screening recommendations based on risk score
   */
  getRecommendations(result: ScreeningResult): string[] {
    const recommendations: string[] = [];

    if (result.overallRiskScore > 0.5) {
      recommendations.push('Flag for human moderator review - high risk content detected');
    } else if (result.overallRiskScore > 0.3) {
      recommendations.push('Monitor content - moderate risk indicators present');
    }

    if (result.toneAnalysis.isInflammatory) {
      if (result.toneAnalysis.intensity === 'high') {
        recommendations.push('Consider showing cooling-off prompt to encourage reflection');
      }
      recommendations.push('Educational resources on constructive dialogue recommended');
    }

    if (result.fallacyDetection.total_fallacies > 2) {
      recommendations.push('Provide educational feedback on logical reasoning');
    }

    if (result.claimExtraction.needs_fact_check && result.claimExtraction.claims.length > 0) {
      recommendations.push(`Fact-check ${result.claimExtraction.claims.length} factual claim(s)`);
    }

    if (result.responsePattern.predominant_system === 'system1') {
      recommendations.push('Encourage System 2 thinking with prompts for evidence-based reasoning');
    }

    return recommendations;
  }
}
