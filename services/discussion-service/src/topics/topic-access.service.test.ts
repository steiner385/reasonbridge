/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { TopicAccessService } from './topic-access.service.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
  topicAccess: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  visibility: 'PRIVATE',
  creatorId: 'creator-1',
  ...overrides,
});

const createMockAccess = (overrides = {}) => ({
  id: 'access-1',
  topicId: 'topic-1',
  userId: 'user-1',
  grantedBy: 'inviter-1',
  grantedAt: new Date(),
  source: 'INVITATION',
  invitationId: 'inv-1',
  ...overrides,
});

describe('TopicAccessService', () => {
  let service: TopicAccessService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TopicAccessService(mockPrisma as any);
  });

  describe('grantAccess', () => {
    it('should grant access to a user for a private topic', async () => {
      const topic = createMockTopic();
      const access = createMockAccess({ grantedAt: new Date() });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.topicAccess.upsert.mockResolvedValue(access);

      const result = await service.grantAccess(
        'topic-1',
        'user-1',
        'inviter-1',
        'INVITATION',
        'inv-1',
      );

      expect(result.success).toBe(true);
      expect(result.accessId).toBe('access-1');
      expect(mockPrisma.topicAccess.upsert).toHaveBeenCalledWith({
        where: {
          topicId_userId: { topicId: 'topic-1', userId: 'user-1' },
        },
        create: {
          topicId: 'topic-1',
          userId: 'user-1',
          grantedBy: 'inviter-1',
          source: 'INVITATION',
          invitationId: 'inv-1',
        },
        update: {},
      });
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.grantAccess('nonexistent-topic', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should indicate when access was already granted', async () => {
      const topic = createMockTopic();
      // Access granted long ago (more than 1 second)
      const access = createMockAccess({
        grantedAt: new Date(Date.now() - 10000),
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.topicAccess.upsert.mockResolvedValue(access);

      const result = await service.grantAccess('topic-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.alreadyGranted).toBe(true);
    });
  });

  describe('checkAccess', () => {
    it('should return true for public topics', async () => {
      const topic = createMockTopic({ visibility: 'PUBLIC' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      const result = await service.checkAccess('topic-1', 'any-user');

      expect(result.canAccess).toBe(true);
      expect(result.reason).toBe('public');
    });

    it('should return true for topic creator', async () => {
      const topic = createMockTopic({ creatorId: 'user-1' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      const result = await service.checkAccess('topic-1', 'user-1');

      expect(result.canAccess).toBe(true);
      expect(result.reason).toBe('creator');
    });

    it('should return true for users with explicit access grant', async () => {
      const topic = createMockTopic();
      const access = createMockAccess();

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.topicAccess.findUnique.mockResolvedValue(access);

      const result = await service.checkAccess('topic-1', 'user-1');

      expect(result.canAccess).toBe(true);
      expect(result.reason).toBe('explicit_grant');
    });

    it('should return false for users without access to private topics', async () => {
      const topic = createMockTopic();

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.topicAccess.findUnique.mockResolvedValue(null);

      const result = await service.checkAccess('topic-1', 'random-user');

      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe('denied');
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.checkAccess('nonexistent-topic', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revokeAccess', () => {
    it('should revoke access and return true', async () => {
      mockPrisma.topicAccess.delete.mockResolvedValue(createMockAccess());

      const result = await service.revokeAccess('topic-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrisma.topicAccess.delete).toHaveBeenCalledWith({
        where: {
          topicId_userId: { topicId: 'topic-1', userId: 'user-1' },
        },
      });
    });

    it('should return false when access did not exist', async () => {
      mockPrisma.topicAccess.delete.mockRejectedValue({ code: 'P2025' });

      const result = await service.revokeAccess('topic-1', 'nonexistent-user');

      expect(result).toBe(false);
    });
  });

  describe('listTopicAccess', () => {
    it('should list all users with access to a topic', async () => {
      const accessList = [
        createMockAccess({ userId: 'user-1' }),
        createMockAccess({ userId: 'user-2', id: 'access-2' }),
      ];

      mockPrisma.topicAccess.findMany.mockResolvedValue(accessList);

      const result = await service.listTopicAccess('topic-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.topicAccess.findMany).toHaveBeenCalledWith({
        where: { topicId: 'topic-1' },
        orderBy: { grantedAt: 'desc' },
      });
    });
  });
});
