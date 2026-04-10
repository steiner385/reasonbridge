/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { TopicLinksService } from './topic-links.service.js';
import { TopicRelationshipType, LinkSource, ConfirmationStatus } from './dto/topic-link.dto.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
  topicLink: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  slug: 'test-topic',
  ...overrides,
});

const createMockLink = (overrides = {}) => ({
  id: 'link-1',
  sourceTopicId: 'topic-1',
  targetTopicId: 'topic-2',
  relationshipType: TopicRelationshipType.RELATED,
  linkSource: LinkSource.USER_PROPOSED,
  confirmationStatus: ConfirmationStatus.PENDING,
  proposerId: 'user-1',
  confirmedByCount: 0,
  rejectedByCount: 0,
  createdAt: new Date('2026-02-11'),
  sourceTopic: createMockTopic({ id: 'topic-1', title: 'Source Topic', slug: 'source-topic' }),
  targetTopic: createMockTopic({ id: 'topic-2', title: 'Target Topic', slug: 'target-topic' }),
  ...overrides,
});

describe('TopicLinksService', () => {
  let service: TopicLinksService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TopicLinksService(mockPrisma as any);
  });

  describe('createLink', () => {
    it('should create a new topic link', async () => {
      const sourceTopic = createMockTopic({ id: 'topic-1' });
      const targetTopic = createMockTopic({ id: 'topic-2' });
      const createdLink = createMockLink();

      mockPrisma.discussionTopic.findUnique
        .mockResolvedValueOnce(sourceTopic)
        .mockResolvedValueOnce(targetTopic);
      mockPrisma.topicLink.findFirst.mockResolvedValue(null);
      mockPrisma.topicLink.create.mockResolvedValue(createdLink);

      const result = await service.createLink(
        'topic-1',
        {
          targetTopicId: 'topic-2',
          relationshipType: TopicRelationshipType.RELATED,
        },
        'user-1',
      );

      expect(result.id).toBe('link-1');
      expect(result.sourceTopicId).toBe('topic-1');
      expect(result.targetTopicId).toBe('topic-2');
      expect(result.relationshipType).toBe(TopicRelationshipType.RELATED);
      expect(mockPrisma.topicLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceTopicId: 'topic-1',
            targetTopicId: 'topic-2',
            relationshipType: TopicRelationshipType.RELATED,
            linkSource: LinkSource.USER_PROPOSED,
            proposerId: 'user-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when source topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.createLink(
          'nonexistent-topic',
          {
            targetTopicId: 'topic-2',
            relationshipType: TopicRelationshipType.RELATED,
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target topic does not exist', async () => {
      const sourceTopic = createMockTopic({ id: 'topic-1' });
      mockPrisma.discussionTopic.findUnique
        .mockResolvedValueOnce(sourceTopic)
        .mockResolvedValueOnce(null);

      await expect(
        service.createLink(
          'topic-1',
          {
            targetTopicId: 'nonexistent-topic',
            relationshipType: TopicRelationshipType.RELATED,
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when linking topic to itself', async () => {
      const topic = createMockTopic({ id: 'topic-1' });
      mockPrisma.discussionTopic.findUnique
        .mockResolvedValueOnce(topic)
        .mockResolvedValueOnce(topic);

      await expect(
        service.createLink(
          'topic-1',
          {
            targetTopicId: 'topic-1',
            relationshipType: TopicRelationshipType.RELATED,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when link already exists', async () => {
      const sourceTopic = createMockTopic({ id: 'topic-1' });
      const targetTopic = createMockTopic({ id: 'topic-2' });
      const existingLink = createMockLink();

      mockPrisma.discussionTopic.findUnique
        .mockResolvedValueOnce(sourceTopic)
        .mockResolvedValueOnce(targetTopic);
      mockPrisma.topicLink.findFirst.mockResolvedValue(existingLink);

      await expect(
        service.createLink(
          'topic-1',
          {
            targetTopicId: 'topic-2',
            relationshipType: TopicRelationshipType.RELATED,
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getLinksForTopic', () => {
    it('should return all links for a topic', async () => {
      const links = [createMockLink(), createMockLink({ id: 'link-2' })];
      mockPrisma.topicLink.findMany.mockResolvedValue(links);

      const result = await service.getLinksForTopic('topic-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.topicLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ sourceTopicId: 'topic-1' }, { targetTopicId: 'topic-1' }],
          },
        }),
      );
    });

    it('should filter by relationship type', async () => {
      mockPrisma.topicLink.findMany.mockResolvedValue([]);

      await service.getLinksForTopic('topic-1', {
        relationshipType: TopicRelationshipType.BUILDS_ON,
      });

      expect(mockPrisma.topicLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relationshipType: TopicRelationshipType.BUILDS_ON,
          }),
        }),
      );
    });

    it('should filter by confirmation status', async () => {
      mockPrisma.topicLink.findMany.mockResolvedValue([]);

      await service.getLinksForTopic('topic-1', {
        status: ConfirmationStatus.CONFIRMED,
      });

      expect(mockPrisma.topicLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confirmationStatus: ConfirmationStatus.CONFIRMED,
          }),
        }),
      );
    });
  });

  describe('getLinkedTopics', () => {
    it('should return linked topics with simplified view', async () => {
      const links = [createMockLink()];
      mockPrisma.topicLink.findMany.mockResolvedValue(links);

      const result = await service.getLinkedTopics('topic-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'topic-2',
        title: 'Target Topic',
        slug: 'target-topic',
        relationshipType: TopicRelationshipType.RELATED,
        linkId: 'link-1',
      });
    });

    it('should return source topic when queried from target side', async () => {
      const links = [createMockLink()];
      mockPrisma.topicLink.findMany.mockResolvedValue(links);

      const result = await service.getLinkedTopics('topic-2');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'topic-1',
        title: 'Source Topic',
        slug: 'source-topic',
      });
    });

    it('should filter confirmed links by default', async () => {
      mockPrisma.topicLink.findMany.mockResolvedValue([]);

      await service.getLinkedTopics('topic-1');

      expect(mockPrisma.topicLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confirmationStatus: ConfirmationStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('should include all links when confirmedOnly is false', async () => {
      mockPrisma.topicLink.findMany.mockResolvedValue([]);

      await service.getLinkedTopics('topic-1', false);

      expect(mockPrisma.topicLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            confirmationStatus: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('findLinkById', () => {
    it('should return a link by ID', async () => {
      const link = createMockLink();
      mockPrisma.topicLink.findUnique.mockResolvedValue(link);

      const result = await service.findLinkById('link-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('link-1');
    });

    it('should return null when link does not exist', async () => {
      mockPrisma.topicLink.findUnique.mockResolvedValue(null);

      const result = await service.findLinkById('nonexistent-link');

      expect(result).toBeNull();
    });
  });

  describe('updateLinkStatus', () => {
    it('should update link status to CONFIRMED', async () => {
      const existingLink = createMockLink();
      const updatedLink = createMockLink({
        confirmationStatus: ConfirmationStatus.CONFIRMED,
        confirmedByCount: 1,
      });

      mockPrisma.topicLink.findUnique.mockResolvedValue(existingLink);
      mockPrisma.topicLink.update.mockResolvedValue(updatedLink);

      const result = await service.updateLinkStatus(
        'link-1',
        { status: ConfirmationStatus.CONFIRMED },
        'user-1',
      );

      expect(result.confirmationStatus).toBe(ConfirmationStatus.CONFIRMED);
      expect(mockPrisma.topicLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confirmationStatus: ConfirmationStatus.CONFIRMED,
            confirmedByCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should update link status to REJECTED', async () => {
      const existingLink = createMockLink();
      const updatedLink = createMockLink({
        confirmationStatus: ConfirmationStatus.REJECTED,
        rejectedByCount: 1,
      });

      mockPrisma.topicLink.findUnique.mockResolvedValue(existingLink);
      mockPrisma.topicLink.update.mockResolvedValue(updatedLink);

      const result = await service.updateLinkStatus(
        'link-1',
        { status: ConfirmationStatus.REJECTED },
        'user-1',
      );

      expect(result.confirmationStatus).toBe(ConfirmationStatus.REJECTED);
      expect(mockPrisma.topicLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confirmationStatus: ConfirmationStatus.REJECTED,
            rejectedByCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should throw NotFoundException when link does not exist', async () => {
      mockPrisma.topicLink.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLinkStatus(
          'nonexistent-link',
          { status: ConfirmationStatus.CONFIRMED },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteLink', () => {
    it('should delete a link', async () => {
      const link = createMockLink();
      mockPrisma.topicLink.findUnique.mockResolvedValue(link);
      mockPrisma.topicLink.delete.mockResolvedValue(link);

      const result = await service.deleteLink('link-1');

      expect(result.id).toBe('link-1');
      expect(mockPrisma.topicLink.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
    });

    it('should throw NotFoundException when link does not exist', async () => {
      mockPrisma.topicLink.findUnique.mockResolvedValue(null);

      await expect(service.deleteLink('nonexistent-link')).rejects.toThrow(NotFoundException);
    });
  });
});
