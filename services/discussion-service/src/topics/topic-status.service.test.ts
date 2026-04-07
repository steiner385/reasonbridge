/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TopicStatusService } from './topic-status.service.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

const createMockCacheManager = () => ({
  del: vi.fn(),
  stores: { keys: vi.fn().mockResolvedValue([]) },
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
  createdAt: new Date(),
  activatedAt: new Date(),
  archivedAt: null,
  lockedAt: null,
  minimumDiversityScore: { toNumber: () => 0.5 },
  currentDiversityScore: { toNumber: () => 0.6 },
  crossCuttingThemes: [],
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
  ...overrides,
});

describe('TopicStatusService', () => {
  let service: TopicStatusService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCacheManager = createMockCacheManager();
    service = new TopicStatusService(mockPrisma as any, mockCacheManager as any);
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException when topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'user-1', 'ARCHIVED', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when non-creator/non-moderator tries to change status', async () => {
      const topic = createMockTopic({ creatorId: 'other-user' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.updateStatus('topic-1', 'user-1', 'ARCHIVED', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when creator tries to lock topic', async () => {
      const topic = createMockTopic({ creatorId: 'user-1' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.updateStatus('topic-1', 'user-1', 'LOCKED', false)).rejects.toThrow(
        'Only moderators can lock topics',
      );
    });

    it('should throw BadRequestException when creator tries to unlock locked topic', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'LOCKED' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.updateStatus('topic-1', 'user-1', 'ACTIVE', false)).rejects.toThrow(
        'Only moderators can unlock locked topics',
      );
    });

    it('should throw BadRequestException when creator tries to revert to SEEDING', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'ACTIVE' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.updateStatus('topic-1', 'user-1', 'SEEDING', false)).rejects.toThrow(
        'Cannot revert an activated topic to SEEDING status',
      );
    });

    it('should allow creator to archive their own topic', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'ACTIVE' });
      const updatedTopic = { ...topic, status: 'ARCHIVED', archivedAt: new Date() };

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      const result = await service.updateStatus('topic-1', 'user-1', 'ARCHIVED', false);

      expect(result.status).toBe('ARCHIVED');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalled();
    });

    it('should allow moderator to lock any topic', async () => {
      const topic = createMockTopic({ creatorId: 'other-user', status: 'ACTIVE' });
      const updatedTopic = { ...topic, status: 'LOCKED', lockedAt: new Date() };

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      const result = await service.updateStatus('topic-1', 'mod-1', 'LOCKED', true);

      expect(result.status).toBe('LOCKED');
    });

    it('should set activatedAt when transitioning to ACTIVE for first time', async () => {
      const topic = createMockTopic({
        creatorId: 'user-1',
        status: 'SEEDING',
        activatedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockImplementation(async ({ data }) => ({
        ...topic,
        ...data,
        status: 'ACTIVE',
      }));

      await service.updateStatus('topic-1', 'user-1', 'ACTIVE', false);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set archivedAt when archiving topic', async () => {
      const topic = createMockTopic({
        creatorId: 'user-1',
        status: 'ACTIVE',
        archivedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockImplementation(async ({ data }) => ({
        ...topic,
        ...data,
        status: 'ARCHIVED',
      }));

      await service.updateStatus('topic-1', 'user-1', 'ARCHIVED', false);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            archivedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should clear archivedAt when unarchiving topic', async () => {
      const topic = createMockTopic({
        creatorId: 'user-1',
        status: 'ARCHIVED',
        archivedAt: new Date(),
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockImplementation(async ({ data }) => ({
        ...topic,
        ...data,
        status: 'ACTIVE',
      }));

      await service.updateStatus('topic-1', 'user-1', 'ACTIVE', false);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            archivedAt: null,
          }),
        }),
      );
    });

    it('should set lockedAt when locking topic', async () => {
      const topic = createMockTopic({
        creatorId: 'other-user',
        status: 'ACTIVE',
        lockedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockImplementation(async ({ data }) => ({
        ...topic,
        ...data,
        status: 'LOCKED',
      }));

      await service.updateStatus('topic-1', 'mod-1', 'LOCKED', true);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lockedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should clear lockedAt when unlocking topic', async () => {
      const topic = createMockTopic({
        creatorId: 'other-user',
        status: 'LOCKED',
        lockedAt: new Date(),
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockImplementation(async ({ data }) => ({
        ...topic,
        ...data,
        status: 'ACTIVE',
      }));

      await service.updateStatus('topic-1', 'mod-1', 'ACTIVE', true);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lockedAt: null,
          }),
        }),
      );
    });

    it('should invalidate caches after status update', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'ACTIVE' });
      const updatedTopic = { ...topic, status: 'ARCHIVED', archivedAt: new Date() };

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      await service.updateStatus('topic-1', 'user-1', 'ARCHIVED', false);

      expect(mockCacheManager.del).toHaveBeenCalledWith('topics:list');
    });
  });
});
