/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase 1 Integration Tests for Child-Friendly Mode Compliance
 *
 * These tests verify the integration between compliance services:
 * - Age Verification Flow
 * - Parental Consent Flow
 * - Compliance Report Generation
 * - GeoIP Integration with Regional Rules
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceAuditService } from '../compliance-audit.service.js';
import { AgeVerificationService } from '../age-verification.service.js';
import { ParentalConsentService } from '../parental-consent.service.js';
import { ComplianceReportService } from '../compliance-report.service.js';
import { DataDeletionService } from '../data-deletion.service.js';
import { ComplianceService } from '../compliance.service.js';
import { GeoIpService } from '../../geo/geo-ip.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { EmailService } from '../../services/email.service.js';
import { ComplianceAction, ParentConsentStatus, DeletionStatus } from '@prisma/client';

/**
 * Test fixtures for compliance integration tests
 */
const fixtures = {
  users: {
    usMinor: {
      id: 'user-us-minor-123',
      displayName: 'US Minor',
      declaredCountry: 'US',
      birthDate: new Date('2015-06-15'), // Under 13
      email: 'minor@example.com',
      isMinor: true,
      parentConsentStatus: ParentConsentStatus.PENDING,
      regionalConsentAge: 13,
    },
    gbMinor: {
      id: 'user-gb-minor-456',
      displayName: 'UK Minor',
      declaredCountry: 'GB',
      birthDate: new Date('2014-03-20'), // Under 13
      email: 'uk-minor@example.com',
      isMinor: true,
      parentConsentStatus: ParentConsentStatus.PENDING,
      regionalConsentAge: 13,
    },
    deMinor: {
      id: 'user-de-minor-789',
      displayName: 'DE Minor',
      declaredCountry: 'DE',
      birthDate: new Date('2012-01-10'), // Under 16
      email: 'de-minor@example.com',
      isMinor: true,
      parentConsentStatus: ParentConsentStatus.PENDING,
      regionalConsentAge: 16,
    },
    adult: {
      id: 'user-adult-001',
      displayName: 'Adult User',
      declaredCountry: 'US',
      birthDate: new Date('1990-01-01'),
      email: 'adult@example.com',
      isMinor: false,
      parentConsentStatus: ParentConsentStatus.NOT_REQUIRED,
      regionalConsentAge: 13,
    },
  },
  parentEmails: {
    us: 'parent-us@example.com',
    gb: 'parent-gb@example.com',
    de: 'parent-de@example.com',
  },
  auditLogs: [] as Array<{
    id: string;
    userId: string;
    action: ComplianceAction;
    metadata: Record<string, unknown>;
    timestamp: Date;
  }>,
};

/**
 * Create mock Prisma service with all required methods
 */
