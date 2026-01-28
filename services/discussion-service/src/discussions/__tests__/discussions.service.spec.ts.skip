/**
 * T025-T026 [US1] - DiscussionService Unit Tests (Feature 009)
 *
 * Tests for discussion creation and listing functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { DiscussionsService } from '../discussions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DiscussionLogger } from '../../utils/logger.js';
import * as ssrfValidator from '../../utils/ssrf-validator.js';

// Mock the logger and SSRF validator
vi.mock('../../utils/logger.js');
vi.mock('../../utils/ssrf-validator.js');

describe('DiscussionsService', () => {
  let service: DiscussionsService;
  let prisma: PrismaService;

  // Test data
  const mockUserId = 'user-123';
  const mockTopicId = 'topic-456';
  const mockDiscussionId = 'discussion-789';

  const mockUser = {
    id: mockUserId,
    displayName: 'Test User',
    emailVerified: true,
  };

  const mockTopic = {
    id: mockTopicId,
    status: 'ACTIVE',
  };

  const mockDiscussion = {
    id: mockDiscussionId,
    topicId: mockTopicId,
    creatorId: mockUserId,
    title: 'Test Discussion',
    status: 'ACTIVE',
    responseCount: 1,
    participantCount: 1,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: mockUser,
    responses: [
      {
        id: 'response-1',
        discussionId: mockDiscussionId,
        topicId: mockTopicId,
        authorId: mockUserId,
        content: 'Initial response content',
        version: 1,
        editCount: 0,
        editedAt: null,
        deletedAt: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        citations: [],
      },
    ],
  };

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
    },
    discussionTopic: {
      findUnique: vi.fn(),
    },
    discussion: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
    },
    response: {
      create: vi.fn(),
    },
    citation: {
      createMany: vi.fn(),
    },
    participantActivity: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DiscussionsService>(DiscussionsService);
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

  describe('T025 - createDiscussion', () => {
    const validDto = {
      topicId: mockTopicId,
      title: 'Should we implement carbon taxes?',
      initialResponse: {
        content:
          'I believe carbon taxes are essential for addressing climate change because they create economic incentives for reducing emissions.',
        citations: [
          {
            url: 'https://example.com/carbon-tax-study',
            title: 'Carbon Tax Research',
          },
        ],
      },
    };

    it('should successfully create a discussion with initial response and citations', async () => {
      // Mock user verification
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic);

      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          discussion: {
            create: vi.fn().mockResolvedValue(mockDiscussion),
          },
          response: {
            create: vi.fn().mockResolvedValue(mockDiscussion.responses[0]),
          },
          citation: {
            createMany: vi.fn(),
          },
          participantActivity: {
            create: vi.fn(),
          },
          discussion: {
            findUniqueOrThrow: vi.fn().mockResolvedValue(mockDiscussion),
          },
        });
      });

      const result = await service.createDiscussion(mockUserId, validDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title', 'Test Discussion');
      expect(result.responses).toHaveLength(1);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { id: true, displayName: true, emailVerified: true },
      });
      expect(ssrfValidator.validateCitationUrl).toHaveBeenCalledWith(
        'https://example.com/carbon-tax-study',
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        `User with ID ${mockUserId} not found`,
      );
    });

    it('should throw ForbiddenException if user is not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      });

      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        'Only verified users can create discussions',
      );
    });

    it('should throw NotFoundException if topic does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        `Topic with ID ${mockTopicId} not found`,
      );
    });

    it('should throw BadRequestException if topic is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.discussionTopic.findUnique.mockResolvedValue({
        ...mockTopic,
        status: 'ARCHIVED',
      });

      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        'Cannot create discussions in non-active topics',
      );
    });

    it('should throw BadRequestException if citation URL fails SSRF validation', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic);

      (ssrfValidator.validateCitationUrl as any).mockResolvedValue({
        safe: false,
        error: 'Private IP address detected',
        threat: 'PRIVATE_IP',
        originalUrl: 'http://192.168.1.1',
        normalizedUrl: 'http://192.168.1.1',
      });

      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDiscussion(mockUserId, validDto)).rejects.toThrow(
        'Citation URL blocked: Private IP address detected',
      );
    });

    it('should throw BadRequestException if more than 10 citations provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic);

      const tooManyCitations = {
        ...validDto,
        initialResponse: {
          content: validDto.initialResponse.content,
          citations: Array(11)
            .fill(null)
            .map((_, i) => ({
              url: `https://example${i}.com`,
              title: `Citation ${i}`,
            })),
        },
      };

      await expect(service.createDiscussion(mockUserId, tooManyCitations)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDiscussion(mockUserId, tooManyCitations)).rejects.toThrow(
        'Maximum 10 citations allowed per response',
      );
    });
  });

  describe('T026 - listDiscussions', () => {
    const mockDiscussions = [
      {
        id: 'disc-1',
        topicId: mockTopicId,
        title: 'Discussion 1',
        status: 'ACTIVE',
        responseCount: 5,
        participantCount: 3,
        lastActivityAt: new Date('2026-01-27T10:00:00Z'),
        createdAt: new Date('2026-01-27T09:00:00Z'),
        updatedAt: new Date('2026-01-27T10:00:00Z'),
        creator: mockUser,
      },
      {
        id: 'disc-2',
        topicId: mockTopicId,
        title: 'Discussion 2',
        status: 'ACTIVE',
        responseCount: 10,
        participantCount: 7,
        lastActivityAt: new Date('2026-01-27T11:00:00Z'),
        createdAt: new Date('2026-01-27T09:30:00Z'),
        updatedAt: new Date('2026-01-27T11:00:00Z'),
        creator: mockUser,
      },
    ];

    it('should list discussions with default pagination', async () => {
      mockPrismaService.discussion.count.mockResolvedValue(2);
      mockPrismaService.discussion.findMany.mockResolvedValue(mockDiscussions);

      const result = await service.listDiscussions({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalItems).toBe(2);
      expect(mockPrismaService.discussion.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: {
          creator: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter discussions by topicId', async () => {
      mockPrismaService.discussion.count.mockResolvedValue(2);
      mockPrismaService.discussion.findMany.mockResolvedValue(mockDiscussions);

      await service.listDiscussions({ topicId: mockTopicId });

      expect(mockPrismaService.discussion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE', topicId: mockTopicId },
        }),
      );
    });

    it('should sort discussions by responseCount descending', async () => {
      mockPrismaService.discussion.count.mockResolvedValue(2);
      mockPrismaService.discussion.findMany.mockResolvedValue(mockDiscussions.reverse());

      await service.listDiscussions({
        sortBy: 'responseCount',
        sortOrder: 'desc',
      });

      expect(mockPrismaService.discussion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { responseCount: 'desc' },
        }),
      );
    });

    it('should paginate results correctly', async () => {
      mockPrismaService.discussion.count.mockResolvedValue(100);
      mockPrismaService.discussion.findMany.mockResolvedValue(mockDiscussions);

      const result = await service.listDiscussions({
        page: 2,
        limit: 10,
      });

      expect(mockPrismaService.discussion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        }),
      );
      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.totalPages).toBe(10);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should limit max page size to 100', async () => {
      mockPrismaService.discussion.count.mockResolvedValue(200);
      mockPrismaService.discussion.findMany.mockResolvedValue(mockDiscussions);

      await service.listDiscussions({ limit: 500 });

      expect(mockPrismaService.discussion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Capped at max
        }),
      );
    });
  });
});
