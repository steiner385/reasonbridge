/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

/**
 * Extracted claim from response text
 */
export interface ExtractedClaim {
  /** The factual claim text */
  text: string;
  /** Start position in original response */
  startOffset: number;
  /** End position in original response */
  endOffset: number;
  /** Confidence score for this extraction (0-1) */
  confidence: number;
  /** Type of claim detected */
  claimType: ClaimType;
}

/**
 * Types of factual claims that can be extracted
 */
export type ClaimType =
  | 'statistic' // Contains numbers, percentages, data
  | 'historical' // References past events with dates
  | 'scientific' // Scientific or research-based claims
  | 'attribution' // Quotes or attributions to sources
  | 'causal' // Cause-and-effect claims
  | 'comparative' // Comparisons between entities
  | 'factual'; // General factual assertions

/**
 * Result from claim extraction
 */
export interface ClaimExtractionResult {
  /** All extracted claims */
  claims: ExtractedClaim[];
  /** Total number of claims found */
  totalClaims: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Service for extracting factual claims from response text
 *
 * T257: Implement claim extraction from responses
 *
 * Uses pattern-based extraction to identify verifiable factual claims
 * that can be sent to fact-checking services. Designed to complete
 * extraction in <200ms for typical responses.
 */
@Injectable()
export class ClaimExtractorService {
  // Patterns for detecting different types of claims

