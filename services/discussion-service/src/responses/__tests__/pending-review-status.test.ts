/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for PENDING_REVIEW response status (Child-Friendly Mode Phase 2)
 *
 * Tests the content moderation workflow for child users:
 * - Minor authors get PENDING_REVIEW status on responses
 * - Adult authors get VISIBLE status on responses
 * - PENDING_REVIEW responses are filtered by default
 * - Moderators can include PENDING_REVIEW responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponsesService } from '../responses.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ResponsesService - PENDING_REVIEW Status', () => {
  let service: ResponsesService;
  let mockPrisma: any;
  let mockCommonGroundTrigger: any;
  let mockModerationClient: any;

  beforeEach(() => {
    // Mock Prisma service
    mockPrisma = {
      discussionTopic: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      response: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      responseProposition: {
        createMany: vi.fn(),
      },
      discussion: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((fn) => fn(mockPrisma)),
      participantActivity: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(1),
      },
      citation: {
        createMany: vi.fn(),
      },
    };

    // Mock common ground trigger service
    mockCommonGroundTrigger = {
      checkAndTrigger: vi.fn().mockResolvedValue(undefined),
    };

    // Mock moderation client service
    mockModerationClient = {
      screenContentForChildren: vi.fn().mockResolvedValue({ childSafetyRisk: 'none' }),
      queueChildContent: vi.fn().mockResolvedValue(undefined),
    };

    service = new ResponsesService(mockPrisma, mockCommonGroundTrigger, mockModerationClient);
  });

  describe('createResponse - Status based on author type', () => {
    const topicId = 'topic-123';
    const createDto = {
      content: 'This is a valid response with sufficient length for testing.',
    };

    beforeEach(() => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: topicId,
        status: 'ACTIVE',
      });
      mockPrisma.discussionTopic.update.mockResolvedValue({});
    });

    it('should set PENDING_REVIEW status for minor authors', async () => {
      const minorAuthorId = 'minor-user-123';

      // Mock user as minor
      mockPrisma.user.findUnique.mockResolvedValue({ isMinor: true });

      // Mock response creation to capture the status
      let capturedStatus: string | undefined;
      mockPrisma.response.create.mockImplementation(({ data }: any) => {
        capturedStatus = data.status;
        return Promise.resolve({
          id: 'response-123',
          topicId,
          authorId: minorAuthorId,
          content: createDto.content,
          status: data.status,
          revisionCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: minorAuthorId, displayName: 'Minor User' },
          propositions: [],
        });
      });

      // Mock the final findUnique call that returns the complete response
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-123',
        topicId,
        authorId: minorAuthorId,
        content: createDto.content,
        status: 'PENDING_REVIEW',
        revisionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: minorAuthorId, displayName: 'Minor User' },
        propositions: [],
      });

      await service.createResponse(topicId, minorAuthorId, createDto);

      expect(capturedStatus).toBe('PENDING_REVIEW');
    });

    it('should set VISIBLE status for adult authors', async () => {
      const adultAuthorId = 'adult-user-123';

      // Mock user as adult
      mockPrisma.user.findUnique.mockResolvedValue({ isMinor: false });

      // Mock response creation to capture the status
      let capturedStatus: string | undefined;
      mockPrisma.response.create.mockImplementation(({ data }: any) => {
        capturedStatus = data.status;
        return Promise.resolve({
          id: 'response-123',
          topicId,
          authorId: adultAuthorId,
          content: createDto.content,
          status: data.status,
          revisionCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: adultAuthorId, displayName: 'Adult User' },
          propositions: [],
        });
      });

      // Mock the final findUnique call that returns the complete response
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-123',
        topicId,
        authorId: adultAuthorId,
        content: createDto.content,
        status: 'VISIBLE',
        revisionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: adultAuthorId, displayName: 'Adult User' },
        propositions: [],
      });

      await service.createResponse(topicId, adultAuthorId, createDto);

      expect(capturedStatus).toBe('VISIBLE');
    });

    it('should set VISIBLE status when user record not found (defaults to adult)', async () => {
      const unknownAuthorId = 'unknown-user-123';

      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Mock response creation to capture the status
      let capturedStatus: string | undefined;
      mockPrisma.response.create.mockImplementation(({ data }: any) => {
        capturedStatus = data.status;
        return Promise.resolve({
          id: 'response-123',
          topicId,
          authorId: unknownAuthorId,
          content: createDto.content,
          status: data.status,
          revisionCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: unknownAuthorId, displayName: 'Unknown User' },
          propositions: [],
        });
      });

      // Mock the final findUnique call that returns the complete response
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-123',
        topicId,
        authorId: unknownAuthorId,
        content: createDto.content,
        status: 'VISIBLE',
        revisionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: unknownAuthorId, displayName: 'Unknown User' },
        propositions: [],
      });

      await service.createResponse(topicId, unknownAuthorId, createDto);

      // Default to VISIBLE when user record not found (fail-safe)
      expect(capturedStatus).toBe('VISIBLE');
    });
  });

  describe('getResponsesForTopic - PENDING_REVIEW filtering', () => {
    const topicId = 'topic-123';

    beforeEach(() => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: topicId });
    });

    it('should exclude PENDING_REVIEW responses by default', async () => {
      let capturedWhere: any;
      mockPrisma.response.findMany.mockImplementation(({ where }: any) => {
        capturedWhere = where;
        return Promise.resolve([]);
      });

      await service.getResponsesForTopic(topicId);

      expect(capturedWhere.status).toEqual({ not: 'PENDING_REVIEW' });
    });

    it('should include PENDING_REVIEW responses when explicitly requested', async () => {
      let capturedWhere: any;
      mockPrisma.response.findMany.mockImplementation(({ where }: any) => {
        capturedWhere = where;
        return Promise.resolve([]);
      });

      await service.getResponsesForTopic(topicId, { includePendingReview: true });

      // No status filter when including pending review
      expect(capturedWhere.status).toBeUndefined();
    });

    it('should return visible responses normally', async () => {
      const visibleResponses = [
        {
          id: 'response-1',
          content: 'Visible response',
          status: 'VISIBLE',
          authorId: 'user-1',
          author: { id: 'user-1', displayName: 'User 1' },
          propositions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.response.findMany.mockResolvedValue(visibleResponses);

      const result = await service.getResponsesForTopic(topicId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('visible');
    });
  });

  describe('getDiscussionResponses - PENDING_REVIEW filtering', () => {
    const discussionId = 'discussion-123';

    beforeEach(() => {
      mockPrisma.discussion.findUnique.mockResolvedValue({ id: discussionId });
    });

    it('should exclude PENDING_REVIEW responses by default', async () => {
      let capturedWhere: any;
      mockPrisma.response.findMany.mockImplementation(({ where }: any) => {
        capturedWhere = where;
        return Promise.resolve([]);
      });

      await service.getDiscussionResponses(discussionId);

      // Should filter out both REMOVED and PENDING_REVIEW
      expect(capturedWhere.status).toEqual({ notIn: ['REMOVED', 'PENDING_REVIEW'] });
    });

    it('should include PENDING_REVIEW responses when explicitly requested', async () => {
      let capturedWhere: any;
      mockPrisma.response.findMany.mockImplementation(({ where }: any) => {
        capturedWhere = where;
        return Promise.resolve([]);
      });

      await service.getDiscussionResponses(discussionId, { includePendingReview: true });

      // Should only filter out REMOVED, include PENDING_REVIEW
      expect(capturedWhere.status).toEqual({ not: 'REMOVED' });
    });

    it('should return non-pending responses normally', async () => {
      const visibleResponses = [
        {
          id: 'response-1',
          discussionId,
          content: 'Visible response',
          status: 'VISIBLE',
          authorId: 'user-1',
          parentId: null,
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          author: { id: 'user-1', displayName: 'User 1', verificationLevel: 'BASIC' },
          citations: [],
          _count: { replies: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.response.findMany.mockResolvedValue(visibleResponses);

      const result = await service.getDiscussionResponses(discussionId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('response-1');
    });
  });

  describe('createResponseForDiscussion - Status based on author type', () => {
    const discussionId = 'discussion-123';
    const topicId = 'topic-123';
    const createDto = {
      discussionId,
      content: 'This is a valid response with sufficient length for testing purposes.',
    };

    beforeEach(() => {
      mockPrisma.discussion.findUnique.mockResolvedValue({
        id: discussionId,
        topicId,
        status: 'ACTIVE',
      });
      mockPrisma.discussion.update = vi.fn().mockResolvedValue({});
    });

    it('should set PENDING_REVIEW status for minor authors', async () => {
      const minorAuthorId = 'minor-user-123';

      // Mock user as minor
      mockPrisma.user.findUnique.mockResolvedValue({ isMinor: true });

      // Mock response creation to capture the status
      let capturedStatus: string | undefined;
      mockPrisma.response.create.mockImplementation(({ data }: any) => {
        capturedStatus = data.status;
        return Promise.resolve({
          id: 'response-123',
          topicId,
          discussionId,
          authorId: minorAuthorId,
          content: createDto.content,
          status: data.status,
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      mockPrisma.response.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'response-123',
        discussionId,
        authorId: minorAuthorId,
        content: createDto.content,
        status: 'PENDING_REVIEW',
        version: 1,
        editCount: 0,
        editedAt: null,
        deletedAt: null,
        parentId: null,
        author: { id: minorAuthorId, displayName: 'Minor User', verificationLevel: 'BASIC' },
        citations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createResponseForDiscussion(minorAuthorId, createDto);

      expect(capturedStatus).toBe('PENDING_REVIEW');
    });

    it('should set VISIBLE status for adult authors', async () => {
      const adultAuthorId = 'adult-user-123';

      // Mock user as adult
      mockPrisma.user.findUnique.mockResolvedValue({ isMinor: false });

      // Mock response creation to capture the status
      let capturedStatus: string | undefined;
      mockPrisma.response.create.mockImplementation(({ data }: any) => {
        capturedStatus = data.status;
        return Promise.resolve({
          id: 'response-123',
          topicId,
          discussionId,
          authorId: adultAuthorId,
          content: createDto.content,
          status: data.status,
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      mockPrisma.response.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'response-123',
        discussionId,
        authorId: adultAuthorId,
        content: createDto.content,
        status: 'VISIBLE',
        version: 1,
        editCount: 0,
        editedAt: null,
        deletedAt: null,
        parentId: null,
        author: { id: adultAuthorId, displayName: 'Adult User', verificationLevel: 'BASIC' },
        citations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createResponseForDiscussion(adultAuthorId, createDto);

      expect(capturedStatus).toBe('VISIBLE');
    });
  });
});
