/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MergeTopicsDto } from './dto/merge-topics.dto.js';

/**
 * Handles topic merge and rollback operations.
 *
 * Extracted from TopicsService to isolate complex transaction logic
 * with snapshots, validation, and rollback capabilities.
 */
@Injectable()
export class TopicMergeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Merge multiple topics into a single target topic.
   *
   * @param moderatorId - ID of the moderator performing the merge
   * @param mergeDto - Merge request with source topics, target, and reason
   * @returns Merge record ID for potential rollback
   * @throws BadRequestException if target is in source list or sources are locked
   * @throws NotFoundException if any topic does not exist
   */
  async mergeTopics(
    moderatorId: string,
    mergeDto: MergeTopicsDto,
  ): Promise<{ mergeId: string; responsesMoved: number; participantsMerged: number }> {
    const { sourceTopicIds, targetTopicId, mergeReason } = mergeDto;

    // Validate that target is not in source list
    if (sourceTopicIds.includes(targetTopicId)) {
      throw new BadRequestException('Target topic cannot be one of the source topics');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Fetch all topics (source + target) with full data for snapshots
      const allTopicIds = [...sourceTopicIds, targetTopicId];
      const topics = await tx.discussionTopic.findMany({
        where: { id: { in: allTopicIds } },
        include: {
          tags: { include: { tag: true } },
          responses: { select: { id: true, authorId: true } },
        },
      });

      // Verify all topics exist
      if (topics.length !== allTopicIds.length) {
        const foundIds = topics.map((t) => t.id);
        const missingIds = allTopicIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(`Topics not found: ${missingIds.join(', ')}`);
      }

      // Separate source and target
      const sourceTopics = topics.filter((t) => sourceTopicIds.includes(t.id));
      const targetTopic = topics.find((t) => t.id === targetTopicId);

      if (!targetTopic) {
        throw new NotFoundException(`Target topic ${targetTopicId} not found`);
      }

      // Validate source topics are not locked
      const lockedSources = sourceTopics.filter((t) => t.status === 'LOCKED');
      if (lockedSources.length > 0) {
        throw new BadRequestException(
          `Cannot merge locked topics: ${lockedSources.map((t) => t.title).join(', ')}`,
        );
      }

      // Create snapshots for rollback
      const sourceSnapshots = sourceTopics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        status: topic.status,
        visibility: topic.visibility,
        slug: topic.slug,
        creatorId: topic.creatorId,
        participantCount: topic.participantCount,
        responseCount: topic.responseCount,
        tags: topic.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })),
        createdAt: topic.createdAt.toISOString(),
      }));

      // Move all responses from source topics to target
      const responsesToMove = sourceTopics.reduce((sum, t) => sum + t.responseCount, 0);

      await tx.response.updateMany({
        where: { topicId: { in: sourceTopicIds } },
        data: { topicId: targetTopicId },
      });

      // Merge participant activities
      const sourceParticipants = new Set<string>();
      sourceTopics.forEach((topic) => {
        topic.responses.forEach((response) => {
          sourceParticipants.add(response.authorId);
        });
      });

      const participantsMerged = sourceParticipants.size;

      // Update target topic counts
      const newResponseCount = targetTopic.responseCount + responsesToMove;
      const targetParticipants = new Set(targetTopic.responses.map((r) => r.authorId));
      sourceParticipants.forEach((id) => targetParticipants.add(id));
      const newParticipantCount = targetParticipants.size;

      await tx.discussionTopic.update({
        where: { id: targetTopicId },
        data: {
          responseCount: newResponseCount,
          participantCount: newParticipantCount,
          lastActivityAt: new Date(),
        },
      });

      // Create merge record
      const merge = await tx.topicMerge.create({
        data: {
          sourceTopicIds,
          targetTopicId,
          moderatorId,
          mergeReason,
          sourceSnapshots,
          responsesMoved: responsesToMove,
          participantsMerged,
        },
      });

      // Archive source topics with redirect note
      for (const sourceTopic of sourceTopics) {
        const redirectNote = `\n\n---\n**[MERGED]** This topic has been merged into: [${targetTopic.title}](/topics/${targetTopic.slug})\nReason: ${mergeReason}`;

        await tx.discussionTopic.update({
          where: { id: sourceTopic.id },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
            description: sourceTopic.description + redirectNote,
          },
        });
      }

      return {
        mergeId: merge.id,
        responsesMoved: responsesToMove,
        participantsMerged,
      };
    });
  }

  /**
   * Rollback a topic merge operation.
   *
   * @param moderatorId - ID of the moderator performing rollback
   * @param mergeId - ID of the merge to rollback
   * @param rollbackReason - Reason for rollback
   * @throws NotFoundException if merge record doesn't exist
   * @throws BadRequestException if already rolled back or window expired
   */
  async rollbackTopicMerge(
    moderatorId: string,
    mergeId: string,
    rollbackReason: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Fetch merge record
      const merge = await tx.topicMerge.findUnique({
        where: { id: mergeId },
      });

      if (!merge) {
        throw new NotFoundException(`Merge record ${mergeId} not found`);
      }

      // Check if already rolled back
      if (merge.rolledBackAt) {
        throw new BadRequestException('This merge has already been rolled back');
      }

      // Check 30-day window
      const daysSinceMerge = (Date.now() - merge.mergedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceMerge > 30) {
        throw new BadRequestException(
          'Rollback window has expired (30 days). Manual intervention required.',
        );
      }

      // Move responses back to first source topic
      const firstSourceId = merge.sourceTopicIds[0];

      await tx.response.updateMany({
        where: {
          topicId: merge.targetTopicId,
          createdAt: { gte: merge.mergedAt },
        },
        data: { topicId: firstSourceId },
      });

      // Restore source topics from snapshots
      const snapshots = merge.sourceSnapshots as Array<{
        id: string;
        description: string;
      }>;

      for (const snapshot of snapshots) {
        await tx.discussionTopic.update({
          where: { id: snapshot.id },
          data: {
            status: 'ACTIVE',
            archivedAt: null,
            description: snapshot.description,
          },
        });
      }

      // Mark merge as rolled back
      await tx.topicMerge.update({
        where: { id: mergeId },
        data: {
          rolledBackAt: new Date(),
          rollbackReason,
        },
      });
    });
  }
}
