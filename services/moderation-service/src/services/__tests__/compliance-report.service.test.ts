/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceReportService } from '../compliance-report.service.js';

describe('ComplianceReportService', () => {
  let service: ComplianceReportService;
  let prisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    prisma = {
      safetyReport: {
        findMany: vi.fn(),
      },
      childContentReviewQueue: {
        findMany: vi.fn(),
      },
      moderationAction: {
        count: vi.fn(),
      },
      csamReport: {
        findMany: vi.fn(),
      },
      user: {
        count: vi.fn(),
      },
    };

    service = new ComplianceReportService(prisma);
  });

  describe('generateReport', () => {
    beforeEach(() => {
      // Mock all data sources with minimal data
      prisma.safetyReport.findMany.mockResolvedValue([]);
      prisma.childContentReviewQueue.findMany.mockResolvedValue([]);
      prisma.moderationAction.count.mockResolvedValue(0);
      prisma.csamReport.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
    });

    it('should generate a report with correct structure', async () => {
      const report = await service.generateReport('monthly');

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('childSafety');
      expect(report).toHaveProperty('moderation');
      expect(report).toHaveProperty('ncmec');
      expect(report).toHaveProperty('sla');
      expect(report).toHaveProperty('minorUsers');
      expect(report).toHaveProperty('summary');
    });

    it('should include all frameworks when ALL is specified', async () => {
      const report = await service.generateReport('monthly', ['ALL']);

      expect(report.frameworks).toContain('COPPA');
      expect(report.frameworks).toContain('GDPR_K');
      expect(report.frameworks).toContain('INTERNAL');
    });

    it('should include only specified frameworks', async () => {
      const report = await service.generateReport('monthly', ['COPPA']);

      expect(report.frameworks).toEqual(['COPPA']);
    });

    it('should calculate correct period dates for monthly report', async () => {
      const report = await service.generateReport('monthly');

      const expectedStart = new Date();
      expectedStart.setMonth(expectedStart.getMonth() - 1);

      expect(report.period.type).toBe('monthly');
      // Check that start date is approximately 1 month ago (within a day)
      const diffDays = Math.abs(
        (report.period.startDate.getTime() - expectedStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeLessThan(1);
    });
  });

  describe('getChildSafetyMetrics', () => {
    it('should calculate safety metrics correctly', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      prisma.safetyReport.findMany.mockResolvedValue([
        {
          reason: 'UNCOMFORTABLE',
          priority: 'NORMAL',
          status: 'RESOLVED',
          createdAt: oneHourAgo,
          handledAt: now,
        },
        {
          reason: 'STRANGER_CONTACT',
          priority: 'URGENT',
          status: 'PENDING',
          createdAt: now,
          handledAt: null,
        },
        {
          reason: 'UNCOMFORTABLE',
          priority: 'NORMAL',
          status: 'ESCALATED',
          createdAt: oneHourAgo,
          handledAt: now,
        },
      ]);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const metrics = await service.getChildSafetyMetrics(startDate, now);

      expect(metrics.totalSafetyReports).toBe(3);
      expect(metrics.reportsByReason['UNCOMFORTABLE']).toBe(2);
      expect(metrics.reportsByReason['STRANGER_CONTACT']).toBe(1);
      expect(metrics.reportsByPriority['NORMAL']).toBe(2);
      expect(metrics.reportsByPriority['URGENT']).toBe(1);
      expect(metrics.pendingReports).toBe(1);
      expect(metrics.escalatedToLawEnforcement).toBe(1);
      expect(metrics.averageResolutionTime).toBe(60); // 60 minutes
    });
  });

  describe('getModerationMetrics', () => {
    it('should calculate moderation metrics correctly', async () => {
      prisma.childContentReviewQueue.findMany.mockResolvedValue([
        { status: 'COMPLETED', reviewResult: 'BLOCKED', groomingDetected: true },
        { status: 'COMPLETED', reviewResult: 'APPROVED', groomingDetected: false },
        { status: 'PENDING', reviewResult: null, groomingDetected: false },
      ]);
      prisma.moderationAction.count.mockResolvedValue(10);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const metrics = await service.getModerationMetrics(startDate, new Date());

      expect(metrics.childContentReviewed).toBe(3);
      expect(metrics.groomingDetections).toBe(1);
      expect(metrics.contentBlocked).toBe(1);
      expect(metrics.contentFlagged).toBe(1); // PENDING item
      expect(metrics.totalContentReviewed).toBe(13); // 10 actions + 3 queue items
    });
  });

  describe('getNcmecMetrics', () => {
    it('should calculate NCMEC metrics correctly', async () => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const submittedOnTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const submittedLate = new Date(now.getTime() + 36 * 60 * 60 * 1000);

      prisma.csamReport.findMany.mockResolvedValue([
        {
          ncmecReportId: 'NCMEC-1',
          ncmecSubmittedAt: submittedOnTime,
          ncmecDeadline: deadline,
          createdAt: now,
          status: 'SUBMITTED',
        },
        {
          ncmecReportId: 'NCMEC-2',
          ncmecSubmittedAt: submittedLate,
          ncmecDeadline: deadline,
          createdAt: now,
          status: 'SUBMITTED',
        },
        {
          ncmecReportId: null,
          ncmecSubmittedAt: null,
          ncmecDeadline: deadline,
          createdAt: now,
          status: 'PENDING',
        },
      ]);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const metrics = await service.getNcmecMetrics(startDate, new Date());

      expect(metrics.totalCsamReports).toBe(3);
      expect(metrics.submittedToNcmec).toBe(2);
      expect(metrics.pendingSubmission).toBe(1);
      expect(metrics.withinDeadline).toBe(1);
      expect(metrics.deadlineBreaches).toBe(1);
    });
  });

  describe('getSlaMetrics', () => {
    it('should calculate SLA metrics correctly', async () => {
      const now = new Date();
      const shortTime = 30; // 30 minutes
      const longTime = 300; // 5 hours (breaches HIGH SLA)

      prisma.childContentReviewQueue.findMany.mockResolvedValue([
        {
          priority: 'URGENT',
          createdAt: new Date(now.getTime() - shortTime * 60 * 1000),
          completedAt: now,
        },
        {
          priority: 'HIGH',
          createdAt: new Date(now.getTime() - longTime * 60 * 1000),
          completedAt: now,
        },
      ]);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const metrics = await service.getSlaMetrics(startDate, now);

      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.withinSla).toBe(1);
      expect(metrics.breachedSla).toBe(1);
      expect(metrics.complianceRate).toBe(50);
      expect(metrics.byPriority['URGENT'].complianceRate).toBe(100);
      expect(metrics.byPriority['HIGH'].complianceRate).toBe(0);
    });
  });

  describe('getMinorUserStats', () => {
    it('should calculate minor user statistics correctly', async () => {
      prisma.user.count
        .mockResolvedValueOnce(100) // totalMinors
        .mockResolvedValueOnce(10) // newRegistrations
        .mockResolvedValueOnce(85); // withParentalConsent

      prisma.safetyReport.findMany.mockResolvedValue([
        { reporterId: 'user-1' },
        { reporterId: 'user-2' },
        { reporterId: 'user-1' }, // Duplicate should be filtered by distinct
      ]);

      prisma.childContentReviewQueue.findMany.mockResolvedValue([
        { authorId: 'user-3' },
        { authorId: 'user-4' },
      ]);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const stats = await service.getMinorUserStats(startDate, new Date());

      expect(stats.totalMinors).toBe(100);
      expect(stats.newRegistrations).toBe(10);
      expect(stats.withParentalConsent).toBe(85);
      expect(stats.minorsWithSafetyReports).toBe(3); // Mock returns 3 (not distinct in mock)
      expect(stats.minorsWithModeratedContent).toBe(2);
    });
  });

  describe('summary generation', () => {
    it('should flag NCMEC deadline breaches as critical', async () => {
      prisma.safetyReport.findMany.mockResolvedValue([]);
      prisma.childContentReviewQueue.findMany.mockResolvedValue([]);
      prisma.moderationAction.count.mockResolvedValue(0);
      prisma.csamReport.findMany.mockResolvedValue([
        {
          ncmecReportId: 'NCMEC-1',
          ncmecSubmittedAt: new Date(),
          ncmecDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past deadline
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          status: 'SUBMITTED',
        },
      ]);
      prisma.user.count.mockResolvedValue(0);

      const report = await service.generateReport('monthly');

      expect(report.summary.criticalIssues).toContainEqual(
        expect.stringContaining('NCMEC reports missed'),
      );
    });

    it('should flag low SLA compliance as critical', async () => {
      prisma.safetyReport.findMany.mockResolvedValue([]);
      prisma.moderationAction.count.mockResolvedValue(0);
      prisma.csamReport.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      // Create items with SLA breaches
      const now = new Date();
      prisma.childContentReviewQueue.findMany.mockResolvedValue([
        // 10 items that breached SLA
        ...Array.from({ length: 10 }, () => ({
          priority: 'URGENT',
          createdAt: new Date(now.getTime() - 120 * 60 * 1000), // 2 hours ago
          reviewedAt: now, // Changed from completedAt to match schema
        })),
      ]);

      const report = await service.generateReport('monthly');

      // All 10 URGENT items breached their 1-hour SLA
      expect(report.sla.complianceRate).toBe(0);
      expect(report.summary.criticalIssues).toContainEqual(
        expect.stringContaining('SLA compliance rate'),
      );
    });
  });
});
