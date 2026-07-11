/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ExpertiseService
 *
 * Tests the orchestration layer that manages topic expertise records using
 * PrismaService and ExpertiseCalculatorService.
 *
 * @see services/user-service/src/expertise/expertise.service.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma before importing services
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    Prisma: { Decimal: MockDecimal },
    ExpertiseLevel: {
      NOVICE: 'NOVICE',
      FAMILIAR: 'FAMILIAR',
      KNOWLEDGEABLE: 'KNOWLEDGEABLE',
      EXPERT: 'EXPERT',
    },
    // PrismaClient mock required for PrismaService which extends it
    PrismaClient: vi.fn(function (this: any) {
      this.$connect = vi.fn();
      this.$disconnect = vi.fn();
    }),
  };
});

// Import after mocking
import { ExpertiseService } from '../expertise.service.js';
import { ExpertiseCalculatorService } from '../expertise-calculator.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ExpertiseLevel } from '@prisma/client';

/**
 * Mock TopicExpertise type matching essential Prisma fields
 */
interface MockTopicExpertise {
  id: string;
  userId: string;
  tagId: string;
  expertiseScore: { toNumber: () => number };
  expertiseLevel: ExpertiseLevel;
  responseCount: number;
  avgQualityScore: { toNumber: () => number };
  credentialBoost: { toNumber: () => number };
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tag?: MockTag;
}

/**
 * Mock Tag type
 */
interface MockTag {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: Date;
}

/**
 * Mock User type
 */
interface MockUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
}

/**
 * Helper to create a mock Tag
 */
const createMockTag = (overrides: Partial<MockTag> = {}): MockTag => ({
  id: 'tag-123',
  name: 'Climate Science',
  slug: 'climate-science',
  usageCount: 50,
  createdAt: new Date(),
  ...overrides,
});

/**
 * Helper to create a mock TopicExpertise
 */
const createMockTopicExpertise = (
  overrides: Partial<MockTopicExpertise> = {},
): MockTopicExpertise => ({
  id: 'expertise-123',
  userId: 'user-123',
  tagId: 'tag-123',
  expertiseScore: { toNumber: () => 0.55 },
  expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
  responseCount: 25,
  avgQualityScore: { toNumber: () => 0.7 },
  credentialBoost: { toNumber: () => 0.2 },
  lastActive: new Date(),
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Helper to create a mock User
 */
const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
  ...overrides,
});

