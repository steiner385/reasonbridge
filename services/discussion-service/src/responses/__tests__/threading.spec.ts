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

describe('ResponsesService - Threading', () => {
  let service: ResponsesService;
  let prismaService: PrismaService;
  let commonGroundTrigger: CommonGroundTriggerService;

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
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    commonGroundTrigger = {
      checkAndTrigger: vi.fn().mockResolvedValue(undefined),
    } as unknown as CommonGroundTriggerService;

    service = new ResponsesService(prismaService, commonGroundTrigger);
  });

  describe('replyToResponse', () => {
    it.skip('should create a reply to an existing response', async () => {
      // Mock sequence: parent lookup, depth calculation, discussion lookup, transaction
      const mockResponseForTx = {
        ...mockChildResponse,
        citations: [],
        _count: { replies: 0 },
      };

      prismaService.response.findUnique
        .mockResolvedValueOnce(mockParentResponse as any) // Parent lookup in replyToResponse
        .mockResolvedValueOnce(null); // Depth calculation - parent has no parent

      prismaService.discussion.findUnique.mockResolvedValue(mockDiscussion as any);

      // Mock transaction internals
      const mockTx = (prismaService as any).$transaction.mock.calls[0];
      if (!mockTx) {
        (prismaService as any).$transaction.mockImplementation(async (callback: any) => {
          const tx = {
            response: {
              create: vi.fn().mockResolvedValue(mockResponseForTx),
            },
            discussion: {
              update: vi.fn().mockResolvedValue(mockDiscussion),
            },
            participantActivity: {
              upsert: vi.fn().mockResolvedValue({}),
            },
            citation: {
              createMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return callback(tx);
        });
      }

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
      ).rejects.toThrow('Parent response must belong to a discussion');
    });

    it('should throw BadRequestException when thread depth limit exceeded', async () => {
      // Create a chain of 10 responses (max depth)
      const deepResponses = Array.from({ length: 11 }, (_, i) => ({
        id: `response-${i}`,
        parentId: i > 0 ? `response-${i - 1}` : null,
      }));

      // Mock parent lookup (first call)
      prismaService.response.findUnique.mockResolvedValueOnce({
        id: 'response-10',
        discussionId: 'discussion-1',
        deletedAt: null,
        parentId: 'response-9',
      } as any);

      // Mock depth calculation calls (subsequent calls)
      prismaService.response.findUnique.mockImplementation(async ({ where }: any) => {
        const response = deepResponses.find((r) => r.id === where.id);
        return response ? { parentId: response.parentId } : null;
      });

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

    it.skip('should include citations in reply', async () => {
      const mockResponseWithCitation = {
        ...mockChildResponse,
        citations: [
          {
            id: 'citation-1',
            originalUrl: 'https://example.com/article',
            normalizedUrl: 'https://example.com/article',
            title: 'Example Article',
            validationStatus: 'VALID',
            validatedAt: new Date('2026-01-29'),
            createdAt: new Date('2026-01-29'),
          },
        ],
        _count: { replies: 0 },
      };

      prismaService.response.findUnique
        .mockResolvedValueOnce(mockParentResponse as any)
        .mockResolvedValueOnce(null);

      prismaService.discussion.findUnique.mockResolvedValue(mockDiscussion as any);

      // Mock transaction with citation
      (prismaService as any).$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          response: {
            create: vi.fn().mockResolvedValue(mockResponseWithCitation),
          },
          discussion: {
            update: vi.fn().mockResolvedValue(mockDiscussion),
          },
          participantActivity: {
            upsert: vi.fn().mockResolvedValue({}),
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
      prismaService.response.findUnique.mockResolvedValue({ parentId: null });

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(0);
    });

    it('should return 1 for first-level reply', async () => {
      prismaService.response.findUnique
        .mockResolvedValueOnce({ parentId: 'response-parent' }) // Current response
        .mockResolvedValueOnce({ parentId: null }); // Parent response

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(1);
    });

    it('should return 3 for deeply nested reply', async () => {
      prismaService.response.findUnique
        .mockResolvedValueOnce({ parentId: 'response-3' }) // Level 3
        .mockResolvedValueOnce({ parentId: 'response-2' }) // Level 2
        .mockResolvedValueOnce({ parentId: 'response-1' }) // Level 1
        .mockResolvedValueOnce({ parentId: null }); // Level 0 (root)

      const depth = await service.calculateThreadDepth('response-4');

      expect(depth).toBe(3);
    });

    it('should handle non-existent response gracefully', async () => {
      prismaService.response.findUnique.mockResolvedValue(null);

      const depth = await service.calculateThreadDepth('non-existent');

      expect(depth).toBe(0);
    });

    it('should stop at max iterations to prevent infinite loops', async () => {
      // Simulate a circular reference (shouldn't happen in practice, but defensive)
      prismaService.response.findUnique.mockImplementation(async ({ where }: any) => {
        return { parentId: where.id === 'response-1' ? 'response-2' : 'response-1' };
      });

      const depth = await service.calculateThreadDepth('response-1');

      // Should eventually break out (implementation detail)
      expect(depth).toBeGreaterThan(0);
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
