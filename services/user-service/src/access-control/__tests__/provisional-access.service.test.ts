/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ProvisionalAccessService
 *
 * Tests the provisional access management functionality including:
 * - Requesting access to restricted topics
 * - Getting pending access requests for a topic
 * - Approving and denying access requests
 * - Revoking active provisional access
 * - Getting user's active provisional access
 *
 * @see services/user-service/src/access-control/provisional-access.service.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

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
    ProvisionalAccessStatus: {
      ACTIVE: 'ACTIVE',
      EXPIRED: 'EXPIRED',
      REVOKED: 'REVOKED',
    },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
  };
});

// Import after mocking
import { ProvisionalAccessService } from '../provisional-access.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Mock user type for testing
 */
interface MockUser {
  id: string;
  cognitoSub: string;
  displayName: string | null;
  email: string;
}

/**
 * Mock topic type for testing
 */
interface MockTopic {
  id: string;
  title: string;
  creatorId: string;
  allowProvisionalAccess: boolean;
  minimumTierLevel: number | null;
}

/**
 * Mock provisional access type for testing
 */
interface MockProvisionalAccess {
  id: string;
  userId: string;
  topicId: string;
  grantedById: string;
  reason: string | null;
  expiresAt: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  user?: MockUser;
  topic?: MockTopic;
  grantedBy?: MockUser;
}

/**
 * Mock access request type for testing (provisional access with PENDING-like semantics)
 * Note: Access requests are stored as provisional access records without grantedById
 */
interface MockAccessRequest {
  id: string;
  userId: string;
  topicId: string;
  grantedById: string | null;
  reason: string | null;
  expiresAt: Date | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  user?: MockUser;
  topic?: MockTopic;
}

/**
 * Helper to create a mock user
 */
const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-123',
  cognitoSub: 'cognito-123',
  displayName: 'Test User',
  email: 'test@example.com',
  ...overrides,
});

/**
 * Helper to create a mock topic
 */
const createMockTopic = (overrides: Partial<MockTopic> = {}): MockTopic => ({
  id: 'topic-123',
  title: 'Test Topic',
  creatorId: 'creator-123',
  allowProvisionalAccess: true,
  minimumTierLevel: 3, // TRUSTED
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
  grantedById: 'creator-123',
  reason: 'Approved for good standing',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  status: 'ACTIVE',
  createdAt: new Date(),
  ...overrides,
});

/**
 * Helper to create mock access request (pending provisional access)
 */
const createMockAccessRequest = (
  overrides: Partial<MockAccessRequest> = {},
): MockAccessRequest => ({
  id: 'req-123',
  userId: 'user-123',
  topicId: 'topic-123',
  grantedById: null, // Not yet approved
  reason: 'I would like to contribute to this discussion',
  expiresAt: null,
  status: 'ACTIVE', // We use a different field to track pending vs active
  createdAt: new Date(),
  ...overrides,
});

