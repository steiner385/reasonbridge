/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TopicMergeService } from './topic-merge.service.js';

const createMockPrismaService = () => ({
  $transaction: vi.fn(),
  discussionTopic: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  response: {
    updateMany: vi.fn(),
  },
  topicMerge: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'Test description',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  slug: 'test-topic',
  creatorId: 'creator-1',
  participantCount: 5,
  responseCount: 10,
  tags: [],
  responses: [{ id: 'r-1', authorId: 'user-1' }],
  createdAt: new Date(),
  ...overrides,
});

describe('TopicMergeService', () => {
  let service: TopicMergeService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TopicMergeService(mockPrisma as any);
  });

  describe('mergeTopics', () => {
    it('should throw BadRequestException when target is in source list', async () => {
      await expect(
        service.mergeTopics('mod-1', {
          sourceTopicIds: ['topic-1', 'topic-2'],
          targetTopicId: 'topic-1',
          mergeReason: 'Duplicate topics',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when topics do not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          discussionTopic: {
            findMany: vi.fn().mockResolvedValue([createMockTopic({ id: 'topic-1' })]),
          },
        };
        return callback(tx);
      });

      await expect(
        service.mergeTopics('mod-1', {
          sourceTopicIds: ['topic-1'],
          targetTopicId: 'topic-2',
          mergeReason: 'Duplicate topics',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when source topics are locked', async () => {
      const lockedTopic = createMockTopic({ id: 'topic-1', status: 'LOCKED' });
      const targetTopic = createMockTopic({ id: 'topic-2' });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          discussionTopic: {
            findMany: vi.fn().mockResolvedValue([lockedTopic, targetTopic]),
            update: vi.fn(),
          },
          response: { updateMany: vi.fn() },
          topicMerge: { create: vi.fn() },
        };
        return callback(tx);
      });

      await expect(
        service.mergeTopics('mod-1', {
          sourceTopicIds: ['topic-1'],
          targetTopicId: 'topic-2',
          mergeReason: 'Duplicate topics',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully merge topics and return merge details', async () => {
      const sourceTopic = createMockTopic({
        id: 'source-1',
        title: 'Source Topic',
        description: 'Source description',
        responseCount: 5,
        responses: [{ id: 'r-1', authorId: 'user-1' }],
        tags: [{ tag: { id: 'tag-1', name: 'test' } }],
      });
      const targetTopic = createMockTopic({
        id: 'target-1',
        title: 'Target Topic',
        slug: 'target-topic',
        responseCount: 10,
        participantCount: 3,
        responses: [{ id: 'r-2', authorId: 'user-2' }],
        tags: [],
      });
      const mockMergeRecord = { id: 'merge-1' };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          discussionTopic: {
            findMany: vi.fn().mockResolvedValue([sourceTopic, targetTopic]),
            update: vi.fn().mockResolvedValue(targetTopic),
          },
          response: { updateMany: vi.fn().mockResolvedValue({ count: 5 }) },
          topicMerge: { create: vi.fn().mockResolvedValue(mockMergeRecord) },
        };
        return callback(tx);
      });

      const result = await service.mergeTopics('mod-1', {
        sourceTopicIds: ['source-1'],
        targetTopicId: 'target-1',
        mergeReason: 'These topics are duplicates',
      });

      expect(result.mergeId).toBe('merge-1');
      expect(result.responsesMoved).toBe(5);
      expect(result.participantsMerged).toBe(1);
    });
  });

  describe('rollbackTopicMerge', () => {
    it('should throw NotFoundException when merge record does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: { findUnique: vi.fn().mockResolvedValue(null) },
        };
        return callback(tx);
      });

      await expect(
        service.rollbackTopicMerge('mod-1', 'nonexistent-merge', 'Mistake'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when merge already rolled back', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'merge-1',
              rolledBackAt: new Date(),
            }),
          },
        };
        return callback(tx);
      });

      await expect(service.rollbackTopicMerge('mod-1', 'merge-1', 'Mistake')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when 30-day rollback window expired', async () => {
      const oldMerge = {
        id: 'merge-1',
        mergedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        rolledBackAt: null,
        sourceTopicIds: ['topic-1'],
        targetTopicId: 'topic-2',
        sourceSnapshots: [],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: { findUnique: vi.fn().mockResolvedValue(oldMerge) },
        };
        return callback(tx);
      });

      await expect(service.rollbackTopicMerge('mod-1', 'merge-1', 'Mistake')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully rollback a merge within the 30-day window', async () => {
      const recentMerge = {
        id: 'merge-1',
        mergedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        rolledBackAt: null,
        sourceTopicIds: ['source-1'],
        targetTopicId: 'target-1',
        sourceSnapshots: [
          {
            id: 'source-1',
            description: 'Original description',
          },
        ],
      };

      const mockTopicMergeUpdate = vi.fn().mockResolvedValue({});
      const mockResponseUpdate = vi.fn().mockResolvedValue({ count: 5 });
      const mockTopicUpdate = vi.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: {
            findUnique: vi.fn().mockResolvedValue(recentMerge),
            update: mockTopicMergeUpdate,
          },
          response: { updateMany: mockResponseUpdate },
          discussionTopic: { update: mockTopicUpdate },
        };
        return callback(tx);
      });

      await service.rollbackTopicMerge('mod-1', 'merge-1', 'Incorrect merge');

      // Verify the transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
