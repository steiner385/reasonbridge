/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../report.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { ReportStatus, ReportCategory } from '@prisma/client';

describe('ReportService', () => {
  let service: ReportService;
  let prismaService: any;
  let queueService: any;

  const mockReporter = { id: 'user-456', displayName: 'Test User' };
  const mockModerator = { id: 'mod-789', displayName: 'Test Moderator' };

  const mockReport = {
    id: 'report-123',
    reporterId: 'user-456',
    contentType: 'response',
    contentId: 'content-789',
    category: 'HARASSMENT' as ReportCategory,
    description: 'Offensive comment',
    status: 'PENDING' as ReportStatus,
    moderatorId: null,
    resolution: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    resolvedAt: null,
    reporter: mockReporter,
    moderator: null,
  };

  beforeEach(() => {
    prismaService = {
      report: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    queueService = {
      publishEvent: vi.fn().mockResolvedValue('message-id'),
    };

    service = new ReportService(prismaService, queueService);
  });

  describe('createReport', () => {
    it('should create a report successfully', async () => {
      prismaService.report.findFirst.mockResolvedValue(null); // No existing report
      prismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.createReport(
        {
          contentType: 'response',
          contentId: 'content-789',
          category: 'HARASSMENT',
          description: 'Offensive comment',
        },
        'user-456',
      );

      expect(prismaService.report.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reporterId: 'user-456',
          contentType: 'response',
          contentId: 'content-789',
          category: 'HARASSMENT',
          description: 'Offensive comment',
          status: 'PENDING',
        }),
        include: {
          reporter: { select: { id: true, displayName: true } },
          moderator: { select: { id: true, displayName: true } },
        },
      });
      expect(result.id).toBe('report-123');
    });

    it('should publish report.created event after creating report', async () => {
      prismaService.report.findFirst.mockResolvedValue(null);
      prismaService.report.create.mockResolvedValue(mockReport);

      await service.createReport(
        {
          contentType: 'response',
          contentId: 'content-789',
          category: 'HARASSMENT',
          description: 'Offensive comment',
        },
        'user-456',
      );

      expect(queueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'report.created',
          payload: expect.objectContaining({
            reportId: 'report-123',
            reporterId: 'user-456',
            contentType: 'response',
            category: 'HARASSMENT',
          }),
        }),
      );
    });

    it('should still return report if event publishing fails', async () => {
      prismaService.report.findFirst.mockResolvedValue(null);
      prismaService.report.create.mockResolvedValue(mockReport);
      queueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.createReport(
        {
          contentType: 'response',
          contentId: 'content-789',
          category: 'HARASSMENT',
        },
        'user-456',
      );

      // Report should still be returned even though event publishing failed
      expect(result.id).toBe('report-123');
    });

    it('should reject invalid content type', async () => {
      await expect(
        service.createReport(
          {
            contentType: 'invalid' as any,
            contentId: 'content-789',
            category: 'SPAM',
          },
          'user-456',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid category', async () => {
      await expect(
        service.createReport(
          {
            contentType: 'response',
            contentId: 'content-789',
            category: 'INVALID' as any,
          },
          'user-456',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate pending report from same user', async () => {
      prismaService.report.findFirst.mockResolvedValue(mockReport);

      await expect(
        service.createReport(
          {
            contentType: 'response',
            contentId: 'content-789',
            category: 'HARASSMENT',
          },
          'user-456',
        ),
      ).rejects.toThrow('You have already submitted a pending report for this content');
    });
  });

  describe('getReportById', () => {
    it('should return a report by ID', async () => {
      prismaService.report.findUnique.mockResolvedValue(mockReport);

      const result = await service.getReportById('report-123');

      expect(prismaService.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        include: {
          reporter: { select: { id: true, displayName: true } },
          moderator: { select: { id: true, displayName: true } },
        },
      });
      expect(result.id).toBe('report-123');
    });

    it('should throw NotFoundException if report not found', async () => {
      prismaService.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReports', () => {
    it('should list reports with pagination', async () => {
      const reports = [mockReport, { ...mockReport, id: 'report-124' }];
      prismaService.report.findMany.mockResolvedValue(reports);
      prismaService.report.count.mockResolvedValue(2);

      const result = await service.getReports({ limit: 20 });

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { createdAt: 'desc' },
          take: 21,
        }),
      );
      expect(result.reports).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(2);
    });

    it('should filter by status', async () => {
      prismaService.report.findMany.mockResolvedValue([mockReport]);
      prismaService.report.count.mockResolvedValue(1);

      await service.getReports({ status: 'PENDING' });

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        }),
      );
    });

    it('should filter by category', async () => {
      prismaService.report.findMany.mockResolvedValue([]);
      prismaService.report.count.mockResolvedValue(0);

      await service.getReports({ category: 'SPAM' });

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'SPAM' },
        }),
      );
    });

    it('should filter by content type', async () => {
      prismaService.report.findMany.mockResolvedValue([]);
      prismaService.report.count.mockResolvedValue(0);

      await service.getReports({ contentType: 'topic' });

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contentType: 'topic' },
        }),
      );
    });

    it('should support date range filtering', async () => {
      prismaService.report.findMany.mockResolvedValue([]);
      prismaService.report.count.mockResolvedValue(0);

      const createdAfter = new Date('2025-01-01');
      const createdBefore = new Date('2025-01-31');

      await service.getReports({ createdAfter, createdBefore });

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: createdAfter, lte: createdBefore },
          },
        }),
      );
    });

    it('should indicate when there is a next page', async () => {
      const reports = Array.from({ length: 21 }, (_, i) => ({
        ...mockReport,
        id: `report-${i}`,
      }));
      prismaService.report.findMany.mockResolvedValue(reports);
      prismaService.report.count.mockResolvedValue(21);

      const result = await service.getReports({ limit: 20 });

      expect(result.reports).toHaveLength(20);
      expect(result.nextCursor).toBe('report-19');
    });
  });

  describe('getReportsByContent', () => {
    it('should return reports for a specific content', async () => {
      prismaService.report.findMany.mockResolvedValue([mockReport]);

      const result = await service.getReportsByContent('response', 'content-789');

      expect(prismaService.report.findMany).toHaveBeenCalledWith({
        where: {
          contentType: 'response',
          contentId: 'content-789',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, displayName: true } },
          moderator: { select: { id: true, displayName: true } },
        },
        take: 500,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status to REVIEWING', async () => {
      const updatedReport = { ...mockReport, status: 'REVIEWING', moderator: mockModerator };
      prismaService.report.findUnique.mockResolvedValue(mockReport);
      prismaService.report.update.mockResolvedValue(updatedReport);

      const result = await service.updateReportStatus(
        'report-123',
        { status: 'REVIEWING' },
        'mod-789',
      );

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          status: 'REVIEWING',
          moderator: { connect: { id: 'mod-789' } },
        }),
        include: {
          reporter: { select: { id: true, displayName: true } },
          moderator: { select: { id: true, displayName: true } },
        },
      });
      expect(result.status).toBe('REVIEWING');
    });

    it('should require resolution for RESOLVED status', async () => {
      prismaService.report.findUnique.mockResolvedValue(mockReport);

      await expect(
        service.updateReportStatus('report-123', { status: 'RESOLVED' }, 'mod-789'),
      ).rejects.toThrow('resolution is required when status is RESOLVED or DISMISSED');
    });

    it('should require resolution for DISMISSED status', async () => {
      prismaService.report.findUnique.mockResolvedValue(mockReport);

      await expect(
        service.updateReportStatus('report-123', { status: 'DISMISSED' }, 'mod-789'),
      ).rejects.toThrow('resolution is required when status is RESOLVED or DISMISSED');
    });

    it('should set resolvedAt for RESOLVED status', async () => {
      const now = new Date();
      vi.useFakeTimers().setSystemTime(now);

      const updatedReport = {
        ...mockReport,
        status: 'RESOLVED',
        resolution: 'Issue addressed',
        resolvedAt: now,
        moderator: mockModerator,
      };
      prismaService.report.findUnique.mockResolvedValue(mockReport);
      prismaService.report.update.mockResolvedValue(updatedReport);

      await service.updateReportStatus(
        'report-123',
        { status: 'RESOLVED', resolution: 'Issue addressed' },
        'mod-789',
      );

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolution: 'Issue addressed',
          resolvedAt: now,
        }),
        include: expect.anything(),
      });

      vi.useRealTimers();
    });

    it('should throw NotFoundException if report not found', async () => {
      prismaService.report.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReportStatus('nonexistent', { status: 'REVIEWING' }, 'mod-789'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid status', async () => {
      prismaService.report.findUnique.mockResolvedValue(mockReport);

      await expect(
        service.updateReportStatus('report-123', { status: 'INVALID' as any }, 'mod-789'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish report.status.changed event after updating status', async () => {
      const updatedReport = { ...mockReport, status: 'REVIEWING', moderator: mockModerator };
      prismaService.report.findUnique.mockResolvedValue(mockReport);
      prismaService.report.update.mockResolvedValue(updatedReport);

      await service.updateReportStatus('report-123', { status: 'REVIEWING' }, 'mod-789');

      expect(queueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'report.status.changed',
          payload: expect.objectContaining({
            reportId: 'report-123',
            previousStatus: 'PENDING',
            newStatus: 'REVIEWING',
            moderatorId: 'mod-789',
          }),
        }),
      );
    });

    it('should still return updated report if event publishing fails', async () => {
      const updatedReport = { ...mockReport, status: 'REVIEWING', moderator: mockModerator };
      prismaService.report.findUnique.mockResolvedValue(mockReport);
      prismaService.report.update.mockResolvedValue(updatedReport);
      queueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.updateReportStatus(
        'report-123',
        { status: 'REVIEWING' },
        'mod-789',
      );

      // Status update should still be returned even though event publishing failed
      expect(result.status).toBe('REVIEWING');
    });
  });

  describe('getReportStats', () => {
    it('should return aggregated statistics', async () => {
      prismaService.report.groupBy
        .mockResolvedValueOnce([
          { status: 'PENDING', _count: { status: 5 } },
          { status: 'REVIEWING', _count: { status: 3 } },
          { status: 'RESOLVED', _count: { status: 10 } },
        ])
        .mockResolvedValueOnce([
          { category: 'SPAM', _count: { category: 8 } },
          { category: 'HARASSMENT', _count: { category: 6 } },
        ]);

      prismaService.report.findMany.mockResolvedValue([]);
      prismaService.report.findFirst.mockResolvedValue(null);

      const result = await service.getReportStats();

      expect(result.byStatus.PENDING).toBe(5);
      expect(result.byStatus.REVIEWING).toBe(3);
      expect(result.byStatus.RESOLVED).toBe(10);
      expect(result.byCategory.SPAM).toBe(8);
      expect(result.byCategory.HARASSMENT).toBe(6);
      expect(result.totalPending).toBe(8); // PENDING + REVIEWING
    });

    it('should calculate average resolution time', async () => {
      prismaService.report.groupBy.mockResolvedValue([]);

      const baseTime = new Date('2025-01-15T10:00:00Z');
      const resolvedReports = [
        { createdAt: baseTime, resolvedAt: new Date(baseTime.getTime() + 60 * 60 * 1000) }, // 1 hour
        { createdAt: baseTime, resolvedAt: new Date(baseTime.getTime() + 30 * 60 * 1000) }, // 30 minutes
      ];
      prismaService.report.findMany.mockResolvedValue(resolvedReports);
      prismaService.report.findFirst.mockResolvedValue(null);

      const result = await service.getReportStats();

      // Average should be 45 minutes
      expect(result.avgResolutionTimeMinutes).toBe(45);
    });
  });

  describe('countPendingReports', () => {
    it('should count pending reports', async () => {
      prismaService.report.count.mockResolvedValue(15);

      const result = await service.countPendingReports();

      expect(prismaService.report.count).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
      expect(result).toBe(15);
    });
  });

  describe('getPendingReports', () => {
    it('should get pending reports ordered by creation time', async () => {
      prismaService.report.findMany.mockResolvedValue([mockReport]);

      const result = await service.getPendingReports(20);

      expect(prismaService.report.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: {
          reporter: { select: { id: true, displayName: true } },
          moderator: { select: { id: true, displayName: true } },
        },
      });
      expect(result).toHaveLength(1);
    });
  });
});
