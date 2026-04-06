/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for AppealService
 *
 * Tests the tier appeal service that handles submission, approval, and denial
 * of appeals for global tier rankings and domain expertise levels.
 *
 * @see services/user-service/src/appeals/appeal.service.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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
    TierAppealType: {
      GLOBAL_TIER: 'GLOBAL_TIER',
      DOMAIN_EXPERTISE: 'DOMAIN_EXPERTISE',
    },
    TierAppealStatus: {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      DENIED: 'DENIED',
    },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
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
import { AppealService } from '../appeal.service.js';
import { RankingService } from '../../ranking/ranking.service.js';
import { ExpertiseService } from '../../expertise/expertise.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TierAppealType, TierAppealStatus } from '@prisma/client';

/**
 * Mock User type
 */
interface MockUser {
  id: string;
  displayName: string | null;
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
 * Mock TierAppeal type matching essential Prisma fields
 */
interface MockTierAppeal {
  id: string;
  userId: string;
  appealType: TierAppealType;
  tagId: string | null;
  requestedLevel: number;
  reason: string;
  status: TierAppealStatus;
  reviewedById: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  user?: MockUser;
  tag?: MockTag | null;
  reviewedBy?: MockUser | null;
}

/**
 * Helper to create a mock User
 */
const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-123',
  displayName: 'Test User',
  ...overrides,
});

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
 * Helper to create a mock TierAppeal
 */
const createMockAppeal = (overrides: Partial<MockTierAppeal> = {}): MockTierAppeal => ({
  id: 'appeal-123',
  userId: 'user-123',
  appealType: TierAppealType.GLOBAL_TIER,
  tagId: null,
  requestedLevel: 2, // TRUSTED tier
  reason: 'I have been contributing quality content consistently',
  status: TierAppealStatus.PENDING,
  reviewedById: null,
  reviewNotes: null,
  createdAt: new Date(),
  resolvedAt: null,
  ...overrides,
});

