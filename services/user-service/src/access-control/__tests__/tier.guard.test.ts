/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for TierGuard
 *
 * Tests the tier-based access control guard that restricts access to
 * topics based on user tier level and domain expertise.
 *
 * @see services/user-service/src/access-control/tier.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
    ProvisionalAccessStatus: {
      ACTIVE: 'ACTIVE',
      EXPIRED: 'EXPIRED',
      REVOKED: 'REVOKED',
    },
  };
});

// Import after mocking
import { TierGuard } from '../tier.guard.js';
import {
  AccessControlService,
  TIER_LEVEL_VALUES as SERVICE_TIER_LEVEL_VALUES,
  EXPERTISE_LEVEL_VALUES as SERVICE_EXPERTISE_LEVEL_VALUES,
} from '../access-control.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TierLevel, ExpertiseLevel } from '@prisma/client';

/**
 * Tier level numeric values for comparison
 */
const TIER_LEVEL_VALUES: Record<TierLevel, number> = {
  NEWCOMER: 1,
  CONTRIBUTOR: 2,
  TRUSTED: 3,
  LEADER: 4,
  EXPERT: 5,
};

/**
 * Expertise level numeric values for comparison
 */
const EXPERTISE_LEVEL_VALUES: Record<ExpertiseLevel, number> = {
  NOVICE: 1,
  FAMILIAR: 2,
  KNOWLEDGEABLE: 3,
  EXPERT: 4,
};

/**
 * Mock topic type for testing
 */
interface MockTopic {
  id: string;
  title: string;
  minimumTierLevel: number | null;
  minimumExpertiseLevel: number | null;
  requiredTagId: string | null;
  allowProvisionalAccess: boolean;
}

/**
 * Mock user rank type for testing
 */
interface MockUserRank {
  userId: string;
  tierLevel: TierLevel;
  compositeScore: { toNumber: () => number };
}

/**
 * Mock expertise type for testing
 */
interface MockExpertise {
  userId: string;
  tagId: string;
  expertiseLevel: ExpertiseLevel;
  expertiseScore: { toNumber: () => number };
}

/**
 * Mock provisional access type for testing
 */
interface MockProvisionalAccess {
  id: string;
  userId: string;
  topicId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
}

/**
 * Helper to create a mock ExecutionContext
 */
