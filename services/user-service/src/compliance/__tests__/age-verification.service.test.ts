/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgeVerificationService } from '../age-verification.service.js';
import { ComplianceService } from '../compliance.service.js';
import { ComplianceAuditService } from '../compliance-audit.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { ComplianceAction, ParentConsentStatus } from '@prisma/client';

describe('AgeVerificationService', () => {
  let service: AgeVerificationService;
  let mockComplianceService: {
    getRegionalRules: ReturnType<typeof vi.fn>;
    calculateAge: ReturnType<typeof vi.fn>;
    isMinor: ReturnType<typeof vi.fn>;
    requiresParentalConsent: ReturnType<typeof vi.fn>;
  };
  let mockPrisma: {
    user: {
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let mockAuditService: {
    logAction: ReturnType<typeof vi.fn>;
  };

  const userId = 'user-123';
  const birthDate = new Date('2015-06-15');

  beforeEach(() => {
    mockComplianceService = {
      getRegionalRules: vi.fn(),
      calculateAge: vi.fn(),
      isMinor: vi.fn(),
      requiresParentalConsent: vi.fn(),
    };

    mockPrisma = {
      user: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    mockAuditService = {
      logAction: vi.fn().mockResolvedValue({
        id: 'audit-log-1',
        userId,
        action: ComplianceAction.AGE_VERIFIED,
        metadata: {},
        timestamp: new Date(),
      }),
    };

    service = new AgeVerificationService(
      mockComplianceService as unknown as ComplianceService,
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as ComplianceAuditService,
    );
  });

  describe('verifyAge', () => {
    beforeEach(() => {
      mockComplianceService.getRegionalRules.mockReturnValue({
        consentAge: 13,
        requiresParentalConsent: true,
        privacyPolicyUrl: 'https://example.com/privacy/us',
        regulationName: 'COPPA',
        allowsDirectMessaging: false,
        allowsProfileVisibility: false,
        requiresManualModeration: false,
        dataRetentionDays: 730,
      });
      mockComplianceService.calculateAge.mockReturnValue(10);
      mockComplianceService.isMinor.mockReturnValue(true);
      mockComplianceService.requiresParentalConsent.mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        birthDate,
        isMinor: true,
      });
    });

    it('should log AGE_VERIFIED action to audit trail', async () => {
      await service.verifyAge(userId, birthDate, 'US');

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        ComplianceAction.AGE_VERIFIED,
        expect.objectContaining({
          region: 'US',
          consentAge: 13,
          calculatedAge: 10,
          isMinor: true,
          requiresConsent: true,
        }),
      );
    });

    it('should log AGE_VERIFIED action with requiresConsent false for adults', async () => {
      mockComplianceService.calculateAge.mockReturnValue(25);
      mockComplianceService.isMinor.mockReturnValue(false);
      mockComplianceService.requiresParentalConsent.mockReturnValue(false);

      await service.verifyAge(userId, new Date('2000-01-01'), 'US');

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        ComplianceAction.AGE_VERIFIED,
        expect.objectContaining({
          region: 'US',
          isMinor: false,
          requiresConsent: false,
        }),
      );
    });

    it('should update lastAgeVerifiedAt in the user record', async () => {
      vi.useFakeTimers();
      const now = new Date('2026-02-22T10:00:00Z');
      vi.setSystemTime(now);

      await service.verifyAge(userId, birthDate, 'US');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastAgeVerifiedAt: now,
          }),
        }),
      );

      vi.useRealTimers();
    });

    it('should succeed even when audit logging fails', async () => {
      // Audit logging should not fail the main verification operation
      mockAuditService.logAction.mockRejectedValue(new Error('Database connection lost'));

      // Should not throw, verification should still succeed
      const result = await service.verifyAge(userId, birthDate, 'US');

      // User update should have happened
      expect(mockPrisma.user.update).toHaveBeenCalled();

      // Result should be returned despite audit failure
      expect(result).toEqual({
        isMinor: true,
        requiresConsent: true,
        consentAge: 13,
        age: 10,
        regionalRules: expect.objectContaining({
          consentAge: 13,
        }),
      });
    });

    it('should return correct verification result for a minor', async () => {
      const result = await service.verifyAge(userId, birthDate, 'US');

      expect(result).toEqual({
        isMinor: true,
        requiresConsent: true,
        consentAge: 13,
        age: 10,
        regionalRules: expect.objectContaining({
          consentAge: 13,
          regulationName: 'COPPA',
        }),
      });
    });

    it('should set parentConsentStatus to PENDING for minors requiring consent', async () => {
      await service.verifyAge(userId, birthDate, 'US');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          parentConsentStatus: ParentConsentStatus.PENDING,
        }),
      });
    });

    it('should set parentConsentStatus to NOT_REQUIRED for adults', async () => {
      mockComplianceService.requiresParentalConsent.mockReturnValue(false);
      mockComplianceService.isMinor.mockReturnValue(false);
      mockComplianceService.calculateAge.mockReturnValue(25);

      await service.verifyAge(userId, new Date('2000-01-01'), 'US');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          parentConsentStatus: ParentConsentStatus.NOT_REQUIRED,
        }),
      });
    });

    it('should store the birth date and country code', async () => {
      await service.verifyAge(userId, birthDate, 'us');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          birthDate,
          declaredCountry: 'US',
        }),
      });
    });

    it('should store isMinor and regionalConsentAge', async () => {
      await service.verifyAge(userId, birthDate, 'US');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          isMinor: true,
          regionalConsentAge: 13,
        }),
      });
    });
  });

  describe('requiresParentalConsent', () => {
    it('should return true for a minor with pending consent status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMinor: true,
        parentConsentStatus: ParentConsentStatus.PENDING,
      });

      const result = await service.requiresParentalConsent(userId);

      expect(result).toBe(true);
    });

    it('should return false for an adult', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMinor: false,
        parentConsentStatus: ParentConsentStatus.NOT_REQUIRED,
      });

      const result = await service.requiresParentalConsent(userId);

      expect(result).toBe(false);
    });

    it('should return false for a minor with verified consent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMinor: true,
        parentConsentStatus: ParentConsentStatus.VERIFIED,
      });

      const result = await service.requiresParentalConsent(userId);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requiresParentalConsent(userId);

      expect(result).toBe(false);
    });
  });

  describe('getConsentStatus', () => {
    it('should return the consent status for an existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        parentConsentStatus: ParentConsentStatus.VERIFIED,
      });

      const result = await service.getConsentStatus(userId);

      expect(result).toBe(ParentConsentStatus.VERIFIED);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getConsentStatus(userId);

      expect(result).toBeNull();
    });
  });

  describe('hasVerifiedConsent', () => {
    it('should return true when consent is verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        parentConsentStatus: ParentConsentStatus.VERIFIED,
      });

      const result = await service.hasVerifiedConsent(userId);

      expect(result).toBe(true);
    });

    it('should return false when consent is pending', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        parentConsentStatus: ParentConsentStatus.PENDING,
      });

      const result = await service.hasVerifiedConsent(userId);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.hasVerifiedConsent(userId);

      expect(result).toBe(false);
    });
  });

  describe('setParentEmail', () => {
    it('should update the parent email for a user', async () => {
      const parentEmail = 'parent@example.com';
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        parentEmail,
      });

      await service.setParentEmail(userId, parentEmail);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { parentEmail },
      });
    });
  });
});
