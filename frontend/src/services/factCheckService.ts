/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fact-check API service
 * T258: Provides client for fact-check operations
 */

import type {
  CheckClaimsRequest,
  CheckClaimsResponse,
  Claim,
  FactCheckResult,
} from '../types/factCheck';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

class FactCheckService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Check claims for fact-check information
   *
   * @param responseId - The response ID containing the claims
   * @param claims - Array of claims to check
   * @returns Fact-check results from external providers
   */
  async checkClaims(responseId: string, claims: Claim[]): Promise<CheckClaimsResponse> {
    const request: CheckClaimsRequest = {
      responseId,
      claims,
    };

    const response = await fetch(`${API_BASE_URL}/fact-check/check`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to check claims' }));
      throw new Error(error.message || 'Failed to check claims');
    }

    return response.json();
  }

  /**
   * Extract claims from response content
   * Simple extraction - finds sentences that make factual assertions
   *
   * @param content - Response content to extract claims from
   * @returns Array of extracted claims with positions
   */
  extractClaims(content: string): Claim[] {
    const claims: Claim[] = [];

    // Split into sentences
    const sentencePattern = /[^.!?]+[.!?]+/g;
    let match: RegExpExecArray | null;

    while ((match = sentencePattern.exec(content)) !== null) {
      const sentence = match[0].trim();

      // Skip very short sentences or questions
      if (sentence.length < 20 || sentence.endsWith('?')) {
        continue;
      }

      // Look for factual assertion patterns
      const factualPatterns = [
        /\b(is|are|was|were|has|have|had)\b/i,
        /\b(studies? show|research (shows?|indicates?)|according to)\b/i,
        /\b(percent|percentage|million|billion|thousand)\b/i,
        /\b(always|never|every|all|none|most|many|few)\b/i,
        /\b(proven|confirmed|established|demonstrated)\b/i,
        /\b(in \d{4}|since \d{4}|by \d{4})\b/i,
      ];

      const isFactualClaim = factualPatterns.some((pattern) => pattern.test(sentence));

      if (isFactualClaim) {
        claims.push({
          text: sentence,
          startOffset: match.index,
          endOffset: match.index + sentence.length,
        });
      }
    }

    // Limit to 10 claims max (API limit)
    return claims.slice(0, 10);
  }

  /**
   * Check if a fact-check result has expired
   */
  isExpired(result: FactCheckResult): boolean {
    const expiresAt = new Date(result.expiresAt);
    return expiresAt < new Date();
  }

  /**
   * Get the overall status for a set of results
   */
  getOverallStatus(results: FactCheckResult[]): 'has-context' | 'no-context' | 'conflicts' {
    if (results.length === 0) {
      return 'no-context';
    }

    const hasConflicts = results.some((r) => r.hasConflictingSources);
    if (hasConflicts) {
      return 'conflicts';
    }

    const hasSources = results.some((r) => r.sources.length > 0);
    return hasSources ? 'has-context' : 'no-context';
  }
}

export const factCheckService = new FactCheckService();