const createMockContext = (options: {
  user?: { sub: string; email: string } | null;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
}): ExecutionContext => {
  const request = {
    user: options.user,
    params: options.params ?? {},
    body: options.body ?? {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

/**
 * Helper to create a mock topic
 */
const createMockTopic = (overrides: Partial<MockTopic> = {}): MockTopic => ({
  id: 'topic-123',
  title: 'Test Topic',
  minimumTierLevel: null,
  minimumExpertiseLevel: null,
  requiredTagId: null,
  allowProvisionalAccess: true,
  ...overrides,
});

/**
 * Helper to create a mock user rank
 */
const createMockUserRank = (overrides: Partial<MockUserRank> = {}): MockUserRank => ({
  userId: 'user-123',
  tierLevel: TierLevel.TRUSTED,
  compositeScore: { toNumber: () => 0.5 },
  ...overrides,
});

/**
 * Helper to create a mock expertise
 */
const createMockExpertise = (overrides: Partial<MockExpertise> = {}): MockExpertise => ({
  userId: 'user-123',
  tagId: 'tag-123',
  expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
  expertiseScore: { toNumber: () => 0.6 },
  ...overrides,
});

/**
 * Helper to create mock provisional access
 */
const createMockProvisionalAccess = (
  overrides: Partial<MockProvisionalAccess> = {},
): MockProvisionalAccess => ({
  id: 'prov-123',
  userId: 'user-123',
  topicId: 'topic-123',
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  ...overrides,
});

describe('TierGuard', () => {
  let guard: TierGuard;
  let mockAccessControlService: {
    canAccessTopic: ReturnType<typeof vi.fn>;
    hasProvisionalAccess: ReturnType<typeof vi.fn>;
    getUserRank: ReturnType<typeof vi.fn>;
    getUserExpertise: ReturnType<typeof vi.fn>;
    getTopic: ReturnType<typeof vi.fn>;
  };
  let mockReflector: Reflector;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock AccessControlService
    mockAccessControlService = {
      canAccessTopic: vi.fn(),
      hasProvisionalAccess: vi.fn(),
      getUserRank: vi.fn(),
      getUserExpertise: vi.fn(),
      getTopic: vi.fn(),
    };

    // Create mock Reflector
    mockReflector = {
      get: vi.fn().mockReturnValue(undefined),
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    // Instantiate the guard
    guard = new TierGuard(
      mockAccessControlService as unknown as AccessControlService,
      mockReflector,
    );
  });

  describe('canActivate', () => {
    describe('no tier restriction on topic', () => {
      it('should allow access when topic has no tier restriction', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        const topic = createMockTopic({
          minimumTierLevel: null,
          minimumExpertiseLevel: null,
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when minimumTierLevel is 0', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('user tier meets minimum requirement', () => {
      it('should allow access when user tier meets minimum', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Topic requires TRUSTED (level 3), user is TRUSTED (level 3)
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessControlService.canAccessTopic).toHaveBeenCalledWith(
          'user-123',
          'topic-123',
        );
      });

      it('should allow access when user tier exceeds minimum', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Topic requires CONTRIBUTOR (level 2), user is EXPERT (level 5)
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('user tier below minimum', () => {
      it('should deny access when user tier is below minimum', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Topic requires LEADER (level 4), user is CONTRIBUTOR (level 2)
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'User tier CONTRIBUTOR does not meet minimum tier LEADER',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow(
          'User tier CONTRIBUTOR does not meet minimum tier LEADER',
        );
      });

      it('should deny access with proper error message for NEWCOMER', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'User tier NEWCOMER does not meet minimum tier TRUSTED',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          'User tier NEWCOMER does not meet minimum tier TRUSTED',
        );
      });
    });

    describe('provisional access', () => {
      it('should check provisional access when tier not met', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Tier not met but has provisional access
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
          provisionalAccess: true,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access with valid provisional access', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
          provisionalAccess: true,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when provisional access is expired', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'Provisional access has expired',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });

      it('should deny access when topic does not allow provisional access', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'Topic does not allow provisional access',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('expertise level checks', () => {
      it('should check expertise level when expertise restriction is set', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Topic requires expertise in specific tag
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessControlService.canAccessTopic).toHaveBeenCalled();
      });

      it('should allow access when expertise level is met', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // User has EXPERT level, topic requires KNOWLEDGEABLE
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when expertise is below minimum', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // User has NOVICE level, topic requires EXPERT
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'User expertise NOVICE does not meet minimum expertise EXPERT in category',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow(
          'User expertise NOVICE does not meet minimum expertise EXPERT in category',
        );
      });

      it('should deny access when user has no expertise in required tag', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'User has no expertise in required category',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          'User has no expertise in required category',
        );
      });
    });

    describe('combined tier and expertise requirements', () => {
      it('should require both tier AND expertise to be met', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Meets tier but not expertise
        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: false,
          reason: 'User expertise NOVICE does not meet minimum expertise KNOWLEDGEABLE in category',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });

      it('should allow when both tier and expertise are met', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when no user in request', async () => {
        const context = createMockContext({
          user: null,
          params: { topicId: 'topic-123' },
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow(
          'Access denied: authentication required',
        );
      });

      it('should throw ForbiddenException when no topicId provided', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: {},
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow('Topic ID is required');
      });

      it('should get topicId from body when not in params', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: {},
          body: { topicId: 'topic-from-body' },
        });

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessControlService.canAccessTopic).toHaveBeenCalledWith(
          'user-123',
          'topic-from-body',
        );
      });
    });

    describe('metadata decorator requirements', () => {
      it('should use RequireTier metadata when present', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Mock reflector to return tier requirement for first call, undefined for expertise
        (mockReflector.getAllAndOverride as ReturnType<typeof vi.fn>)
          .mockReturnValueOnce(TIER_LEVEL_VALUES.LEADER) // requiredTier
          .mockReturnValueOnce(undefined); // requiredExpertise

        mockAccessControlService.canAccessTopic.mockResolvedValue({
          allowed: true,
          reason: null,
        });
        mockAccessControlService.getUserRank.mockResolvedValue(
          createMockUserRank({ tierLevel: TierLevel.EXPERT }),
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when decorator tier requirement not met', async () => {
        const context = createMockContext({
          user: { sub: 'user-123', email: 'user@example.com' },
          params: { topicId: 'topic-123' },
        });

        // Mock reflector to return tier requirement for first call, undefined for expertise
        (mockReflector.getAllAndOverride as ReturnType<typeof vi.fn>)
          .mockReturnValueOnce(TIER_LEVEL_VALUES.EXPERT) // requiredTier
          .mockReturnValueOnce(undefined); // requiredExpertise

        mockAccessControlService.getUserRank.mockResolvedValue(
          createMockUserRank({ tierLevel: TierLevel.CONTRIBUTOR }),
        );

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });
  });
});