describe('ExpertiseService', () => {
  let service: ExpertiseService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    tag: { findUnique: ReturnType<typeof vi.fn> };
    topicExpertise: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    response: {
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    vote: { groupBy: ReturnType<typeof vi.fn> };
    feedback: { groupBy: ReturnType<typeof vi.fn> };
    domainCredential: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockExpertiseCalculator: ExpertiseCalculatorService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Prisma service
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      tag: {
        findUnique: vi.fn(),
      },
      topicExpertise: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      response: {
        count: vi.fn(),
        aggregate: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      vote: {
        groupBy: vi.fn(),
      },
      feedback: {
        groupBy: vi.fn(),
      },
      domainCredential: {
        findMany: vi.fn(),
      },
    };

    // Create real instance of calculator service
    mockExpertiseCalculator = new ExpertiseCalculatorService();

    // Instantiate the service
    service = new ExpertiseService(mockPrisma as unknown as PrismaService, mockExpertiseCalculator);
  });

  describe('findUserExpertise', () => {
    it('should return expertise for a specific tag when it exists', async () => {
      const mockTag = createMockTag();
      const mockExpertise = createMockTopicExpertise({ tag: mockTag });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.tagId).toBe('tag-123');
      expect(result?.tagName).toBe('Climate Science');
      expect(result?.expertiseLevel).toBe(ExpertiseLevel.KNOWLEDGEABLE);
      expect(result?.expertiseScore).toBeCloseTo(0.55, 2);
    });

    it('should return null when expertise does not exist', async () => {
      mockPrisma.topicExpertise.findFirst.mockResolvedValue(null);

      const result = await service.findUserExpertise('user-123', 'tag-456');

      expect(result).toBeNull();
    });

    it('should include progress to next level in the result', async () => {
      const mockTag = createMockTag();
      // Score of 0.55 in KNOWLEDGEABLE tier (0.50-0.75 range)
      // Progress = (0.55 - 0.50) / (0.75 - 0.50) = 0.05 / 0.25 = 20%
      const mockExpertise = createMockTopicExpertise({
        expertiseScore: { toNumber: () => 0.55 },
        expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
        tag: mockTag,
      });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result?.progressToNextLevel).toBe(20);
    });

    it('should return 100% progress for EXPERT level', async () => {
      const mockTag = createMockTag();
      const mockExpertise = createMockTopicExpertise({
        expertiseScore: { toNumber: () => 0.9 },
        expertiseLevel: ExpertiseLevel.EXPERT,
        tag: mockTag,
      });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result?.progressToNextLevel).toBe(100);
    });
  });

  describe('getAllUserExpertise', () => {
    it('should return all expertise records for a user', async () => {
      const mockExpertises = [
        createMockTopicExpertise({
          tagId: 'tag-1',
          tag: createMockTag({ id: 'tag-1', name: 'Climate Science' }),
        }),
        createMockTopicExpertise({
          tagId: 'tag-2',
          expertiseLevel: ExpertiseLevel.FAMILIAR,
          tag: createMockTag({ id: 'tag-2', name: 'Economics' }),
        }),
        createMockTopicExpertise({
          tagId: 'tag-3',
          expertiseLevel: ExpertiseLevel.NOVICE,
          tag: createMockTag({ id: 'tag-3', name: 'Philosophy' }),
        }),
      ];

      mockPrisma.topicExpertise.findMany.mockResolvedValue(mockExpertises);

      const result = await service.getAllUserExpertise('user-123');

      expect(result).toHaveLength(3);
      expect(result[0].tagName).toBe('Climate Science');
      expect(result[1].tagName).toBe('Economics');
      expect(result[2].tagName).toBe('Philosophy');
    });

    it('should return empty array when user has no expertise', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      const result = await service.getAllUserExpertise('user-123');

      expect(result).toEqual([]);
    });

    it('should order results by expertise score descending', async () => {
      const mockExpertises = [
        createMockTopicExpertise({
          expertiseScore: { toNumber: () => 0.8 },
          tag: createMockTag({ name: 'Expert Topic' }),
        }),
        createMockTopicExpertise({
          expertiseScore: { toNumber: () => 0.5 },
          tag: createMockTag({ name: 'Medium Topic' }),
        }),
        createMockTopicExpertise({
          expertiseScore: { toNumber: () => 0.2 },
          tag: createMockTag({ name: 'Low Topic' }),
        }),
      ];

      mockPrisma.topicExpertise.findMany.mockResolvedValue(mockExpertises);

      await service.getAllUserExpertise('user-123');

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { expertiseScore: 'desc' },
        }),
      );
    });
  });

  describe('getExpertiseLeaderboard', () => {
    it('should return top experts for a tag by expertise score', async () => {
      const mockTag = createMockTag();
      const mockExpertises = [
        createMockTopicExpertise({
          userId: 'user-1',
          expertiseScore: { toNumber: () => 0.95 },
          expertiseLevel: ExpertiseLevel.EXPERT,
          tag: mockTag,
        }),
        createMockTopicExpertise({
          userId: 'user-2',
          expertiseScore: { toNumber: () => 0.8 },
          expertiseLevel: ExpertiseLevel.EXPERT,
          tag: mockTag,
        }),
        createMockTopicExpertise({
          userId: 'user-3',
          expertiseScore: { toNumber: () => 0.6 },
          expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
          tag: mockTag,
        }),
      ];

      mockPrisma.topicExpertise.findMany.mockResolvedValue(mockExpertises);

      const result = await service.getExpertiseLeaderboard('tag-123');

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].expertiseScore).toBe(0.95);
      expect(result[1].userId).toBe('user-2');
      expect(result[2].userId).toBe('user-3');
    });

    it('should support limit option', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([
        createMockTopicExpertise({ tag: createMockTag() }),
      ]);

      await service.getExpertiseLeaderboard('tag-123', { limit: 5 });

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should support offset option for pagination', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      await service.getExpertiseLeaderboard('tag-123', { limit: 10, offset: 20 });

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should support filtering by expertise level', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      await service.getExpertiseLeaderboard('tag-123', {
        expertiseLevel: ExpertiseLevel.EXPERT,
      });

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expertiseLevel: ExpertiseLevel.EXPERT,
          }),
        }),
      );
    });

    it('should return empty array when no experts found', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      const result = await service.getExpertiseLeaderboard('tag-123');

      expect(result).toEqual([]);
    });

    it('should order results by expertise score descending', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      await service.getExpertiseLeaderboard('tag-123');

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { expertiseScore: 'desc' },
        }),
      );
    });

    it('should use default limit of 10 when not specified', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      await service.getExpertiseLeaderboard('tag-123');

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should filter by activity within days when specified', async () => {
      mockPrisma.topicExpertise.findMany.mockResolvedValue([]);

      await service.getExpertiseLeaderboard('tag-123', { activeWithinDays: 30 });

      expect(mockPrisma.topicExpertise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastActive: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('recalculateExpertise', () => {
    it('should calculate expertise based on response metrics', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.response.count.mockResolvedValue(25); // Category response count
      mockPrisma.response.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      });
      mockPrisma.vote.groupBy.mockResolvedValue([
        { voteType: 'UPVOTE', _count: { id: 15 } },
        { voteType: 'DOWNVOTE', _count: { id: 5 } },
      ]);
      mockPrisma.feedback.groupBy.mockResolvedValue([
        { userHelpfulRating: 'HELPFUL', _count: { id: 8 } },
        { userHelpfulRating: 'NOT_HELPFUL', _count: { id: 2 } },
      ]);
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);
      mockPrisma.topicExpertise.upsert.mockImplementation(async (args) => ({
        ...createMockTopicExpertise(),
        expertiseScore: args.create.expertiseScore,
        expertiseLevel: args.create.expertiseLevel,
        tag: mockTag,
      }));

      const result = await service.recalculateExpertise('user-123', 'tag-123');

      expect(result.userId).toBe('user-123');
      expect(result.tagId).toBe('tag-123');
      expect(result.tagName).toBe('Climate Science');
      expect(mockPrisma.topicExpertise.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.recalculateExpertise('nonexistent-user', 'tag-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.recalculateExpertise('user-123', 'nonexistent-tag')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include credential boosts from verified credentials', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();
      const mockCredentials = [
        {
          id: 'cred-1',
          userId: 'user-123',
          tagId: 'tag-123',
          boostValue: { toNumber: () => 0.15 },
          status: 'VERIFIED',
        },
        {
          id: 'cred-2',
          userId: 'user-123',
          tagId: 'tag-123',
          boostValue: { toNumber: () => 0.1 },
          status: 'VERIFIED',
        },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      mockPrisma.vote.groupBy.mockResolvedValue([]);
      mockPrisma.feedback.groupBy.mockResolvedValue([]);
      mockPrisma.domainCredential.findMany.mockResolvedValue(mockCredentials);
      mockPrisma.topicExpertise.upsert.mockImplementation(async (args) => ({
        ...createMockTopicExpertise(),
        expertiseScore: args.create.expertiseScore,
        expertiseLevel: args.create.expertiseLevel,
        credentialBoost: args.create.credentialBoost,
        tag: mockTag,
      }));

      const result = await service.recalculateExpertise('user-123', 'tag-123');

      // Credential boost should be sum of verified credentials (0.15 + 0.1 = 0.25)
      expect(result.credentialBoost).toBeCloseTo(0.25, 2);
    });

    it('should persist the updated expertise in the database', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findFirst.mockResolvedValue({ createdAt: new Date() });
      mockPrisma.vote.groupBy.mockResolvedValue([]);
      mockPrisma.feedback.groupBy.mockResolvedValue([]);
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);
      mockPrisma.topicExpertise.upsert.mockResolvedValue({
        ...createMockTopicExpertise(),
        tag: mockTag,
      });

      await service.recalculateExpertise('user-123', 'tag-123');

      expect(mockPrisma.topicExpertise.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_tagId: {
              userId: 'user-123',
              tagId: 'tag-123',
            },
          },
          create: expect.objectContaining({
            userId: 'user-123',
            tagId: 'tag-123',
          }),
          update: expect.objectContaining({
            expertiseScore: expect.any(Object), // Prisma.Decimal
            expertiseLevel: expect.any(String),
          }),
        }),
      );
    });

    it('should use zero as default when no responses exist', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.response.findFirst.mockResolvedValue(null);
      // Aggregations run against the relation filter and return empty groups.
      mockPrisma.vote.groupBy.mockResolvedValue([]);
      mockPrisma.feedback.groupBy.mockResolvedValue([]);
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);
      mockPrisma.topicExpertise.upsert.mockImplementation(async (args) => ({
        ...createMockTopicExpertise(),
        expertiseScore: args.create.expertiseScore,
        expertiseLevel: args.create.expertiseLevel,
        responseCount: 0,
        tag: mockTag,
      }));

      const result = await service.recalculateExpertise('user-123', 'tag-123');

      expect(result.responseCount).toBe(0);
      expect(result.expertiseLevel).toBe(ExpertiseLevel.NOVICE);
    });

    it('should determine correct expertise level from calculated score', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.response.count.mockResolvedValue(50); // Max engagement
      mockPrisma.response.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Max tenure
      });
      mockPrisma.vote.groupBy.mockResolvedValue([
        { voteType: 'UPVOTE', _count: { id: 100 } },
        { voteType: 'DOWNVOTE', _count: { id: 10 } },
      ]);
      mockPrisma.feedback.groupBy.mockResolvedValue([
        { userHelpfulRating: 'HELPFUL', _count: { id: 50 } },
        { userHelpfulRating: 'NOT_HELPFUL', _count: { id: 5 } },
      ]);
      mockPrisma.domainCredential.findMany.mockResolvedValue([
        { boostValue: { toNumber: () => 0.5 }, status: 'VERIFIED' },
      ]);
      mockPrisma.topicExpertise.upsert.mockImplementation(async (args) => ({
        ...createMockTopicExpertise(),
        expertiseScore: args.create.expertiseScore,
        expertiseLevel: args.create.expertiseLevel,
        tag: mockTag,
      }));

      const result = await service.recalculateExpertise('user-123', 'tag-123');

      // With max engagement (0.4) + high quality (0.27) + credential (0.1) + tenure (0.1) = ~0.87
      // Should be EXPERT level (>= 0.75)
      expect(result.expertiseLevel).toBe(ExpertiseLevel.EXPERT);
    });
  });

  describe('TopicExpertiseDto transformation', () => {
    it('should calculate progress to next level correctly', async () => {
      const mockTag = createMockTag();
      // Score of 0.35 with FAMILIAR level (0.25-0.50 range)
      // Progress = (0.35 - 0.25) / (0.50 - 0.25) = 0.10 / 0.25 = 40%
      const mockExpertise = createMockTopicExpertise({
        expertiseScore: { toNumber: () => 0.35 },
        expertiseLevel: ExpertiseLevel.FAMILIAR,
        tag: mockTag,
      });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result?.progressToNextLevel).toBe(40);
    });

    it('should include response count in the result', async () => {
      const mockTag = createMockTag();
      const mockExpertise = createMockTopicExpertise({
        responseCount: 42,
        tag: mockTag,
      });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result?.responseCount).toBe(42);
    });

    it('should include average quality score in the result', async () => {
      const mockTag = createMockTag();
      const mockExpertise = createMockTopicExpertise({
        avgQualityScore: { toNumber: () => 0.85 },
        tag: mockTag,
      });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result?.avgQualityScore).toBeCloseTo(0.85, 2);
    });

    it('should include credential boost in the result', async () => {
      const mockTag = createMockTag();
      const mockExpertise = createMockTopicExpertise({
        credentialBoost: { toNumber: () => 0.3 },
        tag: mockTag,
      });

      mockPrisma.topicExpertise.findFirst.mockResolvedValue(mockExpertise);

      const result = await service.findUserExpertise('user-123', 'tag-123');

      expect(result?.credentialBoost).toBeCloseTo(0.3, 2);
    });
  });
});
