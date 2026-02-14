/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { IFactCheckClient } from './abstract-fact-check.client.js';
import type {
  FactCheckRequest,
  FactCheckResult,
  FactCheckClientHealth,
  GoogleFactCheckApiResponse,
  FactCheckSourceResult,
} from './types.js';

/**
 * Default cache TTL: 24 hours for established facts
 */
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Reduced TTL for developing situations (claims less than 7 days old): 6 hours
 */
const DEVELOPING_SITUATION_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Default API timeout: 5 seconds
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Known credibility ratings for fact-check publishers
 * Based on International Fact-Checking Network (IFCN) signatories
 */
const PUBLISHER_CREDIBILITY: Record<string, number> = {
  'snopes.com': 95,
  'politifact.com': 90,
  'factcheck.org': 90,
  'apnews.com': 88,
  'reuters.com': 88,
  'washingtonpost.com': 85,
  'bbc.com': 85,
  'fullfact.org': 90,
  'leadstories.com': 80,
  'usatoday.com': 75,
};

/**
 * Default credibility for unknown publishers
 */
const DEFAULT_CREDIBILITY = 60;

/**
 * Google Fact Check Tools API client
 *
 * @see https://developers.google.com/fact-check/tools/api
 *
 * This client queries the Google Fact Check API which aggregates
 * fact-checks from multiple trusted sources including Snopes,
 * PolitiFact, FactCheck.org, and others.
 */
@Injectable()
export class GoogleFactCheckClient implements IFactCheckClient {
  readonly name = 'google-fact-check';

  private readonly logger = new Logger(GoogleFactCheckClient.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;
  private readonly timeoutMs: number;

  private lastSuccessAt?: Date;
  private lastErrorAt?: Date;
  private recentErrors: Date[] = [];

  constructor() {
    this.apiKey = process.env['GOOGLE_FACT_CHECK_API_KEY'];
    this.apiUrl =
      process.env['GOOGLE_FACT_CHECK_API_URL'] || 'https://factchecktools.googleapis.com/v1alpha1';
    this.timeoutMs = parseInt(
      process.env['FACT_CHECK_API_TIMEOUT_MS'] || String(DEFAULT_TIMEOUT_MS),
      10,
    );

    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_FACT_CHECK_API_KEY not configured - Google Fact Check API will be unavailable',
      );
    }
  }

  /**
   * Check if this client is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get health status of this client
   */
  async getHealth(): Promise<FactCheckClientHealth> {
    // Clean up errors older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.recentErrors = this.recentErrors.filter((d) => d > oneHourAgo);

    if (!this.isConfigured()) {
      return {
        isHealthy: false,
        message: 'API key not configured',
        recentErrorCount: this.recentErrors.length,
      };
    }

    // Consider unhealthy if more than 5 errors in the last hour
    const isHealthy = this.recentErrors.length < 5;

    return {
      isHealthy,
      message: isHealthy ? 'Operational' : 'High error rate detected',
      lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt,
      recentErrorCount: this.recentErrors.length,
    };
  }

  /**
   * Check a claim using Google Fact Check API
   */
  async checkClaim(request: FactCheckRequest): Promise<FactCheckResult | null> {
    if (!this.isConfigured()) {
      this.logger.debug('Skipping fact check - API key not configured');
      return null;
    }

    const { claim, languageCode = 'en', maxResults = 10 } = request;

    try {
      const url = new URL(`${this.apiUrl}/claims:search`);
      url.searchParams.set('query', claim);
      url.searchParams.set('languageCode', languageCode);
      url.searchParams.set('pageSize', String(maxResults));
      url.searchParams.set('key', this.apiKey!);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.recordError();
        this.logger.warn(`Google Fact Check API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: GoogleFactCheckApiResponse = await response.json();
      this.recordSuccess();

      if (!data.claims || data.claims.length === 0) {
        this.logger.debug(`No fact-checks found for claim: "${claim.substring(0, 50)}..."`);
        return null;
      }

      return this.transformResponse(claim, data);
    } catch (error) {
      this.recordError();

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Google Fact Check API timeout after ${this.timeoutMs}ms`);
      } else {
        this.logger.warn(
          `Google Fact Check API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      return null;
    }
  }

  /**
   * Transform Google API response to our standard format
   */
  private transformResponse(
    originalClaim: string,
    data: GoogleFactCheckApiResponse,
  ): FactCheckResult {
    const sources: FactCheckSourceResult[] = [];
    const ratings: Set<string> = new Set();

    for (const claim of data.claims || []) {
      for (const review of claim.claimReview || []) {
        if (!review.url || !review.publisher?.name) continue;

        const rating = review.textualRating?.toLowerCase();
        if (rating) {
          ratings.add(rating);
        }

        const publisherSite = review.publisher.site?.toLowerCase() || '';
        const credibility =
          Object.entries(PUBLISHER_CREDIBILITY).find(([site]) =>
            publisherSite.includes(site),
          )?.[1] || DEFAULT_CREDIBILITY;

        sources.push({
          source: review.publisher.name,
          title: review.title || claim.text || 'Fact Check',
          url: review.url,
          publishedAt: review.reviewDate ? new Date(review.reviewDate) : new Date(),
          rating: review.textualRating,
          excerpt: claim.text,
          sourceCredibility: credibility,
        });
      }
    }

    // Sort by credibility (highest first)
    sources.sort((a, b) => b.sourceCredibility - a.sourceCredibility);

    // Check for conflicting ratings
    const hasConflictingSources = this.detectConflictingRatings(ratings);

    // Calculate TTL based on recency of the claim
    const mostRecentReview = sources.reduce(
      (latest, s) => (s.publishedAt > latest ? s.publishedAt : latest),
      new Date(0),
    );
    const isRecentClaim = Date.now() - mostRecentReview.getTime() < 7 * 24 * 60 * 60 * 1000;
    const ttl = isRecentClaim ? DEVELOPING_SITUATION_TTL_MS : DEFAULT_CACHE_TTL_MS;

    return {
      claimText: originalClaim,
      sources,
      hasConflictingSources,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
    };
  }

  /**
   * Detect if ratings conflict with each other
   */
  private detectConflictingRatings(ratings: Set<string>): boolean {
    const truthyRatings = ['true', 'mostly true', 'correct', 'accurate'];
    const falsyRatings = ['false', 'mostly false', 'incorrect', 'inaccurate', 'pants on fire'];

    let hasTruthy = false;
    let hasFalsy = false;

    for (const rating of ratings) {
      if (truthyRatings.some((t) => rating.includes(t))) {
        hasTruthy = true;
      }
      if (falsyRatings.some((f) => rating.includes(f))) {
        hasFalsy = true;
      }
    }

    return hasTruthy && hasFalsy;
  }

  private recordSuccess(): void {
    this.lastSuccessAt = new Date();
  }

  private recordError(): void {
    this.lastErrorAt = new Date();
    this.recentErrors.push(new Date());
  }
}
