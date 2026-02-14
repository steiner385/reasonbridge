/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  FACT_CHECK_CLIENTS,
  type IFactCheckClient,
  type FactCheckResult,
} from '../clients/index.js';
import { FactCheckRequestDto } from './dto/fact-check-request.dto.js';
import {
  FactCheckResponseDto,
  FactCheckSourceResponseDto,
  NoFactCheckFoundResponseDto,
} from './dto/fact-check-response.dto.js';

/**
 * Service for orchestrating fact-check requests across multiple clients
 */
@Injectable()
export class FactCheckService {
  private readonly logger = new Logger(FactCheckService.name);

  constructor(
    @Inject(FACT_CHECK_CLIENTS)
    private readonly clients: IFactCheckClient[],
  ) {
    this.logger.log(`Initialized with ${this.clients.length} configured client(s)`);
  }

  /**
   * Check a claim across all configured fact-check clients
   */
  async checkClaim(
    request: FactCheckRequestDto,
  ): Promise<FactCheckResponseDto | NoFactCheckFoundResponseDto> {
    this.logger.debug(`Checking claim: "${request.claim.substring(0, 50)}..."`);

    if (this.clients.length === 0) {
      this.logger.warn('No fact-check clients configured');
      return this.createNoResultResponse(
        request.claim,
        'No fact-check services are currently configured',
      );
    }

    // Query all clients in parallel
    const results = await Promise.allSettled(
      this.clients.map((client) =>
        client.checkClaim({
          claim: request.claim,
          languageCode: request.languageCode,
          maxResults: request.maxResults,
        }),
      ),
    );

    // Collect successful results
    const successfulResults: FactCheckResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const client = this.clients[i];
      if (!result || !client) continue;

      const clientName = client.name;

      if (result.status === 'fulfilled') {
        if (result.value !== null) {
          successfulResults.push(result.value);
          this.logger.debug(`Client ${clientName} returned ${result.value.sources.length} sources`);
        } else {
          this.logger.debug(`Client ${clientName} returned no results`);
        }
      } else {
        this.logger.warn(`Client ${clientName} failed: ${result.reason}`);
      }
    }

    if (successfulResults.length === 0) {
      return this.createNoResultResponse(request.claim, 'No fact-checks found for this claim');
    }

    // Merge results from all clients
    return this.mergeResults(request.claim, successfulResults);
  }

  /**
   * Get health status of all configured clients
   */
  async getClientsHealth(): Promise<{ name: string; isHealthy: boolean; message: string }[]> {
    const healthChecks = await Promise.all(
      this.clients.map(async (client) => {
        const health = await client.getHealth();
        return {
          name: client.name,
          isHealthy: health.isHealthy,
          message: health.message,
        };
      }),
    );

    return healthChecks;
  }

  /**
   * Merge results from multiple fact-check clients
   */
  private mergeResults(claim: string, results: FactCheckResult[]): FactCheckResponseDto {
    // Collect all sources, deduplicate by URL
    const sourcesByUrl = new Map<string, FactCheckSourceResponseDto>();
    let hasConflictingSources = false;
    let checkedAt = new Date(0);
    let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h

    for (const result of results) {
      // Track conflict status across all results
      if (result.hasConflictingSources) {
        hasConflictingSources = true;
      }

      // Track earliest check time and expiration
      if (result.checkedAt > checkedAt) {
        checkedAt = result.checkedAt;
      }
      if (result.expiresAt < expiresAt) {
        expiresAt = result.expiresAt;
      }

      // Deduplicate sources by URL
      for (const source of result.sources) {
        if (!sourcesByUrl.has(source.url)) {
          sourcesByUrl.set(source.url, {
            source: source.source,
            title: source.title,
            url: source.url,
            publishedAt: source.publishedAt.toISOString(),
            rating: source.rating,
            excerpt: source.excerpt,
            sourceCredibility: source.sourceCredibility,
          });
        }
      }
    }

    // Convert to array and sort by credibility (highest first)
    const sources = Array.from(sourcesByUrl.values()).sort(
      (a, b) => b.sourceCredibility - a.sourceCredibility,
    );

    // Get top verdict from most credible source
    const topVerdict = sources[0]?.rating;

    return {
      claimText: claim,
      sources,
      hasConflictingSources,
      checkedAt: checkedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sourceCount: sources.length,
      topVerdict,
    };
  }

  /**
   * Create a "no results found" response with helpful suggestions
   */
  private createNoResultResponse(claim: string, message: string): NoFactCheckFoundResponseDto {
    return {
      claimText: claim,
      message,
      suggestions: [
        'Try rephrasing the claim with different keywords',
        'Check if the claim is recent - fact-checkers may not have covered it yet',
        'Look for the original source of the claim for context',
        'Consider checking reputable news sources directly',
      ],
    };
  }
}
