/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChildContentModerationService } from '../child-content-moderation.service.js';

/**
 * ChildContentModerationService Unit Tests
 *
 * Tests focus on business logic for moderating content from child users.
 * Covers:
 * - Queuing responses for review
 * - Priority escalation for AI-flagged grooming patterns
 * - Content approval and rejection workflows
 * - Escalation to senior moderators
 * - Queue statistics and item retrieval
 */
describe('ChildContentModerationService', () => {
  let service: ChildContentModerationService;
  let prismaService: any;

  beforeEach(() => {
    // Create mock PrismaService
    prismaService = {
      childContentReviewQueue: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    service = new ChildContentModerationService(prismaService);
  });

  describe('Service Instantiation', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(ChildContentModerationService);
    });

    it('should have all required methods', () => {
      const methods = [
        'queueForReview',
        'approveContent',
        'rejectContent',
        'escalate',
        'getQueueStats',
        'getPendingItems',
      ];

      for (const method of methods) {
        expect(typeof (service as any)[method]).toBe('function');
      }
    });
  });

  describe('queueForReview', () => {
    it('should create queue entry for response in child-accessible topic', async () => {
      const responseId = 'response-123';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'This is a test response from a child user';

      const mockQueueEntry = {
        id: 'queue-entry-1',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'NORMAL',
        aiFlags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      await service.queueForReview(responseId, topicId, authorId, content);

      expect(prismaService.childContentReviewQueue.create).toHaveBeenCalledWith({
        data: {
          responseId,
          topicId,
          authorId,
          content,
          status: 'PENDING',
          priority: 'NORMAL',
        },
      });
    });

    it('should set priority to URGENT if AI flags grooming patterns', async () => {
      const responseId = 'response-123';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'Some content flagged by AI';
      const aiFlags = { grooming: true, confidence: 0.85 };

      const mockQueueEntry = {
        id: 'queue-entry-1',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'URGENT',
        aiFlags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      await service.queueForReview(responseId, topicId, authorId, content, aiFlags);

      expect(prismaService.childContentReviewQueue.create).toHaveBeenCalledWith({
        data: {
          responseId,
          topicId,
          authorId,
          content,
          status: 'PENDING',
          priority: 'URGENT',
          aiFlags,
        },
      });
    });

    it('should set priority to HIGH if AI flags other concerning content', async () => {
      const responseId = 'response-123';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'Some concerning content';
      const aiFlags = { inappropriate: true, confidence: 0.7 };

      const mockQueueEntry = {
        id: 'queue-entry-1',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'HIGH',
        aiFlags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      await service.queueForReview(responseId, topicId, authorId, content, aiFlags);

      expect(prismaService.childContentReviewQueue.create).toHaveBeenCalledWith({
        data: {
          responseId,
          topicId,
          authorId,
          content,
          status: 'PENDING',
          priority: 'HIGH',
          aiFlags,
        },
      });
    });
  });

  describe('approveContent', () => {
    it('should mark response as approved and updates status', async () => {
      const queueId = 'queue-entry-1';
      const moderatorId = 'moderator-123';

      const mockQueueEntry = {
        id: queueId,
        responseId: 'response-123',
        topicId: 'topic-456',
        authorId: 'author-789',
        content: 'Test content',
        status: 'PENDING',
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedEntry = {
        ...mockQueueEntry,
        status: 'APPROVED',
        decision: 'APPROVED',
        reviewedById: moderatorId,
        reviewedAt: expect.any(Date),
      };

      prismaService.childContentReviewQueue.findUnique.mockResolvedValue(mockQueueEntry);
      prismaService.childContentReviewQueue.update.mockResolvedValue(updatedEntry);

      await service.approveContent(queueId, moderatorId);

      expect(prismaService.childContentReviewQueue.update).toHaveBeenCalledWith({
        where: { id: queueId },
        data: {
          status: 'APPROVED',
          decision: 'APPROVED',
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if queue entry not found', async () => {
      const queueId = 'non-existent';
      const moderatorId = 'moderator-123';

      prismaService.childContentReviewQueue.findUnique.mockResolvedValue(null);

      await expect(service.approveContent(queueId, moderatorId)).rejects.toThrow(
        'Queue entry not found',
      );
    });
  });

  describe('rejectContent', () => {
    it('should mark response as rejected with child-friendly feedback', async () => {
      const queueId = 'queue-entry-1';
      const moderatorId = 'moderator-123';
      const reason = 'This content contains language that is not appropriate for our discussion.';

      const mockQueueEntry = {
        id: queueId,
        responseId: 'response-123',
        topicId: 'topic-456',
        authorId: 'author-789',
        content: 'Test content',
        status: 'PENDING',
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedEntry = {
        ...mockQueueEntry,
        status: 'REJECTED',
        decision: 'REJECTED',
        reviewedById: moderatorId,
        reviewedAt: expect.any(Date),
        rejectionReason: reason,
      };

      prismaService.childContentReviewQueue.findUnique.mockResolvedValue(mockQueueEntry);
      prismaService.childContentReviewQueue.update.mockResolvedValue(updatedEntry);

      await service.rejectContent(queueId, moderatorId, reason);

      expect(prismaService.childContentReviewQueue.update).toHaveBeenCalledWith({
        where: { id: queueId },
        data: {
          status: 'REJECTED',
          decision: 'REJECTED',
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
          rejectionReason: reason,
        },
      });
    });

    it('should throw error if queue entry not found', async () => {
      const queueId = 'non-existent';
      const moderatorId = 'moderator-123';
      const reason = 'Some reason';

      prismaService.childContentReviewQueue.findUnique.mockResolvedValue(null);

      await expect(service.rejectContent(queueId, moderatorId, reason)).rejects.toThrow(
        'Queue entry not found',
      );
    });
  });

  describe('escalate', () => {
    it('should update status to ESCALATED with reason', async () => {
      const queueId = 'queue-entry-1';
      const reason = 'This content requires senior moderator review due to complex policy issues';

      const mockQueueEntry = {
        id: queueId,
        responseId: 'response-123',
        topicId: 'topic-456',
        authorId: 'author-789',
        content: 'Complex content',
        status: 'IN_REVIEW',
        priority: 'HIGH',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedEntry = {
        ...mockQueueEntry,
        status: 'ESCALATED',
        rejectionReason: reason,
      };

      prismaService.childContentReviewQueue.findUnique.mockResolvedValue(mockQueueEntry);
      prismaService.childContentReviewQueue.update.mockResolvedValue(updatedEntry);

      await service.escalate(queueId, reason);

      expect(prismaService.childContentReviewQueue.update).toHaveBeenCalledWith({
        where: { id: queueId },
        data: {
          status: 'ESCALATED',
          rejectionReason: reason,
        },
      });
    });

    it('should throw error if queue entry not found', async () => {
      const queueId = 'non-existent';
      const reason = 'Escalation reason';

      prismaService.childContentReviewQueue.findUnique.mockResolvedValue(null);

      await expect(service.escalate(queueId, reason)).rejects.toThrow('Queue entry not found');
    });
  });

  describe('getQueueStats', () => {
    it('should return counts by status and priority', async () => {
      // Mock groupBy for status counts
      prismaService.childContentReviewQueue.groupBy.mockResolvedValueOnce([
        { status: 'PENDING', _count: { _all: 10 } },
        { status: 'IN_REVIEW', _count: { _all: 5 } },
        { status: 'APPROVED', _count: { _all: 50 } },
        { status: 'REJECTED', _count: { _all: 8 } },
        { status: 'ESCALATED', _count: { _all: 2 } },
      ]);

      // Mock groupBy for priority counts
      prismaService.childContentReviewQueue.groupBy.mockResolvedValueOnce([
        { priority: 'LOW', _count: { _all: 5 } },
        { priority: 'NORMAL', _count: { _all: 40 } },
        { priority: 'HIGH', _count: { _all: 20 } },
        { priority: 'URGENT', _count: { _all: 10 } },
      ]);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        byStatus: {
          PENDING: 10,
          IN_REVIEW: 5,
          APPROVED: 50,
          REJECTED: 8,
          ESCALATED: 2,
        },
        byPriority: {
          LOW: 5,
          NORMAL: 40,
          HIGH: 20,
          URGENT: 10,
        },
        total: 75,
        pendingCount: 15, // PENDING + IN_REVIEW
        urgentCount: 10,
      });
    });

    it('should handle empty queue', async () => {
      prismaService.childContentReviewQueue.groupBy.mockResolvedValueOnce([]);
      prismaService.childContentReviewQueue.groupBy.mockResolvedValueOnce([]);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        byStatus: {},
        byPriority: {},
        total: 0,
        pendingCount: 0,
        urgentCount: 0,
      });
    });
  });

  describe('getPendingItems', () => {
    it('should return items ordered by priority (URGENT first) then creation time', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);
      const evenEarlier = new Date(now.getTime() - 120000);

      const mockItems = [
        {
          id: 'queue-1',
          responseId: 'response-1',
          topicId: 'topic-1',
          authorId: 'author-1',
          content: 'Normal priority older',
          status: 'PENDING',
          priority: 'NORMAL',
          aiFlags: null,
          createdAt: evenEarlier,
          updatedAt: evenEarlier,
        },
        {
          id: 'queue-2',
          responseId: 'response-2',
          topicId: 'topic-1',
          authorId: 'author-2',
          content: 'Urgent priority',
          status: 'PENDING',
          priority: 'URGENT',
          aiFlags: { grooming: true },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'queue-3',
          responseId: 'response-3',
          topicId: 'topic-2',
          authorId: 'author-3',
          content: 'High priority',
          status: 'PENDING',
          priority: 'HIGH',
          aiFlags: { inappropriate: true },
          createdAt: earlier,
          updatedAt: earlier,
        },
      ];

      prismaService.childContentReviewQueue.findMany.mockResolvedValue(mockItems);

      const items = await service.getPendingItems();

      expect(prismaService.childContentReviewQueue.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        orderBy: [
          {
            priority: 'desc',
          },
          { createdAt: 'asc' },
        ],
        take: 20,
      });

      expect(items).toHaveLength(3);
    });

    it('should respect the limit parameter', async () => {
      prismaService.childContentReviewQueue.findMany.mockResolvedValue([]);

      await service.getPendingItems(5);

      expect(prismaService.childContentReviewQueue.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        orderBy: [
          {
            priority: 'desc',
          },
          { createdAt: 'asc' },
        ],
        take: 5,
      });
    });

    it('should return empty array when no pending items', async () => {
      prismaService.childContentReviewQueue.findMany.mockResolvedValue([]);

      const items = await service.getPendingItems();

      expect(items).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in queueForReview', async () => {
      prismaService.childContentReviewQueue.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.queueForReview('response-1', 'topic-1', 'author-1', 'content'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors gracefully in getQueueStats', async () => {
      prismaService.childContentReviewQueue.groupBy.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.getQueueStats()).rejects.toThrow('Database connection failed');
    });
  });

  describe('URGENT Escalation Notifications', () => {
    it('should trigger moderator notification when URGENT item is queued', async () => {
      const responseId = 'response-urgent-1';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'Content with grooming patterns';
      const aiFlags = {
        grooming: true,
        groomingConfidence: 0.95,
        groomingPatternType: 'isolation_attempt',
        recommendedAction: 'BLOCK' as const,
      };

      const mockQueueEntry = {
        id: 'queue-entry-urgent',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'URGENT',
        aiFlags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      // Spy on the notification method
      const notifySpy = vi.spyOn(service as any, 'notifyModeratorsOfUrgent');

      await service.queueForReview(responseId, topicId, authorId, content, aiFlags);

      // Verify notification was called with correct data
      expect(notifySpy).toHaveBeenCalledWith({
        responseId,
        topicId,
        content,
        aiFlags,
      });
    });

    it('should NOT trigger moderator notification for non-URGENT items', async () => {
      const responseId = 'response-normal-1';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'Safe content without flags';

      const mockQueueEntry = {
        id: 'queue-entry-normal',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'NORMAL',
        aiFlags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      // Spy on the notification method
      const notifySpy = vi.spyOn(service as any, 'notifyModeratorsOfUrgent');

      await service.queueForReview(responseId, topicId, authorId, content);

      // Verify notification was NOT called
      expect(notifySpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger notification for HIGH priority items (only URGENT)', async () => {
      const responseId = 'response-high-1';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'Content with inappropriate flag';
      const aiFlags = { inappropriate: true, confidence: 0.7 };

      const mockQueueEntry = {
        id: 'queue-entry-high',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'HIGH',
        aiFlags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      // Spy on the notification method
      const notifySpy = vi.spyOn(service as any, 'notifyModeratorsOfUrgent');

      await service.queueForReview(responseId, topicId, authorId, content, aiFlags);

      // Verify notification was NOT called (HIGH is not URGENT)
      expect(notifySpy).not.toHaveBeenCalled();
    });

    it('should include grooming metadata in notification', async () => {
      const responseId = 'response-urgent-2';
      const topicId = 'topic-child-123';
      const authorId = 'author-suspicious';
      const content = "Don't tell your parents about this";
      const aiFlags = {
        grooming: true,
        groomingConfidence: 0.88,
        groomingPatternType: 'secrecy_request',
        recommendedAction: 'REVIEW' as const,
      };

      const mockQueueEntry = {
        id: 'queue-entry-urgent-2',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'URGENT',
        aiFlags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      // Spy on the notification method to verify what was passed
      const notifySpy = vi.spyOn(service as any, 'notifyModeratorsOfUrgent');

      await service.queueForReview(responseId, topicId, authorId, content, aiFlags);

      // Verify notification includes the grooming metadata
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          responseId,
          topicId,
          content,
          aiFlags: expect.objectContaining({
            grooming: true,
            groomingConfidence: 0.88,
            groomingPatternType: 'secrecy_request',
          }),
        }),
      );
    });

    it('should handle notification errors gracefully without failing queue creation', async () => {
      const responseId = 'response-urgent-3';
      const topicId = 'topic-456';
      const authorId = 'author-789';
      const content = 'Content triggering grooming detection';
      const aiFlags = { grooming: true, groomingConfidence: 0.9 };

      const mockQueueEntry = {
        id: 'queue-entry-urgent-3',
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority: 'URGENT',
        aiFlags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.childContentReviewQueue.create.mockResolvedValue(mockQueueEntry);

      // Make notification throw an error
      vi.spyOn(service as any, 'notifyModeratorsOfUrgent').mockRejectedValue(
        new Error('Notification service unavailable'),
      );

      // Queue creation should still succeed even if notification fails
      await expect(
        service.queueForReview(responseId, topicId, authorId, content, aiFlags),
      ).resolves.not.toThrow();

      // Verify the queue entry was still created
      expect(prismaService.childContentReviewQueue.create).toHaveBeenCalled();
    });
  });
});