describe('ProvisionalAccessService', () => {
  let service: ProvisionalAccessService;
  let mockPrisma: {
    provisionalAccess: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    discussionTopic: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      provisionalAccess: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      discussionTopic: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
    };

    // Instantiate service with mock Prisma
    service = new ProvisionalAccessService(mockPrisma as unknown as PrismaService);
  });

  describe('requestAccess', () => {
    it('should create a pending access request', async () => {
      const user = createMockUser({ cognitoSub: 'cognito-user-123', id: 'user-123' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });
      const accessRequest = createMockAccessRequest({
        userId: 'user-123',
        topicId: 'topic-123',
      });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null); // No existing request
      mockPrisma.provisionalAccess.create.mockResolvedValue(accessRequest);

      await service.requestAccess('cognito-user-123', 'topic-123', 'I want to contribute');

      expect(mockPrisma.provisionalAccess.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            topicId: 'topic-123',
            reason: 'I want to contribute',
          }),
        }),
      );
    });

    it('should prevent duplicate access requests', async () => {
      const user = createMockUser({ cognitoSub: 'cognito-user-123', id: 'user-123' });
      const topic = createMockTopic({ id: 'topic-123' });
      const existingRequest = createMockAccessRequest();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(existingRequest);

      await expect(
        service.requestAccess('cognito-user-123', 'topic-123', 'Duplicate request'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestAccess('cognito-user-123', 'topic-123', 'Duplicate request'),
      ).rejects.toThrow('Access request already exists');
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      const user = createMockUser({ cognitoSub: 'cognito-user-123' });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.requestAccess('cognito-user-123', 'nonexistent-topic', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when topic does not allow provisional access', async () => {
      const user = createMockUser({ cognitoSub: 'cognito-user-123', id: 'user-123' });
      const topic = createMockTopic({ allowProvisionalAccess: false });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(
        service.requestAccess('cognito-user-123', 'topic-123', 'reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestAccess('cognito-user-123', 'topic-123', 'reason'),
      ).rejects.toThrow('Topic does not allow provisional access');
    });
  });

  describe('getAccessRequests', () => {
    it('should return pending access requests for a topic', async () => {
      const requests = [
        createMockAccessRequest({
          id: 'req-1',
          userId: 'user-1',
          user: createMockUser({ id: 'user-1', displayName: 'User One' }),
          topic: createMockTopic(),
        }),
        createMockAccessRequest({
          id: 'req-2',
          userId: 'user-2',
          user: createMockUser({ id: 'user-2', displayName: 'User Two' }),
          topic: createMockTopic(),
        }),
      ];

      mockPrisma.provisionalAccess.findMany.mockResolvedValue(requests);

      const result = await service.getAccessRequests('topic-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.provisionalAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topicId: 'topic-123',
            expiresAt: new Date(0), // Pending requests use epoch date as marker
          }),
        }),
      );
    });

    it('should return empty array when no pending requests', async () => {
      mockPrisma.provisionalAccess.findMany.mockResolvedValue([]);

      const result = await service.getAccessRequests('topic-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('approveAccess', () => {
    it('should create active provisional access with 30-day expiration', async () => {
      const user = createMockUser({ id: 'user-123', displayName: 'Test User' });
      const granter = createMockUser({
        id: 'creator-123',
        cognitoSub: 'cognito-creator',
        displayName: 'Topic Creator',
      });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });
      const pendingRequest = createMockAccessRequest({
        id: 'req-123',
        userId: 'user-123',
        topicId: 'topic-123',
        grantedById: null,
        user,
        topic,
      });
      const approvedAccess = createMockProvisionalAccess({
        id: 'req-123',
        userId: 'user-123',
        topicId: 'topic-123',
        grantedById: 'creator-123',
        user,
        topic,
        grantedBy: granter,
      });

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(granter) // First call for granter
        .mockResolvedValueOnce(user); // Second call for user
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(pendingRequest);
      mockPrisma.provisionalAccess.update.mockResolvedValue(approvedAccess);

      const result = await service.approveAccess(
        'topic-123',
        'user-123',
        'cognito-creator',
        'Approved for contribution',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.provisionalAccess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-123' },
          data: expect.objectContaining({
            grantedById: 'creator-123',
            reason: 'Approved for contribution',
            status: 'ACTIVE',
            expiresAt: expect.any(Date),
          }),
        }),
      );

      // Verify 30-day expiration
      const updateCall = mockPrisma.provisionalAccess.update.mock.calls[0][0];
      const expiresAt = updateCall.data.expiresAt as Date;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      // Allow 1 hour tolerance (setDate may have slight variance)
      expect(Math.abs(expiresAt.getTime() - thirtyDaysFromNow.getTime())).toBeLessThan(3600000);
    });

    it('should throw NotFoundException when no pending request exists', async () => {
      const granter = createMockUser({ id: 'creator-123', cognitoSub: 'cognito-creator' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });

      mockPrisma.user.findUnique.mockResolvedValue(granter);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.approveAccess('topic-123', 'user-123', 'cognito-creator'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when granter is not topic creator', async () => {
      const granter = createMockUser({ id: 'other-user', cognitoSub: 'cognito-other' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });

      mockPrisma.user.findUnique.mockResolvedValue(granter);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.approveAccess('topic-123', 'user-123', 'cognito-other')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('denyAccess', () => {
    it('should remove pending access request', async () => {
      const denier = createMockUser({ id: 'creator-123', cognitoSub: 'cognito-creator' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });
      const pendingRequest = createMockAccessRequest({
        id: 'req-123',
        userId: 'user-123',
        topicId: 'topic-123',
      });

      mockPrisma.user.findUnique.mockResolvedValue(denier);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(pendingRequest);
      mockPrisma.provisionalAccess.delete.mockResolvedValue(pendingRequest);

      await service.denyAccess('topic-123', 'user-123', 'cognito-creator');

      expect(mockPrisma.provisionalAccess.delete).toHaveBeenCalledWith({
        where: { id: 'req-123' },
      });
    });

    it('should throw NotFoundException when no pending request exists', async () => {
      const denier = createMockUser({ id: 'creator-123', cognitoSub: 'cognito-creator' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });

      mockPrisma.user.findUnique.mockResolvedValue(denier);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);

      await expect(service.denyAccess('topic-123', 'user-123', 'cognito-creator')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when denier is not topic creator', async () => {
      const denier = createMockUser({ id: 'other-user', cognitoSub: 'cognito-other' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });

      mockPrisma.user.findUnique.mockResolvedValue(denier);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.denyAccess('topic-123', 'user-123', 'cognito-other')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revokeAccess', () => {
    it('should revoke active provisional access', async () => {
      const revoker = createMockUser({ id: 'creator-123', cognitoSub: 'cognito-creator' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });
      const activeAccess = createMockProvisionalAccess({
        id: 'prov-123',
        userId: 'user-123',
        topicId: 'topic-123',
        status: 'ACTIVE',
      });
      const revokedAccess = { ...activeAccess, status: 'REVOKED' as const };

      mockPrisma.user.findUnique.mockResolvedValue(revoker);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(activeAccess);
      mockPrisma.provisionalAccess.update.mockResolvedValue(revokedAccess);

      await service.revokeAccess('topic-123', 'user-123', 'cognito-creator');

      expect(mockPrisma.provisionalAccess.update).toHaveBeenCalledWith({
        where: { id: 'prov-123' },
        data: { status: 'REVOKED' },
      });
    });

    it('should throw NotFoundException when no active access exists', async () => {
      const revoker = createMockUser({ id: 'creator-123', cognitoSub: 'cognito-creator' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });

      mockPrisma.user.findUnique.mockResolvedValue(revoker);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.provisionalAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeAccess('topic-123', 'user-123', 'cognito-creator'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when revoker is not topic creator', async () => {
      const revoker = createMockUser({ id: 'other-user', cognitoSub: 'cognito-other' });
      const topic = createMockTopic({ id: 'topic-123', creatorId: 'creator-123' });

      mockPrisma.user.findUnique.mockResolvedValue(revoker);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.revokeAccess('topic-123', 'user-123', 'cognito-other')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUserProvisionalAccess', () => {
    it("should return user's active provisional access", async () => {
      const user = createMockUser({ id: 'user-123', cognitoSub: 'cognito-user' });
      const granter = createMockUser({ id: 'creator-123', displayName: 'Creator' });
      const topic = createMockTopic({ id: 'topic-123', title: 'Test Topic' });
      const accessRecords = [
        createMockProvisionalAccess({
          id: 'prov-1',
          userId: 'user-123',
          topicId: 'topic-123',
          status: 'ACTIVE',
          user,
          topic,
          grantedBy: granter,
        }),
        createMockProvisionalAccess({
          id: 'prov-2',
          userId: 'user-123',
          topicId: 'topic-456',
          status: 'ACTIVE',
          user,
          topic: { ...topic, id: 'topic-456', title: 'Another Topic' },
          grantedBy: granter,
        }),
      ];

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.provisionalAccess.findMany.mockResolvedValue(accessRecords);

      const result = await service.getUserProvisionalAccess('cognito-user');

      expect(result).toHaveLength(2);
      expect(mockPrisma.provisionalAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            status: 'ACTIVE',
            // Active access has expiresAt > now (not the epoch date marker)
            expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should return empty array when user has no active access', async () => {
      const user = createMockUser({ id: 'user-123', cognitoSub: 'cognito-user' });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.provisionalAccess.findMany.mockResolvedValue([]);

      const result = await service.getUserProvisionalAccess('cognito-user');

      expect(result).toHaveLength(0);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProvisionalAccess('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
