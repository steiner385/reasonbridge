/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParentalConsentService } from '../parental-consent.service.js';
import { EmailService } from '../../services/email.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ComplianceAuditService } from '../compliance-audit.service.js';
import { ParentConsentStatus, ComplianceAction } from '@prisma/client';

describe('ParentalConsentService', () => {
  let service: ParentalConsentService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    parentalConsent: {
      upsert: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEmailService: {
    sendParentalConsentEmail: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    logAction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      parentalConsent: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockEmailService = {
      sendParentalConsentEmail: vi.fn(),
    };

    mockAuditService = {
      logAction: vi.fn().mockResolvedValue({}),
    };

    service = new ParentalConsentService(
      mockPrisma as unknown as PrismaService,
      mockEmailService as unknown as EmailService,
      mockAuditService as unknown as ComplianceAuditService,
    );
  });

  describe('initiateConsent', () => {
    it('should create consent record and send email', async () => {
      const userId = 'user-123';
      const parentEmail = 'parent@example.com';

      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Test Child',
        declaredCountry: 'US',
      });

      mockPrisma.parentalConsent.upsert.mockResolvedValue({
        id: 'consent-123',
        userId,
        parentEmail,
        consentToken: 'test-token',
        tokenExpiresAt: new Date(),
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockEmailService.sendParentalConsentEmail.mockResolvedValue(undefined);

      const result = await service.initiateConsent(userId, parentEmail);

      expect(result.consentId).toBe('consent-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { displayName: true, declaredCountry: true },
      });
      expect(mockPrisma.parentalConsent.upsert).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          parentEmail,
          parentConsentStatus: ParentConsentStatus.PENDING,
        },
      });
      expect(mockEmailService.sendParentalConsentEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          parentEmail,
          childDisplayName: 'Test Child',
        }),
      );
    });

    it('should log CONSENT_REQUESTED audit action', async () => {
      const userId = 'user-123';
      const parentEmail = 'parent@example.com';

      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Test Child',
        declaredCountry: 'US',
      });

      mockPrisma.parentalConsent.upsert.mockResolvedValue({
        id: 'consent-123',
        userId,
        parentEmail,
        consentToken: 'test-token',
        tokenExpiresAt: new Date(),
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockEmailService.sendParentalConsentEmail.mockResolvedValue(undefined);

      await service.initiateConsent(userId, parentEmail);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        ComplianceAction.CONSENT_REQUESTED,
        {
          parentEmail,
          region: 'US',
        },
      );
    });

    it('should succeed even when audit logging fails', async () => {
      const userId = 'user-123';
      const parentEmail = 'parent@example.com';

      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Test Child',
        declaredCountry: 'US',
      });

      mockPrisma.parentalConsent.upsert.mockResolvedValue({
        id: 'consent-123',
        userId,
        parentEmail,
        consentToken: 'test-token',
        tokenExpiresAt: new Date(),
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockEmailService.sendParentalConsentEmail.mockResolvedValue(undefined);
      mockAuditService.logAction.mockRejectedValue(new Error('Audit service unavailable'));

      const result = await service.initiateConsent(userId, parentEmail);

      // Should still succeed despite audit failure
      expect(result.consentId).toBe('consent-123');
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.initiateConsent('nonexistent', 'parent@example.com')).rejects.toThrow(
        'User nonexistent not found',
      );
    });
  });

  describe('verifyConsent', () => {
    it('should verify valid consent token', async () => {
      const token = 'valid-token';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.parentalConsent.findUnique.mockResolvedValue({
        id: 'consent-123',
        userId: 'user-123',
        consentToken: token,
        tokenExpiresAt: futureDate,
        verifiedAt: null,
        user: { id: 'user-123', displayName: 'Test Child' },
      });

      mockPrisma.parentalConsent.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verifyConsent(token, '192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.childDisplayName).toBe('Test Child');
      expect(mockPrisma.parentalConsent.update).toHaveBeenCalledWith({
        where: { id: 'consent-123' },
        data: {
          verifiedAt: expect.any(Date),
          ipAddress: '192.168.1.1',
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { parentConsentStatus: ParentConsentStatus.VERIFIED },
      });
    });

    it('should log CONSENT_VERIFIED audit action', async () => {
      const token = 'valid-token';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.parentalConsent.findUnique.mockResolvedValue({
        id: 'consent-123',
        userId: 'user-123',
        consentToken: token,
        tokenExpiresAt: futureDate,
        verifiedAt: null,
        user: { id: 'user-123', displayName: 'Test Child' },
      });

      mockPrisma.parentalConsent.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      await service.verifyConsent(token, '192.168.1.1');

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'user-123',
        ComplianceAction.CONSENT_VERIFIED,
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          verifiedAt: expect.any(String),
        }),
      );
    });

    it('should succeed even when audit logging fails during verification', async () => {
      const token = 'valid-token';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.parentalConsent.findUnique.mockResolvedValue({
        id: 'consent-123',
        userId: 'user-123',
        consentToken: token,
        tokenExpiresAt: futureDate,
        verifiedAt: null,
        user: { id: 'user-123', displayName: 'Test Child' },
      });

      mockPrisma.parentalConsent.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockAuditService.logAction.mockRejectedValue(new Error('Audit service unavailable'));

      const result = await service.verifyConsent(token, '192.168.1.1');

      // Should still succeed despite audit failure
      expect(result.success).toBe(true);
      expect(result.childDisplayName).toBe('Test Child');
    });

    it('should reject invalid token', async () => {
      mockPrisma.parentalConsent.findUnique.mockResolvedValue(null);

      const result = await service.verifyConsent('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid consent token');
    });

    it('should reject already verified token', async () => {
      mockPrisma.parentalConsent.findUnique.mockResolvedValue({
        id: 'consent-123',
        verifiedAt: new Date(),
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: { id: 'user-123', displayName: 'Test Child' },
      });

      const result = await service.verifyConsent('used-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Consent has already been verified');
    });

    it('should reject expired token', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockPrisma.parentalConsent.findUnique.mockResolvedValue({
        id: 'consent-123',
        verifiedAt: null,
        tokenExpiresAt: pastDate,
        user: { id: 'user-123', displayName: 'Test Child' },
      });

      const result = await service.verifyConsent('expired-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Consent token has expired. Please request a new one.');
    });
  });

  describe('getConsentStatus', () => {
    it('should return consent status', async () => {
      const expiresAt = new Date();
      const verifiedAt = new Date();

      mockPrisma.user.findUnique.mockResolvedValue({
        parentConsentStatus: ParentConsentStatus.VERIFIED,
        parentEmail: 'parent@example.com',
        parentalConsent: {
          tokenExpiresAt: expiresAt,
          verifiedAt: verifiedAt,
        },
      });

      const result = await service.getConsentStatus('user-123');

      expect(result.status).toBe(ParentConsentStatus.VERIFIED);
      expect(result.parentEmail).toBe('parent@example.com');
      expect(result.expiresAt).toBe(expiresAt.toISOString());
      expect(result.verifiedAt).toBe(verifiedAt.toISOString());
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getConsentStatus('nonexistent')).rejects.toThrow(
        'User nonexistent not found',
      );
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw consent and update user status', async () => {
      // Mock the Prisma operations that get passed to $transaction
      const mockConsentUpdate = Promise.resolve({});
      const mockUserUpdate = Promise.resolve({});
      mockPrisma.parentalConsent.update.mockReturnValue(mockConsentUpdate);
      mockPrisma.user.update.mockReturnValue(mockUserUpdate);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.withdrawConsent('user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalledWith([mockConsentUpdate, mockUserUpdate]);
      expect(mockPrisma.parentalConsent.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { withdrawnAt: expect.any(Date) },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { parentConsentStatus: ParentConsentStatus.WITHDRAWN },
      });
    });

    it('should log CONSENT_WITHDRAWN audit action', async () => {
      const mockConsentUpdate = Promise.resolve({});
      const mockUserUpdate = Promise.resolve({});
      mockPrisma.parentalConsent.update.mockReturnValue(mockConsentUpdate);
      mockPrisma.user.update.mockReturnValue(mockUserUpdate);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.withdrawConsent('user-123');

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'user-123',
        ComplianceAction.CONSENT_WITHDRAWN,
        expect.objectContaining({
          withdrawnAt: expect.any(String),
          triggersDataDeletion: true,
        }),
      );
    });

    it('should succeed even when audit logging fails during withdrawal', async () => {
      const mockConsentUpdate = Promise.resolve({});
      const mockUserUpdate = Promise.resolve({});
      mockPrisma.parentalConsent.update.mockReturnValue(mockConsentUpdate);
      mockPrisma.user.update.mockReturnValue(mockUserUpdate);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockAuditService.logAction.mockRejectedValue(new Error('Audit service unavailable'));

      // Should not throw despite audit failure
      await expect(service.withdrawConsent('user-123')).resolves.not.toThrow();
    });
  });

  describe('resendConsentEmail', () => {
    it('should resend consent email with new token', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ parentEmail: 'parent@example.com' })
        .mockResolvedValueOnce({ displayName: 'Test Child' });

      mockPrisma.parentalConsent.upsert.mockResolvedValue({
        id: 'consent-456',
        consentToken: 'new-token',
        tokenExpiresAt: new Date(),
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockEmailService.sendParentalConsentEmail.mockResolvedValue(undefined);

      const result = await service.resendConsentEmail('user-123');

      expect(result.consentId).toBe('consent-456');
      expect(mockEmailService.sendParentalConsentEmail).toHaveBeenCalled();
    });

    it('should throw if no parent email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ parentEmail: null });

      await expect(service.resendConsentEmail('user-123')).rejects.toThrow(
        'No parent email found for this user',
      );
    });
  });
});
