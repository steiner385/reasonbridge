/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  GoogleFactCheckResponse,
  FactCheckResultDto,
  FactCheckSource,
  FactCheckedClaim,
} from './dto/fact-check-api.dto.js';

/**
 * Client for Google Fact Check Tools API
 * https://developers.google.com/fact-check/tools/api
 *
 * T253: External fact-check API client implementation
 */
@Injectable()
export class GoogleFactCheckClient {
  private readonly logger = new Logger(GoogleFactCheckClient.name);
  private readonly baseUrl = 'https://factchecktools.googleapis.com/v1alpha1';
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxResults: number;

  constructor() {
    this.apiKey = process.env['GOOGLE_FACT_CHECK_API_KEY'] || '';
    this.timeoutMs = parseInt(process.env['FACT_CHECK_TIMEOUT_MS'] || '5000', 10);
    this.maxResults = parseInt(process.env['FACT_CHECK_MAX_RESULTS'] || '10', 10);

    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_FACT_CHECK_API_KEY not configured - fact-check functionality will be limited',
      );
    }
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search for fact-checks related to a claim
   *
   * @param query - The claim text to search for
   * @param languageCode - Optional language code (e.g., 'en')
   * @returns Fact-check results or empty array if none found
   */
  async searchClaims(query: string, languageCode?: string): Promise<FactCheckResultDto[]> {
    if (!this.isConfigured()) {
      this.logger.debug('Fact-check API not configured, returning empty results');
      return [];
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        query: query,
        pageSize: this.maxResults.toString(),
      });

      if (languageCode) {
        params.append('languageCode', languageCode);
      }

      const url = `${this.baseUrl}/claims:search?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.warn(
            `Google Fact Check API error: ${response.status} ${response.statusText}`,
          );
          return [];
        }

        const data = (await response.json()) as GoogleFactCheckResponse;
        return this.transformResponse(query, data);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Fact-check API request timed out after ${this.timeoutMs}ms`);
      } else {
        this.logger.warn(
          `Error calling fact-check API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      return [];
    }
  }

  /**
   * Transform Google API response to internal format
   */
  private transformResponse(
    originalQuery: string,
    response: GoogleFactCheckResponse,
  ): FactCheckResultDto[] {
    if (!response.claims || response.claims.length === 0) {
      return [];
    }

    return response.claims.map((claim) => this.transformClaim(originalQuery, claim));
  }

  /**
   * Transform a single claim to internal format
   */
  private transformClaim(originalQuery: string, claim: FactCheckedClaim): FactCheckResultDto {
    const sources: FactCheckSource[] = claim.claimReview.map((review) => ({
      provider: review.publisher.name,
      url: review.url,
      title: review.title,
      publishedAt: review.reviewDate,
      rating: review.textualRating,
      ratingDescription: review.textualRating,
      credibilityScore: this.estimateCredibility(review.publisher.name),
      retrievedAt: new Date().toISOString(),
    }));

    const ratings = sources.map((s) => s.rating.toLowerCase());
    const hasConflictingSources = this.detectConflict(ratings);

    return {
      claimText: claim.text || originalQuery,
      sources,
      hasConflictingSources,
      conflictSummary: hasConflictingSources
        ? 'Multiple fact-checkers have different assessments for this claim.'
        : undefined,
    };
  }

  /**
   * Estimate credibility score based on known fact-checking organizations
   * Returns a score between 0 and 1
   */
  private estimateCredibility(providerName: string): number {
    // IFCN (International Fact-Checking Network) signatories get higher scores
    const ifcnSignatories = [
      'politifact',
      'snopes',
      'factcheck.org',
      'washington post',
      'ap fact check',
      'reuters',
      'full fact',
      'africa check',
      'chequeado',
      'aos fatos',
    ];

    const lowerName = providerName.toLowerCase();

    if (ifcnSignatories.some((sig) => lowerName.includes(sig))) {
      return 0.9;
    }

    // Major news organizations
    const majorNews = ['bbc', 'nyt', 'cnn', 'guardian', 'abc news', 'nbc news', 'cbs news'];

    if (majorNews.some((org) => lowerName.includes(org))) {
      return 0.75;
    }

    // Default score for unknown providers
    return 0.5;
  }

  /**
   * Detect if sources have conflicting ratings
   */
  private detectConflict(ratings: string[]): boolean {
    if (ratings.length < 2) return false;

    const positiveIndicators = ['true', 'correct', 'accurate', 'confirmed', 'verified'];
    const negativeIndicators = [
      'false',
      'wrong',
      'incorrect',
      'misleading',
      'debunked',
      'pants on fire',
    ];

    let hasPositive = false;
    let hasNegative = false;

    for (const rating of ratings) {
      const lower = rating.toLowerCase();
      if (positiveIndicators.some((ind) => lower.includes(ind))) {
        hasPositive = true;
      }
      if (negativeIndicators.some((ind) => lower.includes(ind))) {
        hasNegative = true;
      }
    }

    return hasPositive && hasNegative;
  }
}