function createMockPrismaService() {
  let auditLogIdCounter = 0;
  const auditLogs: typeof fixtures.auditLogs = [];
  const users = new Map<string, typeof fixtures.users.usMinor>();
  const parentalConsents = new Map<
    string,
    {
      id: string;
      userId: string;
      parentEmail: string;
      consentToken: string;
      tokenExpiresAt: Date;
      verifiedAt: Date | null;
      ipAddress: string | null;
      withdrawnAt: Date | null;
      user?: { id: string; displayName: string | null };
    }
  >();
  const dataDeletionRequests = new Map<
    string,
    {
      id: string;
      userId: string;
      requestedBy: string;
      requestedAt: Date;
      scheduledFor: Date;
      completedAt: Date | null;
      status: DeletionStatus;
      deletionLog: Record<string, unknown> | null;
    }
  >();

  // Initialize with fixture users
  Object.values(fixtures.users).forEach((user) => {
    users.set(user.id, { ...user });
  });

  return {
    _auditLogs: auditLogs,
    _users: users,
    _parentalConsents: parentalConsents,
    _dataDeletionRequests: dataDeletionRequests,
    complianceAuditLog: {
      create: vi.fn(
        async (args: {
          data: { userId: string; action: ComplianceAction; metadata: Record<string, unknown> };
        }) => {
          const log = {
            id: `log-${++auditLogIdCounter}`,
            userId: args.data.userId,
            action: args.data.action,
            metadata: args.data.metadata,
            timestamp: new Date(),
          };
          auditLogs.push(log);
          return log;
        },
      ),
      findMany: vi.fn(
        async (args?: {
          where?: {
            userId?: string;
            action?: ComplianceAction | { in: ComplianceAction[] };
            timestamp?: { gte?: Date; lte?: Date };
          };
          orderBy?: { timestamp: 'asc' | 'desc' };
          take?: number;
          skip?: number;
          select?: Record<string, boolean>;
        }) => {
          let result = [...auditLogs];

          if (args?.where) {
            if (args.where.userId) {
              result = result.filter((l) => l.userId === args.where!.userId);
            }
            if (args.where.action) {
              // Handle both direct action and { in: actions[] } filter
              const actionFilter = args.where.action;
              if (typeof actionFilter === 'object' && 'in' in actionFilter) {
                result = result.filter((l) =>
                  (actionFilter as { in: ComplianceAction[] }).in.includes(l.action),
                );
              } else {
                result = result.filter((l) => l.action === actionFilter);
              }
            }
            if (args.where.timestamp) {
              if (args.where.timestamp.gte) {
                result = result.filter((l) => l.timestamp >= args.where!.timestamp!.gte!);
              }
              if (args.where.timestamp.lte) {
                result = result.filter((l) => l.timestamp <= args.where!.timestamp!.lte!);
              }
            }
          }

          if (args?.orderBy?.timestamp === 'desc') {
            result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          }

          if (args?.take) {
            result = result.slice(args?.skip || 0, (args?.skip || 0) + args.take);
          }

          return result;
        },
      ),
      count: vi.fn(
        async (args?: {
          where?: { action?: ComplianceAction; timestamp?: { gte?: Date; lte?: Date } };
        }) => {
          let result = [...auditLogs];

          if (args?.where) {
            if (args.where.action) {
              result = result.filter((l) => l.action === args.where!.action);
            }
            if (args.where.timestamp) {
              if (args.where.timestamp.gte) {
                result = result.filter((l) => l.timestamp >= args.where!.timestamp!.gte!);
              }
              if (args.where.timestamp.lte) {
                result = result.filter((l) => l.timestamp <= args.where!.timestamp!.lte!);
              }
            }
          }

          return result.length;
        },
      ),
    },
    user: {
      findUnique: vi.fn(
        async (args: { where: { id: string }; select?: Record<string, boolean | object> }) => {
          const user = users.get(args.where.id);
          if (!user) return null;

          // If select is provided, filter the returned fields
          if (args.select) {
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(args.select)) {
              if (key === 'parentalConsent') {
                const consent = parentalConsents.get(args.where.id);
                result[key] = consent
                  ? {
                      tokenExpiresAt: consent.tokenExpiresAt,
                      verifiedAt: consent.verifiedAt,
                    }
                  : null;
              } else {
                result[key] = (user as Record<string, unknown>)[key];
              }
            }
            return result;
          }

          return user;
        },
      ),
      update: vi.fn(
        async (args: { where: { id: string }; data: Partial<typeof fixtures.users.usMinor> }) => {
          const user = users.get(args.where.id);
          if (user) {
            Object.assign(user, args.data);
            users.set(args.where.id, user);
          }
          return user;
        },
      ),
      count: vi.fn(async (args?: { where?: { isMinor?: boolean } }) => {
        let count = 0;
        users.forEach((user) => {
          if (
            !args?.where ||
            (args.where.isMinor !== undefined && user.isMinor === args.where.isMinor)
          ) {
            count++;
          }
        });
        return count;
      }),
    },
    parentalConsent: {
      upsert: vi.fn(
        async (args: {
          where: { userId: string };
          create: {
            userId: string;
            parentEmail: string;
            consentToken: string;
            tokenExpiresAt: Date;
          };
          update: {
            parentEmail: string;
            consentToken: string;
            tokenExpiresAt: Date;
            verifiedAt: null;
            withdrawnAt: null;
          };
        }) => {
          const consent = {
            id: `consent-${args.where.userId}`,
            userId: args.where.userId,
            parentEmail: args.create.parentEmail,
            consentToken: args.create.consentToken,
            tokenExpiresAt: args.create.tokenExpiresAt,
            verifiedAt: null,
            ipAddress: null,
            withdrawnAt: null,
          };
          parentalConsents.set(args.where.userId, consent);
          return consent;
        },
      ),
      findUnique: vi.fn(
        async (args: {
          where: { consentToken?: string; userId?: string };
          include?: { user?: { select?: { id?: boolean; displayName?: boolean } } };
        }) => {
          let consent = null;

          if (args.where.consentToken) {
            parentalConsents.forEach((c) => {
              if (c.consentToken === args.where.consentToken) {
                consent = c;
              }
            });
          } else if (args.where.userId) {
            consent = parentalConsents.get(args.where.userId) || null;
          }

          if (consent && args.include?.user) {
            const user = users.get(consent.userId);
            (consent as { user?: { id: string; displayName: string | null } }).user = user
              ? { id: user.id, displayName: user.displayName }
              : undefined;
          }

          return consent;
        },
      ),
      update: vi.fn(
        async (args: {
          where: { id?: string; userId?: string };
          data: Partial<{ verifiedAt: Date; ipAddress: string | null; withdrawnAt: Date }>;
        }) => {
          let consent = null;

          if (args.where.id) {
            parentalConsents.forEach((c) => {
              if (c.id === args.where.id) {
                consent = c;
              }
            });
          } else if (args.where.userId) {
            consent = parentalConsents.get(args.where.userId) || null;
          }

          if (consent) {
            Object.assign(consent, args.data);
          }

          return consent;
        },
      ),
    },
    dataDeletionRequest: {
      create: vi.fn(
        async (args: {
          data: { userId: string; requestedBy: string; scheduledFor: Date; status: DeletionStatus };
        }) => {
          const request = {
            id: `deletion-${args.data.userId}`,
            userId: args.data.userId,
            requestedBy: args.data.requestedBy,
            requestedAt: new Date(),
            scheduledFor: args.data.scheduledFor,
            completedAt: null,
            status: args.data.status,
            deletionLog: null,
          };
          dataDeletionRequests.set(args.data.userId, request);
          return request;
        },
      ),
      findUnique: vi.fn(async (args: { where: { id: string } }) => {
        let result = null;
        dataDeletionRequests.forEach((r) => {
          if (r.id === args.where.id) {
            result = r;
          }
        });
        return result;
      }),
      findMany: vi.fn(
        async (args?: {
          where?: { status?: DeletionStatus; scheduledFor?: { lte: Date } };
          orderBy?: { scheduledFor: 'asc' | 'desc' };
        }) => {
          let result: typeof fixtures.auditLogs = [];
          dataDeletionRequests.forEach((r) => {
            if (
              !args?.where ||
              ((!args.where.status || r.status === args.where.status) &&
                (!args.where.scheduledFor?.lte || r.scheduledFor <= args.where.scheduledFor.lte))
            ) {
              result.push(r as unknown as (typeof fixtures.auditLogs)[0]);
            }
          });
          return result;
        },
      ),
      update: vi.fn(
        async (args: {
          where: { id: string };
          data: Partial<{
            status: DeletionStatus;
            completedAt: Date;
            deletionLog: Record<string, unknown>;
          }>;
        }) => {
          let request = null;
          dataDeletionRequests.forEach((r) => {
            if (r.id === args.where.id) {
              Object.assign(r, args.data);
              request = r;
            }
          });
          return request;
        },
      ),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => {
      return Promise.all(operations);
    }),
  };
}

