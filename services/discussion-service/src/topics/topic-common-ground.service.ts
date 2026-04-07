/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { CACHE_TTL } from '../constants/index.js';

/**
 * Handles common ground analysis retrieval and caching.
 *
 * Extracted from TopicsService to isolate caching logic
 * for the common ground feature.
 *
 * @remarks
 * Caching strategy:
 * - Latest analysis: cached with key `common-ground:topic:{topicId}:latest`
 * - Versioned analysis: cached with key `common-ground:topic:{topicId}:v{version}`
 * - Cache TTL: 1 hour (TOPIC_DETAIL_MS)
 * - Version-specific caches remain valid as analysis versions are immutable
 */
@Injectable()
export class TopicCommonGroundService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get common ground analysis for a topic with caching.
   *
   * @param topicId - ID of the topic
   * @param version - Optional specific version to retrieve
   * @returns Common ground analysis DTO
   * @throws {NotFoundException} When topic doesn't exist
   * @throws {NotFoundException} When no analysis exists for the topic (or version)
   */
  async getAnalysis(topicId: string, version?: number): Promise<CommonGroundResponseDto> {
    // Generate cache key based on whether a specific version is requested
    const cacheKey = version
      ? `common-ground:topic:${topicId}:v${version}`
      : `common-ground:topic:${topicId}:latest`;

    // Try to get from cache first
    const cached = await this.cacheManager.get<CommonGroundResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Verify the topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Fetch the analysis - either specific version or latest
    const where = version ? { topicId, version } : { topicId };
    const orderBy = version ? undefined : { version: 'desc' as const };

    const analysis = await this.prisma.commonGroundAnalysis.findFirst({
      where,
      orderBy,
    });

    if (!analysis) {
      throw new NotFoundException(
        version
          ? `Common ground analysis version ${version} not found for topic ${topicId}`
          : `No common ground analysis found for topic ${topicId}`,
      );
    }

    // Map database model to DTO
    // Note: JSON fields from Prisma are typed as JsonValue, using 'any' for
    // compatibility with the DTO types (same pattern as TopicsService)
    const result: CommonGroundResponseDto = {
      id: analysis.id,
      version: analysis.version,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agreementZones: analysis.agreementZones as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      misunderstandings: analysis.misunderstandings as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      genuineDisagreements: analysis.genuineDisagreements as any,
      overallConsensusScore: analysis.overallConsensusScore?.toNumber() ?? 0,
      participantCountAtGeneration: analysis.participantCountAtGeneration,
      responseCountAtGeneration: analysis.responseCountAtGeneration,
      generatedAt: analysis.createdAt,
    };

    // Cache the result with a 1-hour TTL
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.TOPIC_DETAIL_MS);

    return result;
  }

  /**
   * Invalidate common ground cache for a specific topic.
   *
   * Called when new analysis is generated.
   *
   * @param topicId - ID of the topic
   *
   * @remarks
   * Only invalidates the "latest" cache key. Versioned caches remain valid
   * as analysis versions are immutable once created.
   */
  async invalidateCache(topicId: string): Promise<void> {
    const latestKey = `common-ground:topic:${topicId}:latest`;
    await this.cacheManager.del(latestKey);
  }
}
