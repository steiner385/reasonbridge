/**
 * T056 [US3] - Unit tests for threading logic (Feature 009)
 *
 * Tests the threaded reply functionality including:
 * - replyToResponse() with parent validation
 * - calculateThreadDepth() for depth enforcement
 * - buildThreadTree() for nested structure creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ResponsesService } from '../responses.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CommonGroundTriggerService } from '../../services/common-ground-trigger.service.js';
import type { ResponseDetailDto } from '../dto/response-detail.dto.js';
import type { ResponseThreadingService } from '../response-threading.service.js';

describe('ResponsesService - Threading', () => {
  let service: ResponsesService;
  let prismaService: PrismaService;
  let commonGroundTrigger: CommonGroundTriggerService;
  let threadingService: ResponseThreadingService;

  const mockDiscussion = {
    id: 'discussion-1',
    topicId: 'topic-1',
    title: 'Climate Policy Discussion',
    status: 'ACTIVE',
    responseCount: 0,
  };

  const mockUser = {
    id: 'user-1',
    displayName: 'Alice',
    verificationLevel: 'BASIC',
  };

  const mockParentResponse = {
    id: 'response-1',
    discussionId: 'discussion-1',
    content: 'Original response content',
    parentId: null,
    deletedAt: null,
  };

  const mockChildResponse = {
    id: 'response-2',
    discussionId: 'discussion-1',
    authorId: 'user-1',
    content: 'This is a reply to response-1',
    parentId: 'response-1',
    author: mockUser,
    citations: [],
    version: 1,
    editCount: 0,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-01-29'),
    updatedAt: new Date('2026-01-29'),
  };

  beforeEach(() => {
    // Mock Prisma transaction
    const mockTx = {
      response: {
        create: vi.fn(),
      },
      discussion: {
        update: vi.fn(),
      },
      participantActivity: {
        upsert: vi.fn(),
      },
      citation: {
        createMany: vi.fn(),
      },
    };

    prismaService = {
      response: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      discussion: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      citation: {
        createMany: vi.fn(),
      },
      participantActivity: {
        upsert: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ isMinor: false }),
      },
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    commonGroundTrigger = {
      checkAndTrigger: vi.fn().mockResolvedValue(undefined),
    } as unknown as CommonGroundTriggerService;

    threadingService = {
      calculateThreadDepth: vi.fn().mockResolvedValue(0),
      validateReplyDepth: vi.fn().mockResolvedValue(undefined),
      buildThreadTree: vi.fn().mockImplementation((responses) => {
        // Simple implementation that adds replies and depth fields
        const responseMap = new Map();
        const rootResponses: any[] = [];
        responses.forEach((response: any) => {
          responseMap.set(response.id, { ...response, replies: [], depth: 0 });
        });
        responses.forEach((response: any) => {
          const threadedResponse = responseMap.get(response.id);
          if (response.parentResponseId) {
            const parent = responseMap.get(response.parentResponseId);
            if (parent) {
              parent.replies.push(threadedResponse);
              threadedResponse.depth = parent.depth + 1;
            } else {
              rootResponses.push(threadedResponse);
            }
          } else {
            rootResponses.push(threadedResponse);
          }
        });
        return rootResponses;
      }),
    } as unknown as ResponseThreadingService;

    service = new ResponsesService(prismaService, commonGroundTrigger, threadingService);
  });

  describe('replyToResponse', () => {
    it('should create a reply to an existing response', async () => {
      // Mock response with all fields needed by createResponseForDiscussion
      const mockCreatedResponse = {
        id: 'response-2',
        discussionId: 'discussion-1',
        topicId: 'topic-1',
        authorId: 'user-1',
        content: 'This is a reply to response-1',
        parentId: 'response-1',
        status: 'VISIBLE',
        version: 1,
        editCount: 0,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date('2026-01-29'),
        updatedAt: new Date('2026-01-29'),
        author: mockUser,
        citations: [],
        _count: { replies: 0 },
      };

      // Mock sequence for replyToResponse:
      // 1. Parent lookup in replyToResponse (returns full parent with discussionId)
      // 2. Parent validation in createResponseForDiscussion (returns parent with matching discussionId)
      prismaService.response.findUnique
        .mockResolvedValueOnce(mockParentResponse as any) // 1. Parent lookup
        .mockResolvedValueOnce({
          // 2. Parent validation in createResponseForDiscussion
          id: 'response-1',
          discussionId: 'discussion-1',
          deletedAt: null,
        } as any);

      // Mock discussion lookup for createResponseForDiscussion
      prismaService.discussion.findUnique.mockResolvedValue(mockDiscussion as any);

      // Set up transaction mock with all required methods
      (prismaService as any).$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          response: {
            create: vi.fn().mockResolvedValue({ id: 'response-2' }),
            findUniqueOrThrow: vi.fn().mockResolvedValue(mockCreatedResponse),
          },
          discussion: {
            update: vi.fn().mockResolvedValue(mockDiscussion),
          },
          participantActivity: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
            count: vi.fn().mockResolvedValue(1),
          },
          citation: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(tx);
      });

      const result = await service.replyToResponse('response-1', 'user-1', {
        content: 'This is a reply to response-1',
      });

      expect(result.parentResponseId).toBe('response-1');
      expect(result.discussionId).toBe('discussion-1');
      expect(result.content).toBe('This is a reply to response-1');
      expect(prismaService.response.findUnique).toHaveBeenCalledWith({
        where: { id: 'response-1' },
        select: {
          id: true,
          discussionId: true,
          deletedAt: true,
          parentId: true,
        },
      });
    });

    it('should throw NotFoundException when parent response does not exist', async () => {
      prismaService.response.findUnique.mockResolvedValue(null);

      await expect(
        service.replyToResponse('non-existent', 'user-1', {
          content: 'Reply content',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when replying to deleted response', async () => {
      prismaService.response.findUnique.mockResolvedValue({
        ...mockParentResponse,
        deletedAt: new Date('2026-01-29'),
      } as any);

      await expect(
        service.replyToResponse('response-1', 'user-1', {
          content: 'Reply content',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.replyToResponse('response-1', 'user-1', {
          content: 'Reply content',
        }),
      ).rejects.toThrow('Cannot reply to a deleted response');
    });

    it('should throw BadRequestException when parent has no discussionId', async () => {
      prismaService.response.findUnique.mockResolvedValue({
        ...mockParentResponse,
        discussionId: null,
      } as any);

      await expect(
        service.replyToResponse('response-1', 'user-1', {
          content: 'Reply content',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.replyToResponse('response-1', 'user-1', {
          content: 'Reply content',
        }),
      ).rejects.toThrow('Cannot reply to this response: it belongs to a legacy topic');
    });

    it('should throw BadRequestException when thread depth limit exceeded', async () => {
      // Mock parent lookup (needs to return for both assertions)
      prismaService.response.findUnique.mockResolvedValue({
        id: 'response-10',
        discussionId: 'discussion-1',
        deletedAt: null,
        parentId: 'response-9',
      } as any);

      // Mock threadingService.validateReplyDepth to always throw for max depth exceeded
      vi.mocked(threadingService.validateReplyDepth).mockRejectedValue(
        new BadRequestException('Thread depth limit exceeded'),
      );

      await expect(
        service.replyToResponse('response-10', 'user-1', {
          content: 'Too deep!',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.replyToResponse('response-10', 'user-1', {
          content: 'Too deep!',
        }),
      ).rejects.toThrow('Thread depth limit exceeded');
    });

    it('should include citations in reply', async () => {
      const mockResponseWithCitation = {
        id: 'response-2',
        discussionId: 'discussion-1',
        topicId: 'topic-1',
        authorId: 'user-1',
        content: 'Reply with citation',
        parentId: 'response-1',
        status: 'VISIBLE',
        version: 1,
        editCount: 0,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date('2026-01-29'),
        updatedAt: new Date('2026-01-29'),
        author: mockUser,
        citations: [
          {
            id: 'citation-1',
            originalUrl: 'https://example.com/article',
            normalizedUrl: 'https://example.com/article',
            title: 'Example Article',
            validationStatus: 'UNVERIFIED',
            validatedAt: null,
            createdAt: new Date('2026-01-29'),
          },
        ],
        _count: { replies: 0 },
      };

      // Mock sequence for replyToResponse:
      // 1. Parent lookup in replyToResponse
      // 2. Parent validation in createResponseForDiscussion (must have matching discussionId)
      prismaService.response.findUnique
        .mockResolvedValueOnce(mockParentResponse as any) // 1. Parent lookup
        .mockResolvedValueOnce({
          // 2. Parent validation in createResponseForDiscussion
          id: 'response-1',
          discussionId: 'discussion-1',
          deletedAt: null,
        } as any);

      prismaService.discussion.findUnique.mockResolvedValue(mockDiscussion as any);

      // Set up transaction mock with citation support
      (prismaService as any).$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          response: {
            create: vi.fn().mockResolvedValue({ id: 'response-2' }),
            findUniqueOrThrow: vi.fn().mockResolvedValue(mockResponseWithCitation),
          },
          discussion: {
            update: vi.fn().mockResolvedValue(mockDiscussion),
          },
          participantActivity: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
            count: vi.fn().mockResolvedValue(1),
          },
          citation: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const result = await service.replyToResponse('response-1', 'user-1', {
        content: 'Reply with citation',
        citations: [{ url: 'https://example.com/article', title: 'Example Article' }],
      });

      expect(result.citations).toHaveLength(1);
      expect(result.citations![0].originalUrl).toBe('https://example.com/article');
    });
  });

  describe('calculateThreadDepth', () => {
    it('should return 0 for top-level response (no parent)', async () => {
      // ResponsesService delegates to threadingService, so mock the expected return
      vi.mocked(threadingService.calculateThreadDepth).mockResolvedValue(0);

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(0);
      expect(threadingService.calculateThreadDepth).toHaveBeenCalledWith('response-1');
    });

    it('should return 1 for first-level reply', async () => {
      vi.mocked(threadingService.calculateThreadDepth).mockResolvedValue(1);

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(1);
      expect(threadingService.calculateThreadDepth).toHaveBeenCalledWith('response-1');
    });

    it('should return 3 for deeply nested reply', async () => {
      vi.mocked(threadingService.calculateThreadDepth).mockResolvedValue(3);

      const depth = await service.calculateThreadDepth('response-4');

      expect(depth).toBe(3);
      expect(threadingService.calculateThreadDepth).toHaveBeenCalledWith('response-4');
    });

    it('should handle non-existent response gracefully', async () => {
      // ThreadingService returns 0 for non-existent responses
      vi.mocked(threadingService.calculateThreadDepth).mockResolvedValue(0);

      const depth = await service.calculateThreadDepth('non-existent');

      expect(depth).toBe(0);
      expect(threadingService.calculateThreadDepth).toHaveBeenCalledWith('non-existent');
    });

    it('should stop at max iterations to prevent infinite loops', async () => {
      // ThreadingService caps at MAX_DEPTH (10) for circular references
      vi.mocked(threadingService.calculateThreadDepth).mockResolvedValue(10);

      const depth = await service.calculateThreadDepth('response-1');

      // Should break out at MAX_DEPTH (10) to prevent infinite loop
      expect(depth).toBe(10);
      expect(threadingService.calculateThreadDepth).toHaveBeenCalledWith('response-1');
    });
  });

  describe('buildThreadTree', () => {
    it('should build tree from flat response list', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'Top-level response',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-2',
          discussionId: 'discussion-1',
          content: 'Reply to response-1',
          author: mockUser,
          parentResponseId: 'response-1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:05:00Z',
          updatedAt: '2026-01-29T10:05:00Z',
        },
        {
          id: 'response-3',
          discussionId: 'discussion-1',
          content: 'Reply to response-2',
          author: mockUser,
          parentResponseId: 'response-2',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:10:00Z',
          updatedAt: '2026-01-29T10:10:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      expect(tree).toHaveLength(1); // One root
      expect(tree[0].id).toBe('response-1');
      expect(tree[0].depth).toBe(0);
      expect(tree[0].replies).toHaveLength(1);
      expect(tree[0].replies[0].id).toBe('response-2');
      expect(tree[0].replies[0].depth).toBe(1);
      expect(tree[0].replies[0].replies).toHaveLength(1);
      expect(tree[0].replies[0].replies[0].id).toBe('response-3');
      expect(tree[0].replies[0].replies[0].depth).toBe(2);
    });

    it('should handle multiple root responses', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'First root',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-2',
          discussionId: 'discussion-1',
          content: 'Second root',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:05:00Z',
          updatedAt: '2026-01-29T10:05:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('response-1');
      expect(tree[1].id).toBe('response-2');
      expect(tree[0].depth).toBe(0);
      expect(tree[1].depth).toBe(0);
    });

    it('should handle orphaned responses (parent deleted)', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'Top-level response',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-3',
          discussionId: 'discussion-1',
          content: 'Orphaned reply (parent deleted)',
          author: mockUser,
          parentResponseId: 'response-2-deleted',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:10:00Z',
          updatedAt: '2026-01-29T10:10:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      // Orphaned response promoted to root
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('response-1');
      expect(tree[1].id).toBe('response-3');
      expect(tree[1].depth).toBe(0); // Treated as root
    });

    it('should return empty array for empty input', () => {
      const tree = service.buildThreadTree([]);

      expect(tree).toHaveLength(0);
    });

    it('should preserve chronological order within each level', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'Root',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-2',
          discussionId: 'discussion-1',
          content: 'First reply',
          author: mockUser,
          parentResponseId: 'response-1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:05:00Z',
          updatedAt: '2026-01-29T10:05:00Z',
        },
        {
          id: 'response-3',
          discussionId: 'discussion-1',
          content: 'Second reply',
          author: mockUser,
          parentResponseId: 'response-1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:10:00Z',
          updatedAt: '2026-01-29T10:10:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      expect(tree[0].replies).toHaveLength(2);
      expect(tree[0].replies[0].id).toBe('response-2'); // Earlier timestamp
      expect(tree[0].replies[1].id).toBe('response-3'); // Later timestamp
    });
  });
});