describe('AppealService', () => {
  let service: AppealService;
  let mockPrisma: {
    tierAppeal: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    tag: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    userRank: { update: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
    topicExpertise: { update: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  };
  let mockRankingService: {
    recalculateUserRank: ReturnType<typeof vi.fn>;
  };
  let mockExpertiseService: {
    recalculateExpertise: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Prisma service
    mockPrisma = {
      tierAppeal: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      tag: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      userRank: {
        update: vi.fn(),
        upsert: vi.fn(),
      },
      topicExpertise: {
        update: vi.fn(),
        upsert: vi.fn(),
      },
    };

    // Create mock RankingService
    mockRankingService = {
      recalculateUserRank: vi.fn(),
    };

    // Create mock ExpertiseService
    mockExpertiseService = {
      recalculateExpertise: vi.fn(),
    };

    // Instantiate the service
    service = new AppealService(
      mockPrisma as unknown as PrismaService,
      mockRankingService as unknown as RankingService,
      mockExpertiseService as unknown as ExpertiseService,
    );
  });

  describe('submitAppeal', () => {
    it('should create a GLOBAL_TIER appeal with PENDING status', async () => {
      const mockUser = createMockUser();
      const mockAppeal = createMockAppeal({
        user: mockUser,
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null); // No recent appeals
      mockPrisma.tierAppeal.create.mockResolvedValue(mockAppeal);

      const result = await service.submitAppeal('user-123', {
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2,
        reason: 'I have been contributing quality content consistently',
      });

      expect(result.status).toBe(TierAppealStatus.PENDING);
      expect(result.userId).toBe('user-123');
      expect(result.appealType).toBe(TierAppealType.GLOBAL_TIER);
      expect(result.requestedLevel).toBe(2);
      expect(mockPrisma.tierAppeal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            appealType: TierAppealType.GLOBAL_TIER,
            requestedLevel: 2,
            status: TierAppealStatus.PENDING,
          }),
        }),
      );
    });

    it('should create a DOMAIN_EXPERTISE appeal with categoryId', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();
      const mockAppeal = createMockAppeal({
        appealType: TierAppealType.DOMAIN_EXPERTISE,
        tagId: 'tag-123',
        requestedLevel: 3, // EXPERT expertise
        user: mockUser,
        tag: mockTag,
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);
      mockPrisma.tierAppeal.create.mockResolvedValue(mockAppeal);

      const result = await service.submitAppeal('user-123', {
        appealType: TierAppealType.DOMAIN_EXPERTISE,
        categoryId: 'tag-123',
        requestedLevel: 3,
        reason: 'I have a PhD in this field',
      });

      expect(result.appealType).toBe(TierAppealType.DOMAIN_EXPERTISE);
      expect(result.categoryId).toBe('tag-123');
      expect(result.categoryName).toBe('Climate Science');
    });

    it('should enforce 30-day limit between appeals', async () => {
      const mockUser = createMockUser();
      const recentAppeal = createMockAppeal({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(recentAppeal);

      await expect(
        service.submitAppeal('user-123', {
          appealType: TierAppealType.GLOBAL_TIER,
          requestedLevel: 2,
          reason: 'Please reconsider',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require categoryId for DOMAIN_EXPERTISE appeals', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAppeal('user-123', {
          appealType: TierAppealType.DOMAIN_EXPERTISE,
          requestedLevel: 2,
          reason: 'I have expertise in this area',
          // Missing categoryId
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAppeal('nonexistent-user', {
          appealType: TierAppealType.GLOBAL_TIER,
          requestedLevel: 2,
          reason: 'Please consider',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tag.findUnique.mockResolvedValue(null);
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAppeal('user-123', {
          appealType: TierAppealType.DOMAIN_EXPERTISE,
          categoryId: 'nonexistent-tag',
          requestedLevel: 2,
          reason: 'I have expertise',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserAppeals', () => {
    it("should return all of a user's appeals", async () => {
      const mockUser = createMockUser();
      const mockAppeals = [
        createMockAppeal({ id: 'appeal-1', user: mockUser }),
        createMockAppeal({
          id: 'appeal-2',
          appealType: TierAppealType.DOMAIN_EXPERTISE,
          tagId: 'tag-123',
          user: mockUser,
          tag: createMockTag(),
        }),
      ];

      mockPrisma.tierAppeal.findMany.mockResolvedValue(mockAppeals);

      const result = await service.getUserAppeals('user-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.tierAppeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        }),
      );
    });

    it('should return empty array when user has no appeals', async () => {
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      const result = await service.getUserAppeals('user-123');

      expect(result).toEqual([]);
    });

    it('should order appeals by creation date descending', async () => {
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      await service.getUserAppeals('user-123');

      expect(mockPrisma.tierAppeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getAppeal', () => {
    it('should return a specific appeal by ID', async () => {
      const mockUser = createMockUser();
      const mockAppeal = createMockAppeal({ user: mockUser });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(mockAppeal);

      const result = await service.getAppeal('appeal-123');

      expect(result.id).toBe('appeal-123');
      expect(result.userName).toBe('Test User');
      expect(mockPrisma.tierAppeal.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appeal-123' },
        }),
      );
    });

    it('should throw NotFoundException when appeal does not exist', async () => {
      mockPrisma.tierAppeal.findUnique.mockResolvedValue(null);

      await expect(service.getAppeal('nonexistent-appeal')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingAppeals', () => {
    it('should return all pending appeals for admin review', async () => {
      const mockUser = createMockUser();
      const mockAppeals = [
        createMockAppeal({ id: 'appeal-1', status: TierAppealStatus.PENDING, user: mockUser }),
        createMockAppeal({ id: 'appeal-2', status: TierAppealStatus.PENDING, user: mockUser }),
      ];

      mockPrisma.tierAppeal.findMany.mockResolvedValue(mockAppeals);

      const result = await service.getPendingAppeals();

      expect(result).toHaveLength(2);
      expect(result.every((a) => a.status === TierAppealStatus.PENDING)).toBe(true);
      expect(mockPrisma.tierAppeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: TierAppealStatus.PENDING },
        }),
      );
    });

    it('should return empty array when no pending appeals', async () => {
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      const result = await service.getPendingAppeals();

      expect(result).toEqual([]);
    });

    it('should order pending appeals by creation date ascending (oldest first)', async () => {
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      await service.getPendingAppeals();

      expect(mockPrisma.tierAppeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('approveAppeal', () => {
    it('should update appeal status to APPROVED', async () => {
      const mockUser = createMockUser();
      const mockAdmin = createMockUser({ id: 'admin-123', displayName: 'Admin User' });
      const pendingAppeal = createMockAppeal({
        status: TierAppealStatus.PENDING,
        user: mockUser,
      });
      const approvedAppeal = createMockAppeal({
        status: TierAppealStatus.APPROVED,
        reviewedById: 'admin-123',
        reviewNotes: 'Appeal approved based on contribution history',
        resolvedAt: new Date(),
        user: mockUser,
        reviewedBy: mockAdmin,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.tierAppeal.update.mockResolvedValue(approvedAppeal);
      mockPrisma.userRank.upsert.mockResolvedValue({});

      const result = await service.approveAppeal(
        'appeal-123',
        'admin-123',
        'Appeal approved based on contribution history',
      );

      expect(result.status).toBe(TierAppealStatus.APPROVED);
      expect(result.reviewedBy).toBe('admin-123');
      expect(result.reviewNotes).toBe('Appeal approved based on contribution history');
      expect(result.resolvedAt).toBeDefined();
    });

    it('should trigger tier bump for GLOBAL_TIER appeals', async () => {
      const mockUser = createMockUser();
      const pendingAppeal = createMockAppeal({
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2, // TRUSTED
        status: TierAppealStatus.PENDING,
        user: mockUser,
      });
      const approvedAppeal = createMockAppeal({
        ...pendingAppeal,
        status: TierAppealStatus.APPROVED,
        reviewedById: 'admin-123',
        resolvedAt: new Date(),
        user: mockUser,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.tierAppeal.update.mockResolvedValue(approvedAppeal);
      mockPrisma.userRank.upsert.mockResolvedValue({});

      await service.approveAppeal('appeal-123', 'admin-123');

      expect(mockPrisma.userRank.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          update: expect.objectContaining({
            tierLevel: 'TRUSTED',
          }),
        }),
      );
    });

    it('should trigger expertise bump for DOMAIN_EXPERTISE appeals', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag();
      const pendingAppeal = createMockAppeal({
        appealType: TierAppealType.DOMAIN_EXPERTISE,
        tagId: 'tag-123',
        requestedLevel: 3, // EXPERT expertise
        status: TierAppealStatus.PENDING,
        user: mockUser,
        tag: mockTag,
      });
      const approvedAppeal = createMockAppeal({
        ...pendingAppeal,
        status: TierAppealStatus.APPROVED,
        reviewedById: 'admin-123',
        resolvedAt: new Date(),
        user: mockUser,
        tag: mockTag,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.tierAppeal.update.mockResolvedValue(approvedAppeal);
      mockPrisma.topicExpertise.upsert.mockResolvedValue({});

      await service.approveAppeal('appeal-123', 'admin-123');

      expect(mockPrisma.topicExpertise.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_tagId: {
              userId: 'user-123',
              tagId: 'tag-123',
            },
          },
          update: expect.objectContaining({
            expertiseLevel: 'EXPERT',
          }),
        }),
      );
    });

    it('should throw NotFoundException when appeal does not exist', async () => {
      mockPrisma.tierAppeal.findUnique.mockResolvedValue(null);

      await expect(service.approveAppeal('nonexistent-appeal', 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when appeal is not pending', async () => {
      const mockUser = createMockUser();
      const approvedAppeal = createMockAppeal({
        status: TierAppealStatus.APPROVED,
        user: mockUser,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(approvedAppeal);

      await expect(service.approveAppeal('appeal-123', 'admin-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('denyAppeal', () => {
    it('should update appeal status to DENIED with reason', async () => {
      const mockUser = createMockUser();
      const mockAdmin = createMockUser({ id: 'admin-123', displayName: 'Admin User' });
      const pendingAppeal = createMockAppeal({
        status: TierAppealStatus.PENDING,
        user: mockUser,
      });
      const deniedAppeal = createMockAppeal({
        status: TierAppealStatus.DENIED,
        reviewedById: 'admin-123',
        reviewNotes: 'Insufficient contribution history to justify tier advancement',
        resolvedAt: new Date(),
        user: mockUser,
        reviewedBy: mockAdmin,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.tierAppeal.update.mockResolvedValue(deniedAppeal);

      const result = await service.denyAppeal(
        'appeal-123',
        'admin-123',
        'Insufficient contribution history to justify tier advancement',
      );

      expect(result.status).toBe(TierAppealStatus.DENIED);
      expect(result.reviewedBy).toBe('admin-123');
      expect(result.reviewNotes).toBe(
        'Insufficient contribution history to justify tier advancement',
      );
      expect(result.resolvedAt).toBeDefined();
      expect(mockPrisma.tierAppeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appeal-123' },
          data: expect.objectContaining({
            status: TierAppealStatus.DENIED,
            reviewedById: 'admin-123',
            reviewNotes: 'Insufficient contribution history to justify tier advancement',
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when appeal does not exist', async () => {
      mockPrisma.tierAppeal.findUnique.mockResolvedValue(null);

      await expect(service.denyAppeal('nonexistent-appeal', 'admin-123', 'Denied')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when appeal is not pending', async () => {
      const mockUser = createMockUser();
      const deniedAppeal = createMockAppeal({
        status: TierAppealStatus.DENIED,
        user: mockUser,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(deniedAppeal);

      await expect(service.denyAppeal('appeal-123', 'admin-123', 'Already denied')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not trigger any tier/expertise changes on denial', async () => {
      const mockUser = createMockUser();
      const pendingAppeal = createMockAppeal({
        status: TierAppealStatus.PENDING,
        user: mockUser,
      });
      const deniedAppeal = createMockAppeal({
        status: TierAppealStatus.DENIED,
        user: mockUser,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.tierAppeal.update.mockResolvedValue(deniedAppeal);

      await service.denyAppeal('appeal-123', 'admin-123', 'Denied');

      expect(mockPrisma.userRank.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.topicExpertise.upsert).not.toHaveBeenCalled();
    });
  });

  describe('canSubmitAppeal', () => {
    it('should return true when user has no recent appeals', async () => {
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);

      const result = await service.canSubmitAppeal('user-123');

      expect(result).toBe(true);
    });

    it('should return false when user has an appeal within 30 days', async () => {
      const recentAppeal = createMockAppeal({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      });

      mockPrisma.tierAppeal.findFirst.mockResolvedValue(recentAppeal);

      const result = await service.canSubmitAppeal('user-123');

      expect(result).toBe(false);
    });

    it('should return true when last appeal was over 30 days ago', async () => {
      // When the appeal is older than 30 days, Prisma's date filter (gte: cooldownDate)
      // means findFirst returns null because no appeals match the "within 30 days" criteria
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);

      const result = await service.canSubmitAppeal('user-123');

      expect(result).toBe(true);
    });
  });

  describe('getAppealEligibility', () => {
    it('should return canSubmit: true when user has no recent appeals', async () => {
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);

      const result = await service.getAppealEligibility('user-123');

      expect(result.canSubmit).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.nextEligibleDate).toBeUndefined();
    });

    it('should return canSubmit: false with reason when user has appeal within 30 days', async () => {
      const recentAppeal = createMockAppeal({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      });

      mockPrisma.tierAppeal.findFirst.mockResolvedValue(recentAppeal);

      const result = await service.getAppealEligibility('user-123');

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('You can only submit one appeal every 30 days');
      expect(result.nextEligibleDate).toBeDefined();
    });

    it('should calculate correct nextEligibleDate based on last appeal', async () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const recentAppeal = createMockAppeal({
        createdAt: fifteenDaysAgo,
      });

      mockPrisma.tierAppeal.findFirst.mockResolvedValue(recentAppeal);

      const result = await service.getAppealEligibility('user-123');

      // Next eligible date should be 30 days after the last appeal
      const expectedNextDate = new Date(fifteenDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(result.nextEligibleDate).toEqual(expectedNextDate);
    });

    it('should return canSubmit: true when last appeal was over 30 days ago', async () => {
      // When the appeal is older than 30 days, Prisma's date filter (gte: cooldownDate)
      // means findFirst returns null because no appeals match the "within 30 days" criteria
      mockPrisma.tierAppeal.findFirst.mockResolvedValue(null);

      const result = await service.getAppealEligibility('user-123');

      expect(result.canSubmit).toBe(true);
    });
  });

  describe('AppealDto transformation', () => {
    it('should include userName in the result', async () => {
      const mockUser = createMockUser({ displayName: 'John Doe' });
      const mockAppeal = createMockAppeal({ user: mockUser });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(mockAppeal);

      const result = await service.getAppeal('appeal-123');

      expect(result.userName).toBe('John Doe');
    });

    it('should include categoryName for domain expertise appeals', async () => {
      const mockUser = createMockUser();
      const mockTag = createMockTag({ name: 'Environmental Science' });
      const mockAppeal = createMockAppeal({
        appealType: TierAppealType.DOMAIN_EXPERTISE,
        tagId: 'tag-123',
        user: mockUser,
        tag: mockTag,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(mockAppeal);

      const result = await service.getAppeal('appeal-123');

      expect(result.categoryName).toBe('Environmental Science');
    });

    it('should include requestedLevelName based on appeal type', async () => {
      const mockUser = createMockUser();
      const globalTierAppeal = createMockAppeal({
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2, // TRUSTED
        user: mockUser,
      });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(globalTierAppeal);

      const result = await service.getAppeal('appeal-123');

      expect(result.requestedLevelName).toBe('Trusted');
    });

    it('should handle null displayName gracefully', async () => {
      const mockUser = createMockUser({ displayName: null });
      const mockAppeal = createMockAppeal({ user: mockUser });

      mockPrisma.tierAppeal.findUnique.mockResolvedValue(mockAppeal);

      const result = await service.getAppeal('appeal-123');

      expect(result.userName).toBe('Unknown');
    });
  });
});
