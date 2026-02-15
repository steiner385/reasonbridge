/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IFactCheckClient } from '../clients/abstract-fact-check.client.js';
import { FACT_CHECK_CLIENTS } from '../clients/abstract-fact-check.client.js';
import type {
  CheckClaimsRequestDto,
  CheckClaimsResponseDto,
  FactCheckResultDto,
  FactCheckSourceDto,
  ClaimDto,
} from '../dto/check-claims.dto.js';
import { FactCheckCacheService, computeContentHash } from '../cache/index.js';

/**
 * Service for coordinating fact-checks across multiple providers
 *
 * T254: POST /fact-check/check endpoint implementation
 *
 * This service aggregates results from all configured fact-check clients
 * and transforms them into the API response format.
 */
@Injectable()
export class FactCheckService {
  private readonly logger = new Logger(FactCheckService.name);

  constructor(
    @Inject(FACT_CHECK_CLIENTS)
    private readonly factCheckClients: IFactCheckClient[],
    @Optional()
    private readonly cacheService?: FactCheckCacheService,
  ) {
    this.logger.log(
      `FactCheckService initialized with ${this.factCheckClients.length} configured client(s), caching: ${this.cacheService ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Check multiple claims for fact-check information
   *
   * @param request - The claims to check
   * @returns Aggregated fact-check results from all providers
   */
  async checkClaims(request: CheckClaimsRequestDto): Promise<CheckClaimsResponseDto> {
    const startTime = Date.now();

    if (this.factCheckClients.length === 0) {
      this.logger.warn('No fact-check clients configured');
      return {
        results: [],
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Process all claims in parallel
    const resultsPromises = request.claims.map((claim) => this.checkSingleClaim(claim));
    const results = await Promise.all(resultsPromises);

    // Filter out null results (claims with no fact-checks found)
    const validResults = results.filter((r): r is FactCheckResultDto => r !== null);

    return {
      results: validResults,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Check a single claim against all configured providers
   *
   * Caching strategy:
   * 1. Compute hash of normalized claim text
   * 2. Check cache for existing result
   * 3. On cache miss, query all providers
   * 4. Store result in cache (async, non-blocking)
   */
  private async checkSingleClaim(claim: ClaimDto): Promise<FactCheckResultDto | null> {
    const claimHash = computeContentHash(claim.text);

    // Try cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get(claimHash);
      if (cached) {
        // Return cached result with updated offsets for this specific claim instance
        return {
          ...cached,
          id: randomUUID(), // Generate new ID for this response
          claimStartOffset: claim.startOffset,
          claimEndOffset: claim.endOffset,
        };
      }
    }

    // Query all clients in parallel
    const clientPromises = this.factCheckClients.map((client) =>
      client.checkClaim({ claim: claim.text }).catch((error) => {
        this.logger.warn(`Error from client ${client.name}: ${error.message}`);
        return null;
      }),
    );

    const clientResults = await Promise.all(clientPromises);

    // Filter out null results and aggregate sources
    const allSources: FactCheckSourceDto[] = [];
    let latestExpiresAt = new Date();
    let hasConflictingSources = false;

    for (const result of clientResults) {
      if (!result) continue;

      // Track if any client detected conflicts
      if (result.hasConflictingSources) {
        hasConflictingSources = true;
      }

      // Track the latest expiration time
      if (result.expiresAt > latestExpiresAt) {
        latestExpiresAt = result.expiresAt;
      }

      // Transform and add sources
      for (const source of result.sources) {
        allSources.push({
          provider: source.source,
          url: source.url,
          title: source.title,
          publishedAt: source.publishedAt.toISOString(),
          rating: source.rating,
          ratingDescription: source.rating,
          // Convert from 0-100 to 0-1 scale
          credibilityScore: source.sourceCredibility / 100,
          retrievedAt: new Date().toISOString(),
        });
      }
    }

    // No sources found from any provider
    if (allSources.length === 0) {
      return null;
    }

    // Sort by credibility (highest first)
    allSources.sort((a, b) => b.credibilityScore - a.credibilityScore);

    // Generate conflict summary if needed
    const conflictSummary = hasConflictingSources
      ? 'Multiple fact-checking sources have different assessments for this claim.'
      : undefined;

    const result: FactCheckResultDto = {
      id: randomUUID(),
      claimText: claim.text,
      claimStartOffset: claim.startOffset,
      claimEndOffset: claim.endOffset,
      displayedAs: 'Related Context',
      sources: allSources,
      hasConflictingSources,
      conflictSummary,
      expiresAt: latestExpiresAt.toISOString(),
    };

    // Cache the result asynchronously (don't block response)
    // Store by both claim hash (for cache lookups) and result ID (for direct retrieval)
    if (this.cacheService) {
      Promise.all([
        this.cacheService.set(claimHash, result),
        this.cacheService.setById(result.id, result),
      ]).catch((error) => {
        this.logger.warn(`Failed to cache fact-check result: ${error.message}`);
      });
    }

    return result;
  }

  /**
   * Get a fact-check result by its ID
   *
   * T256: GET /fact-check/:id endpoint implementation
   *
   * @param id - Result ID (UUID)
   * @returns The fact-check result or null if not found
   */
  async getResultById(id: string): Promise<FactCheckResultDto | null> {
    if (!this.cacheService) {
      this.logger.warn('Cache service not available for ID lookup');
      return null;
    }

    return this.cacheService.getById(id);
  }

  /**
   * Get health status of all fact-check providers
   */
  async getProvidersHealth(): Promise<{
    providers: Array<{
      name: string;
      isHealthy: boolean;
      message: string;
    }>;
  }> {
    const healthPromises = this.factCheckClients.map(async (client) => {
      const health = await client.getHealth();
      return {
        name: client.name,
        isHealthy: health.isHealthy,
        message: health.message,
      };
    });

    const providers = await Promise.all(healthPromises);
    return { providers };
  }
}