/**
 * Create mock email service
 */
function createMockEmailService() {
  return {
    sendParentalConsentEmail: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Compliance Integration Tests', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEmailService: ReturnType<typeof createMockEmailService>;

  let complianceService: ComplianceService;
  let auditService: ComplianceAuditService;
  let ageVerificationService: AgeVerificationService;
  let parentalConsentService: ParentalConsentService;
  let dataDeletionService: DataDeletionService;
  let complianceReportService: ComplianceReportService;
  let geoIpService: GeoIpService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks
    mockPrisma = createMockPrismaService();
    mockEmailService = createMockEmailService();

    // Initialize services with real implementations where possible
    complianceService = new ComplianceService();
    geoIpService = new GeoIpService();
    auditService = new ComplianceAuditService(mockPrisma as unknown as PrismaService);
    dataDeletionService = new DataDeletionService(
      mockPrisma as unknown as PrismaService,
      auditService,
    );
    ageVerificationService = new AgeVerificationService(
      complianceService,
      mockPrisma as unknown as PrismaService,
      auditService,
    );
    parentalConsentService = new ParentalConsentService(
      mockPrisma as unknown as PrismaService,
      mockEmailService as unknown as EmailService,
      auditService,
      dataDeletionService,
    );
    complianceReportService = new ComplianceReportService(mockPrisma as unknown as PrismaService);
  });

  describe('Age Verification Flow', () => {
    it('should verify age for US minor and create audit log with lastAgeVerifiedAt update', async () => {
      const userId = fixtures.users.usMinor.id;
      const birthDate = fixtures.users.usMinor.birthDate;
      const countryCode = 'US';

      const result = await ageVerificationService.verifyAge(userId, birthDate, countryCode);

      // Verify result
      expect(result.isMinor).toBe(true);
      expect(result.requiresConsent).toBe(true);
      expect(result.consentAge).toBe(13);
      expect(result.regionalRules.regulationName).toBe('COPPA');

      // Verify user record was updated
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          birthDate,
          declaredCountry: 'US',
          isMinor: true,
          regionalConsentAge: 13,
          parentConsentStatus: ParentConsentStatus.PENDING,
          lastAgeVerifiedAt: expect.any(Date),
        }),
      });

      // Verify audit log was created
      expect(mockPrisma._auditLogs).toHaveLength(1);
      expect(mockPrisma._auditLogs[0]).toMatchObject({
        userId,
        action: ComplianceAction.AGE_VERIFIED,
        metadata: expect.objectContaining({
          region: 'US',
          consentAge: 13,
          isMinor: true,
          requiresConsent: true,
        }),
      });
    });

    it('should verify age for UK minor and apply AADC rules', async () => {
      const userId = fixtures.users.gbMinor.id;
      const birthDate = fixtures.users.gbMinor.birthDate;
      const countryCode = 'GB';

      const result = await ageVerificationService.verifyAge(userId, birthDate, countryCode);

      expect(result.isMinor).toBe(true);
      expect(result.requiresConsent).toBe(true);
      expect(result.consentAge).toBe(13);
      expect(result.regionalRules.regulationName).toBe('AADC');
      expect(result.regionalRules.requiresManualModeration).toBe(true);

      // Verify audit log
      expect(mockPrisma._auditLogs[0].metadata).toMatchObject({
        region: 'GB',
        consentAge: 13,
      });
    });

    it('should verify age for German minor and apply GDPR rules (age 16)', async () => {
      const userId = fixtures.users.deMinor.id;
      const birthDate = fixtures.users.deMinor.birthDate;
      const countryCode = 'DE';

      const result = await ageVerificationService.verifyAge(userId, birthDate, countryCode);

      expect(result.isMinor).toBe(true);
      expect(result.requiresConsent).toBe(true);
      expect(result.consentAge).toBe(16); // Germany uses 16
      expect(result.regionalRules.regulationName).toBe('GDPR');
      expect(result.regionalRules.dataRetentionDays).toBe(365); // GDPR shorter retention

      // Verify audit log
      expect(mockPrisma._auditLogs[0].metadata).toMatchObject({
        region: 'DE',
        consentAge: 16,
      });
    });

    it('should verify age for adult and not require consent', async () => {
      const userId = fixtures.users.adult.id;
      const birthDate = fixtures.users.adult.birthDate;
      const countryCode = 'US';

      const result = await ageVerificationService.verifyAge(userId, birthDate, countryCode);

      expect(result.isMinor).toBe(false);
      expect(result.requiresConsent).toBe(false);

      // Verify user record was updated with NOT_REQUIRED status
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          isMinor: false,
          parentConsentStatus: ParentConsentStatus.NOT_REQUIRED,
        }),
      });
    });
  });

  describe('Parental Consent Flow', () => {
    it('should complete full consent flow: initiate -> verify -> audit logs', async () => {
      const userId = fixtures.users.usMinor.id;
      const parentEmail = fixtures.parentEmails.us;

      // Step 1: Initiate consent
      const initResult = await parentalConsentService.initiateConsent(userId, parentEmail);

      expect(initResult.consentId).toBeDefined();
      expect(initResult.expiresAt).toBeInstanceOf(Date);
      expect(mockEmailService.sendParentalConsentEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          parentEmail,
          childDisplayName: fixtures.users.usMinor.displayName,
        }),
      );

      // Verify CONSENT_REQUESTED audit log
      const requestedLog = mockPrisma._auditLogs.find(
        (l) => l.action === ComplianceAction.CONSENT_REQUESTED,
      );
      expect(requestedLog).toBeDefined();
      expect(requestedLog?.metadata).toMatchObject({
        parentEmail,
        region: 'US',
      });

      // Step 2: Get the consent token from the mock
      const consentRecord = mockPrisma._parentalConsents.get(userId);
      expect(consentRecord).toBeDefined();
      const consentToken = consentRecord!.consentToken;

      // Step 3: Verify consent
      const verifyResult = await parentalConsentService.verifyConsent(
        consentToken,
        '192.168.1.100',
      );

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.childDisplayName).toBe(fixtures.users.usMinor.displayName);

      // Verify CONSENT_VERIFIED audit log
      const verifiedLog = mockPrisma._auditLogs.find(
        (l) => l.action === ComplianceAction.CONSENT_VERIFIED,
      );
      expect(verifiedLog).toBeDefined();
      expect(verifiedLog?.metadata).toMatchObject({
        ipAddress: '192.168.1.100',
      });

      // Verify user status was updated
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { parentConsentStatus: ParentConsentStatus.VERIFIED },
      });
    });

    it('should handle consent withdrawal with data deletion request', async () => {
      const userId = fixtures.users.usMinor.id;
      const parentEmail = fixtures.parentEmails.us;

      // Setup: Initiate and verify consent first
      await parentalConsentService.initiateConsent(userId, parentEmail);
      const consentRecord = mockPrisma._parentalConsents.get(userId);
      await parentalConsentService.verifyConsent(consentRecord!.consentToken);

      // Clear audit logs for withdrawal test
      mockPrisma._auditLogs.length = 0;

      // Withdraw consent
      await parentalConsentService.withdrawConsent(userId);

      // Verify CONSENT_WITHDRAWN audit log
      const withdrawnLog = mockPrisma._auditLogs.find(
        (l) => l.action === ComplianceAction.CONSENT_WITHDRAWN,
      );
      expect(withdrawnLog).toBeDefined();
      expect(withdrawnLog?.metadata).toMatchObject({
        triggersDataDeletion: true,
      });

      // Verify data deletion request was created
      const deletionLog = mockPrisma._auditLogs.find(
        (l) => l.action === ComplianceAction.DATA_DELETION_REQUESTED,
      );
      expect(deletionLog).toBeDefined();
      expect(deletionLog?.metadata).toMatchObject({
        requestedBy: 'PARENT',
      });

      // Verify deletion request exists
      const deletionRequest = mockPrisma._dataDeletionRequests.get(userId);
      expect(deletionRequest).toBeDefined();
      expect(deletionRequest?.requestedBy).toBe('PARENT');
      expect(deletionRequest?.status).toBe(DeletionStatus.PENDING);
    });

    it('should reject expired consent token', async () => {
      const userId = fixtures.users.usMinor.id;
      const parentEmail = fixtures.parentEmails.us;

      // Create consent with expired token
      await parentalConsentService.initiateConsent(userId, parentEmail);

      // Manually expire the token
      const consent = mockPrisma._parentalConsents.get(userId);
      consent!.tokenExpiresAt = new Date(Date.now() - 1000); // 1 second ago

      const result = await parentalConsentService.verifyConsent(consent!.consentToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject already verified consent token', async () => {
      const userId = fixtures.users.usMinor.id;
      const parentEmail = fixtures.parentEmails.us;

      await parentalConsentService.initiateConsent(userId, parentEmail);
      const consent = mockPrisma._parentalConsents.get(userId);

      // First verification
      await parentalConsentService.verifyConsent(consent!.consentToken);

      // Second verification attempt
      const result = await parentalConsentService.verifyConsent(consent!.consentToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been verified');
    });
  });

  describe('Compliance Report Generation', () => {
    beforeEach(async () => {
      // Setup: Create various audit logs
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Age verifications
      await auditService.logAction(fixtures.users.usMinor.id, ComplianceAction.AGE_VERIFIED, {
        region: 'US',
      });
      await auditService.logAction(fixtures.users.gbMinor.id, ComplianceAction.AGE_VERIFIED, {
        region: 'GB',
      });
      await auditService.logAction(fixtures.users.deMinor.id, ComplianceAction.AGE_VERIFIED, {
        region: 'DE',
      });

      // Consent flow
      await auditService.logAction(fixtures.users.usMinor.id, ComplianceAction.CONSENT_REQUESTED, {
        region: 'US',
      });
      await auditService.logAction(fixtures.users.usMinor.id, ComplianceAction.CONSENT_VERIFIED, {
        region: 'US',
      });

      await auditService.logAction(fixtures.users.gbMinor.id, ComplianceAction.CONSENT_REQUESTED, {
        region: 'GB',
      });
      await auditService.logAction(fixtures.users.gbMinor.id, ComplianceAction.CONSENT_WITHDRAWN, {
        region: 'GB',
      });

      // Data deletion
      await auditService.logAction(
        fixtures.users.gbMinor.id,
        ComplianceAction.DATA_DELETION_REQUESTED,
        { region: 'GB' },
      );
    });

    it('should generate summary with correct counts', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date(Date.now() + 1000); // Just past now

      const summary = await complianceReportService.generateSummary({
        startDate,
        endDate,
      });

      expect(summary.ageVerifications).toBe(3);
      expect(summary.consentRequestsSent).toBe(2);
      expect(summary.consentsVerified).toBe(1);
      expect(summary.consentsWithdrawn).toBe(1);
      expect(summary.dataDeletionRequests).toBe(1);
      expect(summary.reportPeriod.start).toEqual(startDate);
      expect(summary.reportPeriod.end).toEqual(endDate);
    });

    it('should generate region breakdown', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 1000);

      const summary = await complianceReportService.generateSummary({
        startDate,
        endDate,
      });

      expect(summary.regionBreakdown).toBeDefined();
      expect(summary.regionBreakdown['US']).toBe(3); // 1 age + 1 request + 1 verified
      expect(summary.regionBreakdown['GB']).toBe(4); // 1 age + 1 request + 1 withdrawn + 1 deletion
      expect(summary.regionBreakdown['DE']).toBe(1); // 1 age
    });

    it('should generate detailed report with audit logs', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 1000);

      const detail = await complianceReportService.generateDetailReport(
        {
          startDate,
          endDate,
          actionTypes: [ComplianceAction.CONSENT_VERIFIED, ComplianceAction.CONSENT_WITHDRAWN],
        },
        10,
        0,
      );

      expect(detail.summary).toBeDefined();
      expect(detail.auditLogs).toHaveLength(2);

      const actions = detail.auditLogs.map((l) => l.action);
      expect(actions).toContain(ComplianceAction.CONSENT_VERIFIED);
      expect(actions).toContain(ComplianceAction.CONSENT_WITHDRAWN);
    });
  });

  describe('GeoIP Integration', () => {
    it('should return GeoIP result for US IP and apply COPPA rules', async () => {
      // IP starting with 1 or 2 returns US in mock
      const result = await geoIpService.getCountry('1.2.3.4');

      expect(result.countryCode).toBe('US');
      expect(result.source).toBe('geoip');
      expect(result.confidence).toBe('high');

      // Verify compliance rules
      const rules = complianceService.getRegionalRules(result.countryCode!);
      expect(rules.regulationName).toBe('COPPA');
      expect(rules.consentAge).toBe(13);
    });

    it('should return GeoIP result for UK IP and apply AADC rules', async () => {
      // IP starting with 3 or 4 returns GB in mock
      const result = await geoIpService.getCountry('3.4.5.6');

      expect(result.countryCode).toBe('GB');
      expect(result.source).toBe('geoip');
      expect(result.confidence).toBe('high');

      const rules = complianceService.getRegionalRules(result.countryCode!);
      expect(rules.regulationName).toBe('AADC');
      expect(rules.requiresManualModeration).toBe(true);
    });

    it('should return GeoIP result for German IP and apply GDPR rules', async () => {
      // IP starting with 5 returns DE in mock
      const result = await geoIpService.getCountry('5.6.7.8');

      expect(result.countryCode).toBe('DE');
      expect(result.source).toBe('geoip');
      expect(result.confidence).toBe('high');

      const rules = complianceService.getRegionalRules(result.countryCode!);
      expect(rules.regulationName).toBe('GDPR');
      expect(rules.consentAge).toBe(16);
      expect(rules.dataRetentionDays).toBe(365);
    });

    it('should fallback to user declared country when GeoIP fails', async () => {
      // IP starting with other octets returns null in mock
      const result = await geoIpService.getCountry('192.168.1.1', 'CA');

      expect(result.countryCode).toBe('CA');
      expect(result.source).toBe('user_declared');
      expect(result.confidence).toBe('medium');

      const rules = complianceService.getRegionalRules(result.countryCode!);
      expect(rules.regulationName).toBe('PIPEDA');
      expect(rules.consentAge).toBe(13);
    });

    it('should fallback to US (most restrictive) when both GeoIP and declared country fail', async () => {
      const result = await geoIpService.getCountry('192.168.1.1');

      expect(result.countryCode).toBe('US');
      expect(result.source).toBe('default');
      expect(result.confidence).toBe('low');
    });

    it('should correctly determine minor status using GeoIP result', async () => {
      // Get country from IP
      const geoResult = await geoIpService.getCountry('5.6.7.8'); // Returns DE
      expect(geoResult.countryCode).toBe('DE');

      // Use the country for age verification
      const birthDate = new Date('2014-01-15'); // ~12 years old
      const isMinor = complianceService.isMinor(birthDate, geoResult.countryCode!);
      const requiresConsent = complianceService.requiresParentalConsent(
        birthDate,
        geoResult.countryCode!,
      );

      // In Germany (GDPR), consent age is 16, so 12-year-old is a minor
      expect(isMinor).toBe(true);
      expect(requiresConsent).toBe(true);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle complete child registration flow: GeoIP -> Age Verify -> Consent -> Audit', async () => {
      const userId = 'new-child-user';
      const birthDate = new Date('2016-01-01'); // Young minor
      const ipAddress = '1.2.3.4'; // US IP
      const parentEmail = 'parent@example.com';

      // Add user to mock
      mockPrisma._users.set(userId, {
        id: userId,
        displayName: 'New Child',
        declaredCountry: null as unknown as string,
        birthDate: null as unknown as Date,
        email: 'child@example.com',
        isMinor: false,
        parentConsentStatus: ParentConsentStatus.NOT_REQUIRED,
        regionalConsentAge: 0,
      });

      // Step 1: Determine country from IP
      const geoResult = await geoIpService.getCountry(ipAddress);
      expect(geoResult.countryCode).toBe('US');

      // Step 2: Verify age
      const ageResult = await ageVerificationService.verifyAge(
        userId,
        birthDate,
        geoResult.countryCode!,
      );
      expect(ageResult.isMinor).toBe(true);
      expect(ageResult.requiresConsent).toBe(true);

      // Step 3: Initiate parental consent
      const consentResult = await parentalConsentService.initiateConsent(userId, parentEmail);
      expect(consentResult.consentId).toBeDefined();

      // Step 4: Verify consent
      const consent = mockPrisma._parentalConsents.get(userId);
      const verifyResult = await parentalConsentService.verifyConsent(
        consent!.consentToken,
        ipAddress,
      );
      expect(verifyResult.success).toBe(true);

      // Verify complete audit trail
      const auditLogs = mockPrisma._auditLogs;
      const actions = auditLogs.map((l) => l.action);

      expect(actions).toContain(ComplianceAction.AGE_VERIFIED);
      expect(actions).toContain(ComplianceAction.CONSENT_REQUESTED);
      expect(actions).toContain(ComplianceAction.CONSENT_VERIFIED);

      // Verify all logs are for the same user
      auditLogs.forEach((log) => {
        expect(log.userId).toBe(userId);
      });
    });

    it('should maintain audit trail integrity across service failures', async () => {
      const userId = fixtures.users.usMinor.id;

      // Age verification should log even if it's the only successful step
      await ageVerificationService.verifyAge(userId, fixtures.users.usMinor.birthDate, 'US');

      // Verify audit log exists
      const ageLog = mockPrisma._auditLogs.find(
        (l) => l.action === ComplianceAction.AGE_VERIFIED && l.userId === userId,
      );
      expect(ageLog).toBeDefined();

      // Audit logs should persist independently of other operations
      expect(mockPrisma._auditLogs.length).toBeGreaterThan(0);
    });
  });
});
