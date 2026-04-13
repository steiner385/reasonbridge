/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TopicResponseDto } from './dto/topic-response.dto.js';

type TopicStatus = 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';

/**
 * Handles topic status transitions with permission checks.
 *
 * Extracted from TopicsService to isolate the state machine logic
 * for status transitions (SEEDING -> ACTIVE -> ARCHIVED -> LOCKED).
 *
 * @remarks
 * State transitions:
 * - Creators can: SEEDING->ACTIVE, ACTIVE->ARCHIVED, ARCHIVED->ACTIVE
 * - Moderators can: any transition including LOCKED
 *
 * Timestamps are automatically managed:
 * - activatedAt: Set on first transition to ACTIVE
 * - archivedAt: Set when archiving, cleared when unarchiving
 * - lockedAt: Set when locking, cleared when unlocking
 */
@Injectable()
export class TopicStatusService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Update topic status with permission checks.
   *
   * @param topicId - ID of the topic to update
   * @param userId - ID of the user requesting the change
   * @param newStatus - New status to set
   * @param isModerator - Whether the user is a moderator
   * @returns Updated topic
   * @throws {NotFoundException} When topic doesn't exist
   * @throws {BadRequestException} When transition not allowed for user's role
   */
  async updateStatus(
    topicId: string,
    userId: string,
    newStatus: TopicStatus,
    isModerator: boolean,
  ): Promise<TopicResponseDto> {
    // Fetch the topic
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: {
        tags: {
          include: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Check permissions
    const isCreator = topic.creatorId === userId;
    if (!isCreator && !isModerator) {
      throw new BadRequestException('Only the topic creator or moderators can change topic status');
    }

    // Validate status transition for non-moderators
    if (!isModerator) {
      if (newStatus === 'LOCKED') {
        throw new BadRequestException('Only moderators can lock topics');
      }

      if (topic.status === 'LOCKED') {
        throw new BadRequestException('Only moderators can unlock locked topics');
      }

      if (newStatus === 'SEEDING' && topic.status !== 'SEEDING') {
        throw new BadRequestException('Cannot revert an activated topic to SEEDING status');
      }
    }

    // Prepare update data with appropriate timestamps
    const updateData: Record<string, unknown> = {
      status: newStatus,
      lastActivityAt: new Date(),
    };

    // Set activatedAt when transitioning to ACTIVE for the first time
    if (newStatus === 'ACTIVE' && !topic.activatedAt) {
      updateData['activatedAt'] = new Date();
    }

    // Set archivedAt when archiving
    if (newStatus === 'ARCHIVED' && topic.status !== 'ARCHIVED') {
      updateData['archivedAt'] = new Date();
    }

    // Clear archivedAt when unarchiving
    if (newStatus === 'ACTIVE' && topic.status === 'ARCHIVED') {
      updateData['archivedAt'] = null;
    }

    // Set lockedAt when locking
    if (newStatus === 'LOCKED' && topic.status !== 'LOCKED') {
      updateData['lockedAt'] = new Date();
    }

    // Clear lockedAt when unlocking
    if (newStatus !== 'LOCKED' && topic.status === 'LOCKED') {
      updateData['lockedAt'] = null;
    }

    // Update the topic
    const updatedTopic = await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: updateData,
      include: {
        tags: {
          include: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // Invalidate caches
    await this.invalidateCaches(topicId);

    return {
      id: updatedTopic.id,
      title: updatedTopic.title,
      description: updatedTopic.description,
      creatorId: updatedTopic.creatorId,
      status: updatedTopic.status,
      visibility: updatedTopic.visibility,
      slug: updatedTopic.slug,
      evidenceStandards: updatedTopic.evidenceStandards,
      minimumDiversityScore: updatedTopic.minimumDiversityScore.toNumber(),
      currentDiversityScore: updatedTopic.currentDiversityScore?.toNumber() ?? null,
      participantCount: updatedTopic.participantCount,
      responseCount: updatedTopic.responseCount,
      crossCuttingThemes: updatedTopic.crossCuttingThemes,
      createdAt: updatedTopic.createdAt,
      activatedAt: updatedTopic.activatedAt,
      archivedAt: updatedTopic.archivedAt,
      tags: updatedTopic.tags.map((tt) => tt.tag),
      isMatureContent: updatedTopic.isMatureContent,
    };
  }

  /**
   * Invalidate caches related to a topic.
   *
   * @param topicId - ID of the topic whose caches should be invalidated
   */
  private async invalidateCaches(topicId: string): Promise<void> {
    // Delete known cache keys for this topic
    await Promise.all([
      this.cacheManager.del('topics:list'),
      this.cacheManager.del(`topics:${topicId}`),
      this.cacheManager.del(`topic:${topicId}`),
      this.cacheManager.del(`topics:${topicId}:responses`),
      this.cacheManager.del(`topics:${topicId}:propositions`),
    ]);
  }
}
