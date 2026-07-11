/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ParentalConsentService (Phase 3)
 * Tests getChildActivitySummary() and withdrawConsentByToken()
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ParentalConsentService } from '../parental-consent.service.js';

// Mock data factory
const createMockChildUser = (overrides = {}) => ({
  id: 'child-user-1',
  displayName: 'Test Child',
  createdAt: new Date('2025-01-15'),
  parentConsentStatus: 'VERIFIED',
  ...overrides,
});

const createMockConsentRecord = (overrides = {}) => ({
  id: 'consent-1',
  userId: 'child-user-1',
  parentEmail: 'parent@example.com',
  consentToken: 'valid-token-abc123',
  tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  verifiedAt: new Date('2025-01-16'),
  withdrawnAt: null,
  ipAddress: null,
  user: createMockChildUser(),
  ...overrides,
});

// Create mock services
const createMockPrismaService = () => ({
  parentalConsent: {
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  response: {
    groupBy: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
});

const createMockEmailService = () => ({
  sendParentalConsentEmail: vi.fn(),
});

const createMockAuditService = () => ({
  logAction: vi.fn().mockResolvedValue({}),
});

describe('ParentalConsentService - Child Activity & Consent Withdrawal', () => {
  let service: ParentalConsentService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEmailService: ReturnType<typeof createMockEmailService>;
  let mockAuditService: ReturnType<typeof createMockAuditService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockEmailService = createMockEmailService();
    mockAuditService = createMockAuditService();

    service = new ParentalConsentService(
      mockPrisma as any,
      mockEmailService as any,
      mockAuditService as any,
    );
  });

  describe('getChildActivitySummary', () => {
    it('should return child activity summary with valid token', async () => {
      const mockConsent = createMockConsentRecord();
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(mockConsent);
      mockPrisma.response.groupBy.mockResolvedValue([
        { topicId: 'topic-1' },
        { topicId: 'topic-2' },
        { topicId: 'topic-3' },
      ]);
      mockPrisma.response.count.mockResolvedValue(15);
      mockPrisma.response.findFirst.mockResolvedValue({
        createdAt: new Date('2025-02-01'),
      });

      const result = await service.getChildActivitySummary('valid-token-abc123');

      expect(result).toBeDefined();
      expect(result.childDisplayName).toBe('Test Child');
      expect(result.accountCreatedAt).toBe('2025-01-15T00:00:00.000Z');
      expect(result.consentStatus).toBe('VERIFIED');
      expect(result.consentVerifiedAt).toBe('2025-01-16T00:00:00.000Z');
      expect(result.activitySummary.topicsParticipated).toBe(3);
      expect(result.activitySummary.responsesPosted).toBe(15);
      expect(result.lastActivityAt).toBe('2025-02-01T00:00:00.000Z');
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(null);

      await expect(service.getChildActivitySummary('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle child with no activity', async () => {
      const mockConsent = createMockConsentRecord();
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(mockConsent);
      mockPrisma.response.groupBy.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.response.findFirst.mockResolvedValue(null);

      const result = await service.getChildActivitySummary('valid-token-abc123');

      expect(result.activitySummary.topicsParticipated).toBe(0);
      expect(result.activitySummary.responsesPosted).toBe(0);
      expect(result.lastActivityAt).toBeUndefined();
    });

    it('should handle child with pending consent status', async () => {
      const pendingConsent = createMockConsentRecord({
        verifiedAt: null,
        user: createMockChildUser({ parentConsentStatus: 'PENDING' }),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(pendingConsent);
      mockPrisma.response.groupBy.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.response.findFirst.mockResolvedValue(null);

      const result = await service.getChildActivitySummary('valid-token-abc123');

      expect(result.consentStatus).toBe('PENDING');
      expect(result.consentVerifiedAt).toBeUndefined();
    });

    it('should use Anonymous User when displayName is null', async () => {
      const consentWithNullName = createMockConsentRecord({
        user: createMockChildUser({ displayName: null }),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(consentWithNullName);
      mockPrisma.response.groupBy.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.response.findFirst.mockResolvedValue(null);

      const result = await service.getChildActivitySummary('valid-token-abc123');

      expect(result.childDisplayName).toBe('Anonymous User');
    });

    it('should throw ForbiddenException for an expired token', async () => {
      const expiredConsent = createMockConsentRecord({
        tokenExpiresAt: new Date('2024-01-01'),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(expiredConsent);

      await expect(service.getChildActivitySummary('valid-token-abc123')).rejects.toThrow(
        ForbiddenException,
      );
      // Must not fall through to loading the child's activity.
      expect(mockPrisma.response.count).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for an already-withdrawn token', async () => {
      const withdrawnConsent = createMockConsentRecord({
        withdrawnAt: new Date('2025-02-01'),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(withdrawnConsent);

      await expect(service.getChildActivitySummary('valid-token-abc123')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.response.count).not.toHaveBeenCalled();
    });
  });

  describe('withdrawConsentByToken', () => {
    it('should withdraw consent with valid token', async () => {
      const mockConsent = createMockConsentRecord();
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(mockConsent);
      mockPrisma.$transaction.mockImplementation(async (operations) => operations);

      await service.withdrawConsentByToken('valid-token-abc123');

      expect(mockPrisma.parentalConsent.findUnique).toHaveBeenCalledWith({
        where: { consentToken: 'valid-token-abc123' },
        include: { user: { select: { id: true } } },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(null);

      await expect(service.withdrawConsentByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for an expired token', async () => {
      const expiredConsent = createMockConsentRecord({
        tokenExpiresAt: new Date('2024-01-01'),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(expiredConsent);

      await expect(service.withdrawConsentByToken('valid-token-abc123')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should be idempotent: reject an already-withdrawn token without re-triggering deletion', async () => {
      const withdrawnConsent = createMockConsentRecord({
        withdrawnAt: new Date('2025-02-01'),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(withdrawnConsent);

      await expect(service.withdrawConsentByToken('valid-token-abc123')).rejects.toThrow(
        ForbiddenException,
      );
      // A second withdrawal must not re-run the transaction or deletion request.
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('verifyConsent', () => {
    it('should return success for valid unverified consent token', async () => {
      const unverifiedConsent = createMockConsentRecord({ verifiedAt: null });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(unverifiedConsent);
      mockPrisma.parentalConsent.update.mockResolvedValue({
        ...unverifiedConsent,
        verifiedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({
        ...createMockChildUser(),
        parentConsentStatus: 'VERIFIED',
      });

      const result = await service.verifyConsent('valid-token-abc123', '192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.childDisplayName).toBe('Test Child');
      expect(mockPrisma.parentalConsent.update).toHaveBeenCalledWith({
        where: { id: 'consent-1' },
        data: {
          verifiedAt: expect.any(Date),
          ipAddress: '192.168.1.1',
        },
      });
    });

    it('should return error for already verified token', async () => {
      const verifiedConsent = createMockConsentRecord();
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(verifiedConsent);

      const result = await service.verifyConsent('valid-token-abc123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Consent has already been verified');
    });

    it('should return error for expired token', async () => {
      const expiredConsent = createMockConsentRecord({
        verifiedAt: null,
        tokenExpiresAt: new Date('2024-01-01'),
      });
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(expiredConsent);

      const result = await service.verifyConsent('valid-token-abc123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should return error for invalid token', async () => {
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(null);

      const result = await service.verifyConsent('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid consent token');
    });
  });

  describe('withdrawConsent by userId', () => {
    it('should withdraw consent by user ID', async () => {
      mockPrisma.$transaction.mockImplementation(async (operations) => operations);

      await service.withdrawConsent('child-user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