  // Statistics: numbers, percentages, quantities
  private readonly statisticPatterns = [
    // Percentages (% doesn't need word boundary after)
    /\b(\d+(?:\.\d+)?)\s*(?:percent|%)/gi,
    // Large numbers with context
    /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*(?:million|billion|trillion|thousand))\s+(?:people|users|dollars|euros|pounds|cases|deaths|incidents|reports|adults?|children|students?|workers?|employees?)/gi,
    // Ratios and fractions
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:in|out of)\s+(?:every\s+)?(?:\d+|ten|hundred|thousand)\b/gi,
  ];

  // Historical claims: dates, years, past events
  private readonly historicalPatterns = [
    // Specific years
    /\b(?:in|since|during|after|before|around)\s+(?:the\s+)?(?:year\s+)?(\d{4})\b/gi,
    // Date references
    /\b(?:on|in)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}\b/gi,
    // Historical events
    /\b(?:during|after|before|following)\s+(?:the\s+)?(?:World War|Civil War|Revolution|Great Depression|Cold War)/gi,
  ];

  // Scientific claims: studies, research, findings
  private readonly scientificPatterns = [
    /\b(?:studies?|research|scientists?|researchers?|experts?)\s+(?:show|shows|showed|found|finds|suggest|suggests|indicate|indicates|prove|proves|demonstrated?)\b/gi,
    /\b(?:according to|based on)\s+(?:a\s+)?(?:recent\s+)?(?:study|research|survey|report|analysis|data|evidence)\b/gi,
    /\b(?:peer[- ]reviewed|published in|journal|scientific consensus)\b/gi,
  ];

  // Attribution claims: quotes, sources
  private readonly attributionPatterns = [
    // "According to X" - handles multi-word names and organizations
    /\b(?:according to|as stated by|as reported by|per)\s+(?:the\s+)?(?:[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/gi,
    // Quoted text with attribution
    /"[^"]{10,}"\s*(?:,\s*)?(?:said|stated|claimed|argued|wrote|reported)\s+[A-Z][a-z]+/g,
    // Name said/stated that "quote"
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:said|stated|claimed|argued|wrote|reported)\s+(?:that\s+)?["'][^"']+["']/g,
  ];

  // Causal claims: cause and effect
  private readonly causalPatterns = [
    /\b(?:causes?|caused|causing|leads?\s+to|led\s+to|results?\s+in|resulted\s+in|due\s+to|because\s+of)\b/gi,
    /\b(?:as\s+a\s+result|consequently|therefore|thus|hence)\b/gi,
  ];

  // Comparative claims: comparisons
  private readonly comparativePatterns = [
    // X more/less/etc than Y (optional words in between)
    /\b(?:more|less|fewer|greater|higher|lower|better|worse)(?:\s+\w+){0,5}\s+than\b/gi,
    // Superlatives: the most/highest/etc in/of
    /\b(?:the\s+)?(?:most|least|best|worst|highest|lowest|largest|smallest)\s+\w+(?:\s+\w+){0,3}\s+(?:in|of|among)\b/gi,
    // Direct comparisons
    /\b(?:compared\s+to|in\s+comparison\s+with|relative\s+to)\b/gi,
  ];

  // General factual assertions
  private readonly factualPatterns = [
    /\b(?:it\s+is\s+(?:a\s+)?fact\s+that|the\s+fact\s+is|in\s+fact|actually|indeed)\b/gi,
    /\b(?:always|never|every|all|none|no\s+one)\s+(?:\w+\s+){1,3}(?:is|are|was|were|has|have|does|do)\b/gi,
  ];

  /**
   * Extract factual claims from response text
   *
   * @param content The response text to analyze
   * @returns Extraction result with all identified claims
   */
  async extract(content: string): Promise<ClaimExtractionResult> {
    const startTime = Date.now();
    const claims: ExtractedClaim[] = [];
    const seenRanges = new Set<string>();

    // Extract claims by type
    this.extractByPatterns(content, this.statisticPatterns, 'statistic', claims, seenRanges);
    this.extractByPatterns(content, this.historicalPatterns, 'historical', claims, seenRanges);
    this.extractByPatterns(content, this.scientificPatterns, 'scientific', claims, seenRanges);
    this.extractByPatterns(content, this.attributionPatterns, 'attribution', claims, seenRanges);
    this.extractByPatterns(content, this.causalPatterns, 'causal', claims, seenRanges);
    this.extractByPatterns(content, this.comparativePatterns, 'comparative', claims, seenRanges);
    this.extractByPatterns(content, this.factualPatterns, 'factual', claims, seenRanges);

    // Expand claims to sentence boundaries for context
    const expandedClaims = claims.map((claim) => this.expandToSentence(content, claim));

    // Deduplicate overlapping claims (keep higher confidence)
    const deduplicatedClaims = this.deduplicateClaims(expandedClaims);

    // Sort by position in text
    deduplicatedClaims.sort((a, b) => a.startOffset - b.startOffset);

    return {
      claims: deduplicatedClaims,
      totalClaims: deduplicatedClaims.length,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extract claims matching patterns of a specific type
   */
  private extractByPatterns(
    content: string,
    patterns: RegExp[],
    claimType: ClaimType,
    claims: ExtractedClaim[],
    seenRanges: Set<string>,
  ): void {
    for (const pattern of patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const startOffset = match.index;
        const endOffset = match.index + match[0].length;
        const rangeKey = `${startOffset}-${endOffset}`;

        // Skip if we've already captured this exact range
        if (seenRanges.has(rangeKey)) {
          continue;
        }
        seenRanges.add(rangeKey);

        // Calculate confidence based on pattern type
        const confidence = this.calculateConfidence(claimType, match[0]);

        claims.push({
          text: match[0],
          startOffset,
          endOffset,
          confidence,
          claimType,
        });
      }
    }
  }

  /**
   * Calculate confidence score based on claim type and matched text
   */
  private calculateConfidence(claimType: ClaimType, matchedText: string): number {
    // Base confidence by claim type
    const baseConfidence: Record<ClaimType, number> = {
      statistic: 0.85, // Numbers are highly verifiable
      historical: 0.8, // Dates/events are verifiable
      scientific: 0.75, // Research claims need source verification
      attribution: 0.8, // Quotes can be verified
      causal: 0.65, // Causal claims need careful evaluation
      comparative: 0.7, // Comparisons need data
      factual: 0.6, // General assertions need context
    };

    let confidence = baseConfidence[claimType];

    // Boost confidence for specific indicators
    if (/\d+/.test(matchedText)) {
      confidence += 0.05; // Contains numbers
    }
    if (/according to|study|research/i.test(matchedText)) {
      confidence += 0.05; // Has attribution
    }

    // Cap at 0.95
    return Math.min(0.95, confidence);
  }

  /**
   * Expand a claim match to include the full sentence for context
   */
  private expandToSentence(content: string, claim: ExtractedClaim): ExtractedClaim {
    // Find sentence start (look back for sentence boundary)
    let sentenceStart = claim.startOffset;
    while (sentenceStart > 0) {
      const char = content[sentenceStart - 1];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        break;
      }
      sentenceStart--;
    }

    // Skip leading whitespace
    while (sentenceStart < claim.startOffset && /\s/.test(content[sentenceStart]!)) {
      sentenceStart++;
    }

    // Find sentence end (look forward for sentence boundary)
    let sentenceEnd = claim.endOffset;
    while (sentenceEnd < content.length) {
      const char = content[sentenceEnd];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        sentenceEnd++; // Include the punctuation
        break;
      }
      sentenceEnd++;
    }

    // Extract the full sentence
    const sentenceText = content.slice(sentenceStart, sentenceEnd).trim();

    // Only expand if the sentence isn't too long (max 500 chars)
    if (sentenceText.length <= 500) {
      return {
        ...claim,
        text: sentenceText,
        startOffset: sentenceStart,
        endOffset: sentenceEnd,
      };
    }

    // If sentence is too long, return original claim with some context
    const contextStart = Math.max(0, claim.startOffset - 50);
    const contextEnd = Math.min(content.length, claim.endOffset + 50);

    return {
      ...claim,
      text: content.slice(contextStart, contextEnd).trim(),
      startOffset: contextStart,
      endOffset: contextEnd,
    };
  }

  /**
   * Remove duplicate/overlapping claims of the SAME TYPE, keeping higher confidence.
   * Different claim types on the same text region are preserved since a sentence
   * can contain multiple types of factual assertions (e.g., both scientific and statistical).
   */
  private deduplicateClaims(claims: ExtractedClaim[]): ExtractedClaim[] {
    if (claims.length <= 1) {
      return claims;
    }

    // Group claims by type
    const byType = new Map<ClaimType, ExtractedClaim[]>();
    for (const claim of claims) {
      const existing = byType.get(claim.claimType) || [];
      existing.push(claim);
      byType.set(claim.claimType, existing);
    }

    // Deduplicate within each type
    const result: ExtractedClaim[] = [];
    for (const [, typeClaims] of byType) {
      // Sort by start offset, then by confidence (higher first)
      const sorted = [...typeClaims].sort((a, b) => {
        if (a.startOffset !== b.startOffset) {
          return a.startOffset - b.startOffset;
        }
        return b.confidence - a.confidence; // Higher confidence first
      });

      let lastEnd = -1;
      for (const claim of sorted) {
        // Check if this claim overlaps with the last added claim of this type
        if (claim.startOffset >= lastEnd) {
          // No overlap, add the claim
          result.push(claim);
          lastEnd = claim.endOffset;
        }
        // Skip overlapping claims of the same type (keep first = higher confidence)
      }
    }

    return result;
  }
}
