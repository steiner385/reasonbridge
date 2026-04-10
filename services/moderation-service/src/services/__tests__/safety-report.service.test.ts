/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafetyReportService } from '../safety-report.service.js';
import type { SafetyReportReason, ReviewPriority } from '@prisma/client';

describe('SafetyReportService', () => {
  let service: SafetyReportService;
  let prismaService: any;
  let queueService: any;

  const mockReport = {
    id: 'report-123',
    reporterId: 'user-456',
    reason: 'UNCOMFORTABLE' as SafetyReportReason,
    additionalInfo: 'Something felt wrong',
    status: 'PENDING',
    priority: 'NORMAL' as ReviewPriority,
    contextUrl: '/topics/topic-789',
    contextTopicId: 'topic-789',
    contextResponseId: null,
    moderatorNotes: null,
    handledById: null,
    handledAt: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    prismaService = {
      safetyReport: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    queueService = {
      publishEvent: vi.fn().mockResolvedValue('message-id'),
    };

    service = new SafetyReportService(prismaService, queueService);
  });

  describe('createReport', () => {
    it('should create a report with NORMAL priority for UNCOMFORTABLE reason', async () => {
      prismaService.safetyReport.create.mockResolvedValue(mockReport);

      const result = await service.createReport({
        reporterId: 'user-456',
        reason: 'UNCOMFORTABLE',
        additionalInfo: 'Something felt wrong',
        contextUrl: '/topics/topic-789',
        contextTopicId: 'topic-789',
      });

      expect(prismaService.safetyReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reporterId: 'user-456',
          reason: 'UNCOMFORTABLE',
          priority: 'NORMAL',
          status: 'PENDING',
        }),
      });
      expect(result.id).toBe('report-123');
    });

    it('should create a report with URGENT priority for STRANGER_CONTACT reason', async () => {
      const urgentReport = { ...mockReport, reason: 'STRANGER_CONTACT', priority: 'URGENT' };
      prismaService.safetyReport.create.mockResolvedValue(urgentReport);

      await service.createReport({
        reporterId: 'user-456',
        reason: 'STRANGER_CONTACT',
      });

      expect(prismaService.safetyReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: 'STRANGER_CONTACT',
          priority: 'URGENT',
        }),
      });
    });

    it('should create a report with URGENT priority for PERSONAL_QUESTIONS reason', async () => {
      const urgentReport = { ...mockReport, reason: 'PERSONAL_QUESTIONS', priority: 'URGENT' };
      prismaService.safetyReport.create.mockResolvedValue(urgentReport);

      await service.createReport({
        reporterId: 'user-456',
        reason: 'PERSONAL_QUESTIONS',
      });

      expect(prismaService.safetyReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: 'PERSONAL_QUESTIONS',
          priority: 'URGENT',
        }),
      });
    });

    it('should create a report with HIGH priority for SCARY_CONTENT reason', async () => {
      const highReport = { ...mockReport, reason: 'SCARY_CONTENT', priority: 'HIGH' };
      prismaService.safetyReport.create.mockResolvedValue(highReport);

      await service.createReport({
        reporterId: 'user-456',
        reason: 'SCARY_CONTENT',
      });

      expect(prismaService.safetyReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: 'SCARY_CONTENT',
          priority: 'HIGH',
        }),
      });
    });

    it('should publish safety.report.created event after creating report', async () => {
      prismaService.safetyReport.create.mockResolvedValue(mockReport);

      await service.createReport({
        reporterId: 'user-456',
        reason: 'UNCOMFORTABLE',
        additionalInfo: 'Something felt wrong',
        contextTopicId: 'topic-789',
      });

      expect(queueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'safety.report.created',
          payload: expect.objectContaining({
            reportId: 'report-123',
            reporterId: 'user-456',
            reason: 'UNCOMFORTABLE',
            priority: 'NORMAL',
          }),
        }),
      );
    });

    it('should still return report if event publishing fails', async () => {
      prismaService.safetyReport.create.mockResolvedValue(mockReport);
      queueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.createReport({
        reporterId: 'user-456',
        reason: 'UNCOMFORTABLE',
      });

      // Report should still be returned even though event publishing failed
      expect(result.id).toBe('report-123');
    });
  });

  describe('findReport', () => {
    it('should return a report by ID', async () => {
      prismaService.safetyReport.findUnique.mockResolvedValue(mockReport);

      const result = await service.findReport('report-123');

      expect(prismaService.safetyReport.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' },
      });
      expect(result?.id).toBe('report-123');
    });

    it('should return null if report not found', async () => {
      prismaService.safetyReport.findUnique.mockResolvedValue(null);

      const result = await service.findReport('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listReports', () => {
    it('should list reports with pagination', async () => {
      const reports = [mockReport, { ...mockReport, id: 'report-124' }];
      prismaService.safetyReport.findMany.mockResolvedValue(reports);

      const result = await service.listReports(undefined, undefined, 20);

      expect(prismaService.safetyReport.findMany).toHaveBeenCalledWith({
        where: {},
        take: 21,
        cursor: undefined,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      expect(result.reports).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it('should filter by status', async () => {
      prismaService.safetyReport.findMany.mockResolvedValue([mockReport]);

      await service.listReports('PENDING');

      expect(prismaService.safetyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        }),
      );
    });

    it('should filter by priority', async () => {
      prismaService.safetyReport.findMany.mockResolvedValue([]);

      await service.listReports(undefined, 'URGENT');

      expect(prismaService.safetyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { priority: 'URGENT' },
        }),
      );
    });
  });

  describe('getPendingReports', () => {
    it('should get pending and under_review reports', async () => {
      prismaService.safetyReport.findMany.mockResolvedValue([mockReport]);

      const result = await service.getPendingReports();

      expect(prismaService.safetyReport.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
        },
        take: 20,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateReport', () => {
    it('should update report status', async () => {
      const updatedReport = { ...mockReport, status: 'UNDER_REVIEW' };
      prismaService.safetyReport.update.mockResolvedValue(updatedReport);

      const result = await service.updateReport('report-123', {
        status: 'UNDER_REVIEW',
      });

      expect(prismaService.safetyReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: { status: 'UNDER_REVIEW' },
      });
      expect(result.status).toBe('UNDER_REVIEW');
    });

    it('should update moderator notes', async () => {
      const updatedReport = { ...mockReport, moderatorNotes: 'Reviewed and safe' };
      prismaService.safetyReport.update.mockResolvedValue(updatedReport);

      await service.updateReport('report-123', {
        moderatorNotes: 'Reviewed and safe',
      });

      expect(prismaService.safetyReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: { moderatorNotes: 'Reviewed and safe' },
      });
    });

    it('should set handledAt when handledById is provided', async () => {
      const now = new Date();
      vi.useFakeTimers().setSystemTime(now);

      const updatedReport = {
        ...mockReport,
        handledById: 'mod-123',
        handledAt: now,
      };
      prismaService.safetyReport.update.mockResolvedValue(updatedReport);

      await service.updateReport('report-123', {
        handledById: 'mod-123',
      });

      expect(prismaService.safetyReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          handledById: 'mod-123',
          handledAt: now,
        }),
      });

      vi.useRealTimers();
    });
  });

  describe('resolveReport', () => {
    it('should resolve a report with RESOLVED status', async () => {
      const resolvedReport = {
        ...mockReport,
        status: 'RESOLVED',
        handledById: 'mod-123',
        moderatorNotes: 'Issue addressed',
      };
      prismaService.safetyReport.update.mockResolvedValue(resolvedReport);

      const result = await service.resolveReport('report-123', 'mod-123', 'Issue addressed');

      expect(result.status).toBe('RESOLVED');
      expect(result.moderatorNotes).toBe('Issue addressed');
    });
  });

  describe('escalateReport', () => {
    it('should escalate a report with ESCALATED status', async () => {
      const escalatedReport = {
        ...mockReport,
        status: 'ESCALATED',
        handledById: 'mod-123',
        moderatorNotes: 'Needs higher review',
      };
      prismaService.safetyReport.update.mockResolvedValue(escalatedReport);

      const result = await service.escalateReport('report-123', 'mod-123', 'Needs higher review');

      expect(result.status).toBe('ESCALATED');
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      prismaService.safetyReport.groupBy
        .mockResolvedValueOnce([
          { status: 'PENDING', _count: { status: 5 } },
          { status: 'RESOLVED', _count: { status: 10 } },
        ])
        .mockResolvedValueOnce([
          { reason: 'UNCOMFORTABLE', _count: { reason: 8 } },
          { reason: 'STRANGER_CONTACT', _count: { reason: 3 } },
        ])
        .mockResolvedValueOnce([
          { priority: 'NORMAL', _count: { priority: 12 } },
          { priority: 'URGENT', _count: { priority: 3 } },
        ]);

      const result = await service.getStats();

      expect(result.totalPending).toBe(5);
      expect(result.totalResolved).toBe(10);
      expect(result.byReason['UNCOMFORTABLE']).toBe(8);
      expect(result.byPriority['URGENT']).toBe(3);
    });
  });

  describe('getReportsByReporter', () => {
    it('should get reports by reporter ID', async () => {
      prismaService.safetyReport.findMany.mockResolvedValue([mockReport]);

      const result = await service.getReportsByReporter('user-456');

      expect(prismaService.safetyReport.findMany).toHaveBeenCalledWith({
        where: { reporterId: 'user-456' },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });
});
