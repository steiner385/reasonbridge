/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for AppealController
 *
 * Tests the REST API endpoints for tier appeal management:
 * - POST /appeals - Submit new appeal (requires auth)
 * - GET /appeals/me - List my appeals (requires auth)
 * - GET /appeals/me/eligibility - Check eligibility to submit appeal (requires auth)
 * - GET /admin/appeals - Pending appeals for review (requires admin)
 * - POST /admin/appeals/:id/resolve - Approve/deny appeal (requires admin)
 *
 * @see services/user-service/src/appeals/appeal.controller.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AppealController } from '../appeal.controller.js';
import { AppealDto, SubmitAppealDto, AppealEligibilityDto } from '../dto/appeal.dto.js';

// Mock Prisma client for enums
vi.mock('@prisma/client', () => {
  // Mock Decimal class for Prisma
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

import { TierAppealType, TierAppealStatus } from '@prisma/client';

/**
 * Helper to create a mock AppealDto
 */
const createMockAppealDto = (overrides: Partial<AppealDto> = {}): AppealDto => {
  const data = {
    id: 'appeal-123',
    userId: 'user-123',
    userName: 'Test User',
    appealType: TierAppealType.GLOBAL_TIER,
    requestedLevel: 2,
    requestedLevelName: 'Trusted',
    reason: 'I have been contributing quality content consistently',
    status: TierAppealStatus.PENDING,
    createdAt: new Date(),
    ...overrides,
  };
  return new AppealDto(data);
};

/**
 * Factory to create a mock AppealService
 */
const createMockAppealService = () => ({
  submitAppeal: vi.fn(),
  getUserAppeals: vi.fn(),
  getAppeal: vi.fn(),
  getPendingAppeals: vi.fn(),
  approveAppeal: vi.fn(),
  denyAppeal: vi.fn(),
  canSubmitAppeal: vi.fn(),
  getAppealEligibility: vi.fn(),
});

/**
 * Create a mock JWT payload for authenticated user
 */
const createMockJwtPayload = (sub: string, email = 'user@example.com') => ({
  sub,
  email,
  'cognito:username': email,
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
});

describe('AppealController', () => {
  let controller: AppealController;
  let mockAppealService: ReturnType<typeof createMockAppealService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppealService = createMockAppealService();
    controller = new AppealController(mockAppealService as any);
  });

  describe('POST /appeals', () => {
    it('should create a new appeal for authenticated user', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData: SubmitAppealDto = new SubmitAppealDto({
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2,
        reason: 'I have been contributing quality content consistently',
      });

      const expectedAppeal = createMockAppealDto({
        userId: 'user-123',
        status: TierAppealStatus.PENDING,
      });

      mockAppealService.submitAppeal.mockResolvedValue(expectedAppeal);

      const result = await controller.submitAppeal(jwtPayload as any, submitData);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.status).toBe(TierAppealStatus.PENDING);
      expect(mockAppealService.submitAppeal).toHaveBeenCalledWith('user-123', submitData);
    });

    it('should use sub from JWT payload as userId', async () => {
      const jwtPayload = createMockJwtPayload('cognito-sub-456');
      const submitData = new SubmitAppealDto({
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2,
        reason: 'Please consider my contributions',
      });

      mockAppealService.submitAppeal.mockResolvedValue(
        createMockAppealDto({ userId: 'cognito-sub-456' }),
      );

      await controller.submitAppeal(jwtPayload as any, submitData);

      expect(mockAppealService.submitAppeal).toHaveBeenCalledWith('cognito-sub-456', submitData);
    });

    it('should validate categoryId for domain expertise appeals', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData = new SubmitAppealDto({
        appealType: TierAppealType.DOMAIN_EXPERTISE,
        requestedLevel: 2,
        reason: 'I have expertise in this area',
        // Missing categoryId
      });

      mockAppealService.submitAppeal.mockRejectedValue(
        new BadRequestException('categoryId is required for DOMAIN_EXPERTISE appeals'),
      );

      await expect(controller.submitAppeal(jwtPayload as any, submitData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException when category does not exist', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData = new SubmitAppealDto({
        appealType: TierAppealType.DOMAIN_EXPERTISE,
        categoryId: 'nonexistent-tag',
        requestedLevel: 2,
        reason: 'I have expertise in this area',
      });

      mockAppealService.submitAppeal.mockRejectedValue(
        new NotFoundException('Tag with ID nonexistent-tag not found'),
      );

      await expect(controller.submitAppeal(jwtPayload as any, submitData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate service errors', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData = new SubmitAppealDto({
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2,
        reason: 'Please consider',
      });

      mockAppealService.submitAppeal.mockRejectedValue(new Error('Database error'));

      await expect(controller.submitAppeal(jwtPayload as any, submitData)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GET /appeals/me', () => {
    it('should return current user appeals', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const mockAppeals = [
        createMockAppealDto({ id: 'appeal-1', appealType: TierAppealType.GLOBAL_TIER }),
        createMockAppealDto({
          id: 'appeal-2',
          appealType: TierAppealType.DOMAIN_EXPERTISE,
          categoryId: 'tag-123',
          categoryName: 'Climate Science',
        }),
      ];

      mockAppealService.getUserAppeals.mockResolvedValue(mockAppeals);

      const result = await controller.getMyAppeals(jwtPayload as any);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('appeal-1');
      expect(result[1].id).toBe('appeal-2');
      expect(mockAppealService.getUserAppeals).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no appeals', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockAppealService.getUserAppeals.mockResolvedValue([]);

      const result = await controller.getMyAppeals(jwtPayload as any);

      expect(result).toEqual([]);
    });

    it('should use sub from JWT payload to identify current user', async () => {
      const jwtPayload = createMockJwtPayload('jwt-user-id');
      mockAppealService.getUserAppeals.mockResolvedValue([]);

      await controller.getMyAppeals(jwtPayload as any);

      expect(mockAppealService.getUserAppeals).toHaveBeenCalledWith('jwt-user-id');
    });

    it('should propagate service errors', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockAppealService.getUserAppeals.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.getMyAppeals(jwtPayload as any)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('GET /appeals/me/eligibility', () => {
    it('should return eligibility status when user can submit appeal', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const eligibility = new AppealEligibilityDto({ canSubmit: true });

      mockAppealService.getAppealEligibility.mockResolvedValue(eligibility);

      const result = await controller.checkEligibility(jwtPayload as any);

      expect(result.canSubmit).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(mockAppealService.getAppealEligibility).toHaveBeenCalledWith('user-123');
    });

    it('should return eligibility status with reason when user cannot submit', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const nextDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      const eligibility = new AppealEligibilityDto({
        canSubmit: false,
        reason: 'You can only submit one appeal every 30 days',
        nextEligibleDate: nextDate,
      });

      mockAppealService.getAppealEligibility.mockResolvedValue(eligibility);

      const result = await controller.checkEligibility(jwtPayload as any);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('You can only submit one appeal every 30 days');
      expect(result.nextEligibleDate).toBeDefined();
    });

    it('should use sub from JWT payload to identify current user', async () => {
      const jwtPayload = createMockJwtPayload('jwt-user-id');
      mockAppealService.getAppealEligibility.mockResolvedValue(
        new AppealEligibilityDto({ canSubmit: true }),
      );

      await controller.checkEligibility(jwtPayload as any);

      expect(mockAppealService.getAppealEligibility).toHaveBeenCalledWith('jwt-user-id');
    });

    it('should propagate service errors', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockAppealService.getAppealEligibility.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.checkEligibility(jwtPayload as any)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('GET /admin/appeals', () => {
    it('should return all pending appeals for admin review', async () => {
      const mockPendingAppeals = [
        createMockAppealDto({
          id: 'appeal-1',
          status: TierAppealStatus.PENDING,
          userId: 'user-1',
        }),
        createMockAppealDto({
          id: 'appeal-2',
          status: TierAppealStatus.PENDING,
          userId: 'user-2',
        }),
      ];

      mockAppealService.getPendingAppeals.mockResolvedValue(mockPendingAppeals);

      const result = await controller.getPendingAppeals();

      expect(result).toHaveLength(2);
      expect(result.every((a) => a.status === TierAppealStatus.PENDING)).toBe(true);
      expect(mockAppealService.getPendingAppeals).toHaveBeenCalled();
    });

    it('should return empty array when no pending appeals', async () => {
      mockAppealService.getPendingAppeals.mockResolvedValue([]);

      const result = await controller.getPendingAppeals();

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockAppealService.getPendingAppeals.mockRejectedValue(new Error('Database error'));

      await expect(controller.getPendingAppeals()).rejects.toThrow('Database error');
    });
  });

  describe('POST /admin/appeals/:id/resolve', () => {
    describe('action=approve', () => {
      it('should approve an appeal', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123', 'admin@example.com');
        const approvedAppeal = createMockAppealDto({
          id: 'appeal-123',
          status: TierAppealStatus.APPROVED,
          reviewedBy: 'admin-123',
          reviewNotes: 'Approved based on contribution history',
          resolvedAt: new Date(),
        });

        mockAppealService.approveAppeal.mockResolvedValue(approvedAppeal);

        const result = await controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
          action: 'approve',
          notes: 'Approved based on contribution history',
        });

        expect(result.status).toBe(TierAppealStatus.APPROVED);
        expect(result.reviewedBy).toBe('admin-123');
        expect(result.reviewNotes).toBe('Approved based on contribution history');
        expect(mockAppealService.approveAppeal).toHaveBeenCalledWith(
          'appeal-123',
          'admin-123',
          'Approved based on contribution history',
        );
      });

      it('should approve an appeal without notes', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');
        const approvedAppeal = createMockAppealDto({
          status: TierAppealStatus.APPROVED,
        });

        mockAppealService.approveAppeal.mockResolvedValue(approvedAppeal);

        await controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
          action: 'approve',
        });

        expect(mockAppealService.approveAppeal).toHaveBeenCalledWith(
          'appeal-123',
          'admin-123',
          undefined,
        );
      });

      it('should propagate NotFoundException when appeal does not exist', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');
        mockAppealService.approveAppeal.mockRejectedValue(
          new NotFoundException('Appeal with ID nonexistent-appeal not found'),
        );

        await expect(
          controller.resolveAppeal(adminJwtPayload as any, 'nonexistent-appeal', {
            action: 'approve',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate BadRequestException when appeal is not pending', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');
        mockAppealService.approveAppeal.mockRejectedValue(
          new BadRequestException('Appeal is not pending review'),
        );

        await expect(
          controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
            action: 'approve',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('action=deny', () => {
      it('should deny an appeal with reason', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123', 'admin@example.com');
        const deniedAppeal = createMockAppealDto({
          id: 'appeal-123',
          status: TierAppealStatus.DENIED,
          reviewedBy: 'admin-123',
          reviewNotes: 'Insufficient contribution history',
          resolvedAt: new Date(),
        });

        mockAppealService.denyAppeal.mockResolvedValue(deniedAppeal);

        const result = await controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
          action: 'deny',
          reason: 'Insufficient contribution history',
        });

        expect(result.status).toBe(TierAppealStatus.DENIED);
        expect(result.reviewedBy).toBe('admin-123');
        expect(result.reviewNotes).toBe('Insufficient contribution history');
        expect(mockAppealService.denyAppeal).toHaveBeenCalledWith(
          'appeal-123',
          'admin-123',
          'Insufficient contribution history',
        );
      });

      it('should require reason for denial', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');

        await expect(
          controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
            action: 'deny',
            // Missing reason
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should propagate NotFoundException when appeal does not exist', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');
        mockAppealService.denyAppeal.mockRejectedValue(
          new NotFoundException('Appeal with ID nonexistent-appeal not found'),
        );

        await expect(
          controller.resolveAppeal(adminJwtPayload as any, 'nonexistent-appeal', {
            action: 'deny',
            reason: 'Denied',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate BadRequestException when appeal is not pending', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');
        mockAppealService.denyAppeal.mockRejectedValue(
          new BadRequestException('Appeal is not pending review'),
        );

        await expect(
          controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
            action: 'deny',
            reason: 'Denied',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('invalid action', () => {
      it('should throw BadRequestException for invalid action', async () => {
        const adminJwtPayload = createMockJwtPayload('admin-123');

        await expect(
          controller.resolveAppeal(adminJwtPayload as any, 'appeal-123', {
            action: 'invalid' as any,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Error handling', () => {
    it('should propagate NotFoundException with correct message for appeals', async () => {
      const appealId = 'nonexistent-appeal-id';
      const adminJwtPayload = createMockJwtPayload('admin-123');

      mockAppealService.approveAppeal.mockRejectedValue(
        new NotFoundException(`Appeal with ID ${appealId} not found`),
      );

      try {
        await controller.resolveAppeal(adminJwtPayload as any, appealId, { action: 'approve' });
        expect.fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toBe(`Appeal with ID ${appealId} not found`);
      }
    });

    it('should propagate BadRequestException for rate limiting', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData = new SubmitAppealDto({
        appealType: TierAppealType.GLOBAL_TIER,
        requestedLevel: 2,
        reason: 'Please reconsider',
      });

      mockAppealService.submitAppeal.mockRejectedValue(
        new BadRequestException('You can only submit one appeal every 30 days'),
      );

      try {
        await controller.submitAppeal(jwtPayload as any, submitData);
        expect.fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toBe(
          'You can only submit one appeal every 30 days',
        );
      }
    });
  });
});