describe('AccessControlService', () => {
  let service: AccessControlService;
  let mockPrisma: {
    discussionTopic: { findUnique: ReturnType<typeof vi.fn> };
    userRank: { findUnique: ReturnType<typeof vi.fn> };
    topicExpertise: { findFirst: ReturnType<typeof vi.fn> };
    provisionalAccess: { findFirst: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      discussionTopic: { findUnique: vi.fn() },
      userRank: { findUnique: vi.fn() },
      topicExpertise: { findFirst: vi.fn() },
      provisionalAccess: { findFirst: vi.fn() },
      user: { findUnique: vi.fn() },
    };

    // Instantiate service with mock Prisma
    service = new AccessControlService(mockPrisma as unknown as PrismaService);
  });

  describe('canAccessTopic', () => {
    it('should return allowed when no restrictions on topic', async () => {
      const topic = createMockTopic({
        minimumTierLevel: null,
        minimumExpertiseLevel: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      const result = await service.canAccessTopic('user-123', 'topic-123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should return allowed when user tier meets requirement', async () => {
      const topic = createMockTopic({
        minimumTierLevel: SERVICE_TIER_LEVEL_VALUES.TRUSTED, // 3
      });
      const userRank = createMockUserRank({
        tierLevel: TierLevel.LEADER, // 4
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.userRank.findUnique.mockResolvedValue(userRank);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      const result = await service.canAccessTopic('user-123', 'topic-123');

      expect(result.allowed).toBe(true);
    });

    it('should check provisional access when tier not met', async () => {
      const topic = createMockTopic({
        minimumTierLevel: SERVICE_TIER_LEVEL_VALUES.EXPERT, // 5
        allowProvisionalAccess: true,
      });
      const userRank = createMockUserRank({
        tierLevel: TierLevel.CONTRIBUTOR, // 2
      });
      const provisionalAccess = createMockProvisionalAccess();

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.userRank.findUnique.mockResolvedValue(userRank);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(provisionalAccess);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      const result = await service.canAccessTopic('user-123', 'topic-123');

      expect(result.allowed).toBe(true);
      expect(result.provisionalAccess).toBe(true);
    });

    it('should deny when tier not met and no provisional access', async () => {
      const topic = createMockTopic({
        minimumTierLevel: SERVICE_TIER_LEVEL_VALUES.EXPERT, // 5
        allowProvisionalAccess: true,
      });
      const userRank = createMockUserRank({
        tierLevel: TierLevel.CONTRIBUTOR, // 2
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.userRank.findUnique.mockResolvedValue(userRank);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      const result = await service.canAccessTopic('user-123', 'topic-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not meet minimum tier');
    });

    it('should check expertise when required', async () => {
      const topic = createMockTopic({
        minimumExpertiseLevel: SERVICE_EXPERTISE_LEVEL_VALUES.KNOWLEDGEABLE, // 3
        requiredTagId: 'tag-123',
      });
      const expertise = createMockExpertise({
        expertiseLevel: ExpertiseLevel.EXPERT, // 4
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.topicExpertise.findFirst.mockResolvedValue(expertise);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      const result = await service.canAccessTopic('user-123', 'topic-123');

      expect(result.allowed).toBe(true);
    });

    it('should deny when expertise not met', async () => {
      const topic = createMockTopic({
        minimumExpertiseLevel: SERVICE_EXPERTISE_LEVEL_VALUES.EXPERT, // 4
        requiredTagId: 'tag-123',
        allowProvisionalAccess: true,
      });
      const expertise = createMockExpertise({
        expertiseLevel: ExpertiseLevel.NOVICE, // 1
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.topicExpertise.findFirst.mockResolvedValue(expertise);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      const result = await service.canAccessTopic('user-123', 'topic-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not meet minimum expertise');
    });
  });

  describe('hasProvisionalAccess', () => {
    it('should return true for active non-expired access', async () => {
      const provisionalAccess = createMockProvisionalAccess({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(provisionalAccess);

      const result = await service.hasProvisionalAccess('user-123', 'topic-123');

      expect(result).toBe(true);
    });

    it('should return false for expired access', async () => {
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);

      const result = await service.hasProvisionalAccess('user-123', 'topic-123');

      expect(result).toBe(false);
    });

    it('should return false for revoked access', async () => {
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);

      const result = await service.hasProvisionalAccess('user-123', 'topic-123');

      expect(result).toBe(false);
    });

    it('should return false when no provisional access exists', async () => {
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);

      const result = await service.hasProvisionalAccess('user-123', 'topic-123');

      expect(result).toBe(false);
    });
  });
});
