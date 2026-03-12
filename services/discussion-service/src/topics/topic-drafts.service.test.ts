/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { TopicDraftsService } from './topic-drafts.service.js';

const createMockPrismaService = () => ({
  topicDraft: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
});

const createMockDraft = (overrides = {}) => ({
  id: 'draft-1',
  userId: 'user-1',
  title: 'Draft Title',
  description: 'Draft description',
  tags: ['tag1', 'tag2'],
  visibility: 'PUBLIC',
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
  createdAt: new Date('2026-02-10'),
  updatedAt: new Date('2026-02-10'),
  expiresAt: new Date('2099-12-31'), // Far future to avoid expiration during tests
  ...overrides,
});

describe('TopicDraftsService', () => {
  let service: TopicDraftsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TopicDraftsService(mockPrisma as any);
  });

  describe('saveDraft', () => {
    it('should create a new draft when no id provided', async () => {
      const dto = {
        title: 'New Draft',
        description: 'New description',
        tags: ['tag1'],
      };
      const createdDraft = createMockDraft({ ...dto, id: 'new-draft-id' });
      mockPrisma.topicDraft.create.mockResolvedValue(createdDraft);

      const result = await service.saveDraft('user-1', dto);

      expect(result.id).toBe('new-draft-id');
      expect(result.title).toBe('New Draft');
      expect(mockPrisma.topicDraft.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            title: 'New Draft',
            description: 'New description',
            tags: ['tag1'],
          }),
        }),
      );
    });

    it('should update existing draft when id provided', async () => {
      const existingDraft = createMockDraft();
      const dto = {
        id: 'draft-1',
        title: 'Updated Title',
      };
      mockPrisma.topicDraft.findUnique.mockResolvedValue(existingDraft);
      mockPrisma.topicDraft.update.mockResolvedValue({
        ...existingDraft,
        title: 'Updated Title',
      });

      const result = await service.saveDraft('user-1', dto);

      expect(result.title).toBe('Updated Title');
      expect(mockPrisma.topicDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-1' },
          data: expect.objectContaining({
            title: 'Updated Title',
          }),
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent draft', async () => {
      mockPrisma.topicDraft.findUnique.mockResolvedValue(null);

      await expect(service.saveDraft('user-1', { id: 'non-existent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when updating another user draft', async () => {
      const existingDraft = createMockDraft({ userId: 'other-user' });
      mockPrisma.topicDraft.findUnique.mockResolvedValue(existingDraft);

      await expect(service.saveDraft('user-1', { id: 'draft-1', title: 'Hack' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should use default values when optional fields not provided', async () => {
      const createdDraft = createMockDraft({
        title: '',
        description: '',
        tags: [],
        visibility: 'PUBLIC',
        evidenceStandards: 'STANDARD',
        isMatureContent: false,
      });
      mockPrisma.topicDraft.create.mockResolvedValue(createdDraft);

      await service.saveDraft('user-1', {});

      expect(mockPrisma.topicDraft.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '',
            description: '',
            tags: [],
            visibility: 'PUBLIC',
            evidenceStandards: 'STANDARD',
            isMatureContent: false,
          }),
        }),
      );
    });
  });

  describe('getDrafts', () => {
    it('should return all non-expired drafts for user', async () => {
      const drafts = [createMockDraft(), createMockDraft({ id: 'draft-2' })];
      mockPrisma.topicDraft.findMany.mockResolvedValue(drafts);

      const result = await service.getDrafts('user-1');

      expect(result.drafts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrisma.topicDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('should return empty list when user has no drafts', async () => {
      mockPrisma.topicDraft.findMany.mockResolvedValue([]);

      const result = await service.getDrafts('user-1');

      expect(result.drafts).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getDraft', () => {
    it('should return draft by id', async () => {
      const draft = createMockDraft();
      mockPrisma.topicDraft.findUnique.mockResolvedValue(draft);

      const result = await service.getDraft('user-1', 'draft-1');

      expect(result.id).toBe('draft-1');
      expect(result.title).toBe('Draft Title');
    });

    it('should throw NotFoundException when draft not found', async () => {
      mockPrisma.topicDraft.findUnique.mockResolvedValue(null);

      await expect(service.getDraft('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing another user draft', async () => {
      const draft = createMockDraft({ userId: 'other-user' });
      mockPrisma.topicDraft.findUnique.mockResolvedValue(draft);

      await expect(service.getDraft('user-1', 'draft-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when draft is expired', async () => {
      const expiredDraft = createMockDraft({
        expiresAt: new Date('2020-01-01'), // Past date
      });
      mockPrisma.topicDraft.findUnique.mockResolvedValue(expiredDraft);

      await expect(service.getDraft('user-1', 'draft-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDraft', () => {
    it('should delete draft successfully', async () => {
      const draft = createMockDraft();
      mockPrisma.topicDraft.findUnique.mockResolvedValue(draft);
      mockPrisma.topicDraft.delete.mockResolvedValue(draft);

      await service.deleteDraft('user-1', 'draft-1');

      expect(mockPrisma.topicDraft.delete).toHaveBeenCalledWith({
        where: { id: 'draft-1' },
      });
    });

    it('should throw NotFoundException when draft not found', async () => {
      mockPrisma.topicDraft.findUnique.mockResolvedValue(null);

      await expect(service.deleteDraft('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when deleting another user draft', async () => {
      const draft = createMockDraft({ userId: 'other-user' });
      mockPrisma.topicDraft.findUnique.mockResolvedValue(draft);

      await expect(service.deleteDraft('user-1', 'draft-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cleanupExpiredDrafts', () => {
    it('should delete expired drafts and return count', async () => {
      mockPrisma.topicDraft.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredDrafts();

      expect(result).toBe(5);
      expect(mockPrisma.topicDraft.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should return 0 when no expired drafts', async () => {
      mockPrisma.topicDraft.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpiredDrafts();

      expect(result).toBe(0);
    });
  });
});
