/**
 * T042 [US2] - ResponsesService Unit Tests (Feature 009)
 *
 * Tests for discussion response creation and retrieval functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ResponsesService } from '../responses.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CommonGroundTriggerService } from '../../services/common-ground-trigger.service.js';
import { DiscussionLogger } from '../../utils/logger.js';
import * as ssrfValidator from '../../utils/ssrf-validator.js';

// Mock the logger, SSRF validator, and CommonGroundTriggerService
vi.mock('../../utils/logger.js');
vi.mock('../../utils/ssrf-validator.js');
vi.mock('../../services/common-ground-trigger.service.js');

describe('ResponsesService - Feature 009', () => {
  let service: ResponsesService;
  let prisma: PrismaService;

  // Test data
  const mockUserId = 'user-123';
  const mockDiscussionId = 'discussion-456';
  const mockResponseId = 'response-789';
  const mockTopicId = 'topic-101';

  const mockUser = {
    id: mockUserId,
    displayName: 'Test User',
  };

  const mockDiscussion = {
    id: mockDiscussionId,
    topicId: mockTopicId,
    status: 'ACTIVE',
  };

  const mockResponse = {
    id: mockResponseId,
    discussionId: mockDiscussionId,
    topicId: mockTopicId,
    authorId: mockUserId,
    content:
      'This is a test response with substantial content that meets the minimum character requirement.',
    version: 1,
    editCount: 0,
    editedAt: null,
    deletedAt: null,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    citations: [],
    _count: { replies: 0 },
  };

  const mockPrismaService = {
    discussion: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    response: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    citation: {
      createMany: vi.fn(),
    },
    participantActivity: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockCommonGroundTriggerService = {
    checkAndTrigger: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CommonGroundTriggerService,
          useValue: mockCommonGroundTriggerService,
        },
      ],
    }).compile();

    service = module.get<ResponsesService>(ResponsesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    vi.clearAllMocks();

    // Default SSRF validation mock
    (ssrfValidator.validateCitationUrl as any).mockResolvedValue({
      safe: true,
      originalUrl: 'https://example.com',
      normalizedUrl: 'https://example.com',
      resolvedIp: '93.184.216.34',
    });
  });

  describe('createResponseForDiscussion (T037)', () => {
    const validDto = {
      discussionId: mockDiscussionId,
      content:
        'I agree with the previous analysis and would like to add that implementation timelines are crucial.',
      citations: [
        {
          url: 'https://example.com/research-paper',
          title: 'Implementation Timeline Study',
        },
      ],
    };

    it('should successfully create a response with citations', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          response: {
            create: vi.fn().mockResolvedValue(mockResponse),
            findUniqueOrThrow: vi.fn().mockResolvedValue(mockResponse),
          },
          citation: {
            createMany: vi.fn(),
          },
          participantActivity: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            count: vi.fn().mockResolvedValue(1),
          },
          discussion: {
            update: vi.fn(),
          },
        });
      });

      const result = await service.createResponseForDiscussion(mockUserId, validDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('author');
      expect(ssrfValidator.validateCitationUrl).toHaveBeenCalledWith(
        'https://example.com/research-paper',
      );
    });

    it('should throw NotFoundException if discussion does not exist', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(null);

      await expect(service.createResponseForDiscussion(mockUserId, validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createResponseForDiscussion(mockUserId, validDto)).rejects.toThrow(
        `Discussion with ID ${mockDiscussionId} not found`,
      );
    });

    it('should throw BadRequestException if discussion is not active', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue({
        ...mockDiscussion,
        status: 'ARCHIVED',
      });

      await expect(service.createResponseForDiscussion(mockUserId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createResponseForDiscussion(mockUserId, validDto)).rejects.toThrow(
        'Cannot add responses to non-active discussions',
      );
    });

    it('should throw BadRequestException if parent response does not exist', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);
      mockPrismaService.response.findUnique.mockResolvedValue(null);

      const dtoWithParent = {
        ...validDto,
        parentResponseId: 'non-existent-parent',
      };

      await expect(service.createResponseForDiscussion(mockUserId, dtoWithParent)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createResponseForDiscussion(mockUserId, dtoWithParent)).rejects.toThrow(
        'Parent response with ID non-existent-parent not found',
      );
    });

    it('should throw BadRequestException if parent response belongs to different discussion', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);
      mockPrismaService.response.findUnique.mockResolvedValue({
        id: 'parent-response',
        discussionId: 'different-discussion-id',
        deletedAt: null,
      });

      const dtoWithParent = {
        ...validDto,
        parentResponseId: 'parent-response',
      };

      await expect(service.createResponseForDiscussion(mockUserId, dtoWithParent)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createResponseForDiscussion(mockUserId, dtoWithParent)).rejects.toThrow(
        'Parent response must belong to the same discussion',
      );
    });

    it('should throw BadRequestException if parent response is deleted', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);
      mockPrismaService.response.findUnique.mockResolvedValue({
        id: 'parent-response',
        discussionId: mockDiscussionId,
        deletedAt: new Date(),
      });

      const dtoWithParent = {
        ...validDto,
        parentResponseId: 'parent-response',
      };

      await expect(service.createResponseForDiscussion(mockUserId, dtoWithParent)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createResponseForDiscussion(mockUserId, dtoWithParent)).rejects.toThrow(
        'Cannot reply to deleted responses',
      );
    });

    it('should throw BadRequestException if more than 10 citations provided', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);

      const tooManyCitations = {
        ...validDto,
        citations: Array(11)
          .fill(null)
          .map((_, i) => ({
            url: `https://example${i}.com`,
            title: `Citation ${i}`,
          })),
      };

      await expect(
        service.createResponseForDiscussion(mockUserId, tooManyCitations),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createResponseForDiscussion(mockUserId, tooManyCitations),
      ).rejects.toThrow('Maximum 10 citations allowed per response');
    });

    it('should throw BadRequestException if citation URL fails SSRF validation', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);

      (ssrfValidator.validateCitationUrl as any).mockResolvedValue({
        safe: false,
        error: 'Private IP address detected',
        threat: 'PRIVATE_IP',
        originalUrl: 'http://10.0.0.1',
        normalizedUrl: 'http://10.0.0.1',
      });

      await expect(service.createResponseForDiscussion(mockUserId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createResponseForDiscussion(mockUserId, validDto)).rejects.toThrow(
        'Citation URL blocked: Private IP address detected',
      );
    });

    it('should create ParticipantActivity if user is new to discussion', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);

      const mockTransactionClient = {
        response: {
          create: vi.fn().mockResolvedValue(mockResponse),
          findUniqueOrThrow: vi.fn().mockResolvedValue(mockResponse),
        },
        citation: {
          createMany: vi.fn(),
        },
        participantActivity: {
          findUnique: vi.fn().mockResolvedValue(null), // No existing activity
          create: vi.fn(),
          count: vi.fn().mockResolvedValue(1),
        },
        discussion: {
          update: vi.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTransactionClient);
      });

      await service.createResponseForDiscussion(mockUserId, validDto);

      expect(mockTransactionClient.participantActivity.create).toHaveBeenCalledWith({
        data: {
          discussionId: mockDiscussionId,
          userId: mockUserId,
          responseCount: 1,
          lastActivityAt: expect.any(Date),
        },
      });
    });

    it('should update ParticipantActivity if user already participated', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);

      const existingActivity = {
        discussionId: mockDiscussionId,
        userId: mockUserId,
        responseCount: 5,
        lastActivityAt: new Date('2026-01-26T10:00:00Z'),
      };

      const mockTransactionClient = {
        response: {
          create: vi.fn().mockResolvedValue(mockResponse),
          findUniqueOrThrow: vi.fn().mockResolvedValue(mockResponse),
        },
        citation: {
          createMany: vi.fn(),
        },
        participantActivity: {
          findUnique: vi.fn().mockResolvedValue(existingActivity),
          update: vi.fn(),
          count: vi.fn().mockResolvedValue(1),
        },
        discussion: {
          update: vi.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTransactionClient);
      });

      await service.createResponseForDiscussion(mockUserId, validDto);

      expect(mockTransactionClient.participantActivity.update).toHaveBeenCalledWith({
        where: {
          discussionId_userId: {
            discussionId: mockDiscussionId,
            userId: mockUserId,
          },
        },
        data: {
          responseCount: { increment: 1 },
          lastActivityAt: expect.any(Date),
        },
      });
    });
  });

  describe('getDiscussionResponses (T038)', () => {
    const mockResponses = [
      {
        ...mockResponse,
        id: 'response-1',
        content: 'First response',
        createdAt: new Date('2026-01-27T10:00:00Z'),
      },
      {
        ...mockResponse,
        id: 'response-2',
        content: 'Second response',
        createdAt: new Date('2026-01-27T11:00:00Z'),
      },
      {
        ...mockResponse,
        id: 'response-3',
        content: 'Third response',
        createdAt: new Date('2026-01-27T12:00:00Z'),
      },
    ];

    it('should retrieve all non-deleted responses for a discussion', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);
      mockPrismaService.response.findMany.mockResolvedValue(mockResponses);

      const result = await service.getDiscussionResponses(mockDiscussionId);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('First response');
      expect(result[2].content).toBe('Third response');
      expect(mockPrismaService.response.findMany).toHaveBeenCalledWith({
        where: {
          discussionId: mockDiscussionId,
          deletedAt: null,
        },
        include: {
          author: {
            select: { id: true, displayName: true },
          },
          citations: true,
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException if discussion does not exist', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(null);

      await expect(service.getDiscussionResponses(mockDiscussionId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getDiscussionResponses(mockDiscussionId)).rejects.toThrow(
        `Discussion with ID ${mockDiscussionId} not found`,
      );
    });

    it('should exclude soft-deleted responses', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);
      mockPrismaService.response.findMany.mockResolvedValue(mockResponses);

      await service.getDiscussionResponses(mockDiscussionId);

      expect(mockPrismaService.response.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it('should include citations and reply counts', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);

      const responsesWithCitations = [
        {
          ...mockResponse,
          citations: [
            {
              id: 'citation-1',
              originalUrl: 'https://example.com/1',
              normalizedUrl: 'https://example.com/1',
              title: 'Source 1',
              validationStatus: 'UNVERIFIED',
              validatedAt: null,
              createdAt: new Date(),
            },
          ],
          _count: { replies: 3 },
        },
      ];

      mockPrismaService.response.findMany.mockResolvedValue(responsesWithCitations);

      const result = await service.getDiscussionResponses(mockDiscussionId);

      expect(result[0].citations).toHaveLength(1);
      expect(result[0].citations![0].title).toBe('Source 1');
      expect(result[0].replyCount).toBe(3);
    });

    it('should return empty array for discussion with no responses', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(mockDiscussion);
      mockPrismaService.response.findMany.mockResolvedValue([]);

      const result = await service.getDiscussionResponses(mockDiscussionId);

      expect(result).toEqual([]);
    });
  });
});
