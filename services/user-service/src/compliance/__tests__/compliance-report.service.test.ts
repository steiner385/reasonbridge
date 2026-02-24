/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceReportService } from '../compliance-report.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { ComplianceAction } from '@prisma/client';

describe('ComplianceReportService', () => {
  let service: ComplianceReportService;
  let mockPrisma: {
    user: {
      count: ReturnType<typeof vi.fn>;
    };
    complianceAuditLog: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
  };

  const mockStartDate = new Date('2026-01-01T00:00:00Z');
  const mockEndDate = new Date('2026-01-31T23:59:59Z');

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: vi.fn(),
      },
      complianceAuditLog: {
        count: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
    };
    service = new ComplianceReportService(mockPrisma as unknown as PrismaService);
  });

  describe('generateSummary', () => {
    it('should generate summary report with all counts', async () => {
      // Setup mocks
      mockPrisma.user.count.mockResolvedValue(150);

      // Mock audit log counts for different action types
      mockPrisma.complianceAuditLog.count
        .mockResolvedValueOnce(45) // AGE_VERIFIED
        .mockResolvedValueOnce(30) // CONSENT_REQUESTED
        .mockResolvedValueOnce(25) // CONSENT_VERIFIED
        .mockResolvedValueOnce(5) // CONSENT_WITHDRAWN
        .mockResolvedValueOnce(10) // DATA_DELETION_REQUESTED
        .mockResolvedValueOnce(8); // DATA_DELETION_COMPLETED

      // Mock region breakdown from audit logs
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([
        { metadata: { region: 'US' } },
        { metadata: { region: 'US' } },
        { metadata: { region: 'GB' } },
        { metadata: { region: 'DE' } },
        { metadata: { region: null } },
      ]);

      const result = await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result.reportPeriod.start).toEqual(mockStartDate);
      expect(result.reportPeriod.end).toEqual(mockEndDate);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.totalMinorUsers).toBe(150);
      expect(result.ageVerifications).toBe(45);
      expect(result.consentRequestsSent).toBe(30);
      expect(result.consentsVerified).toBe(25);
      expect(result.consentsWithdrawn).toBe(5);
      expect(result.dataDeletionRequests).toBe(10);
      expect(result.dataDeletionsCompleted).toBe(8);
      expect(result.regionBreakdown).toEqual({ US: 2, GB: 1, DE: 1, Unknown: 1 });
    });

    it('should filter by date range for audit log counts', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      // Verify date range filter was applied to audit log count queries
      expect(mockPrisma.complianceAuditLog.count).toHaveBeenCalledWith({
        where: {
          action: ComplianceAction.AGE_VERIFIED,
          timestamp: {
            gte: mockStartDate,
            lte: mockEndDate,
          },
        },
      });
    });

    it('should filter minors only when includeMinorsOnly is true', async () => {
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
        includeMinorsOnly: true,
      });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { isMinor: true },
      });
    });

    it('should handle empty period with zero counts', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      const result = await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result.totalMinorUsers).toBe(0);
      expect(result.ageVerifications).toBe(0);
      expect(result.consentRequestsSent).toBe(0);
      expect(result.consentsVerified).toBe(0);
      expect(result.consentsWithdrawn).toBe(0);
      expect(result.dataDeletionRequests).toBe(0);
      expect(result.dataDeletionsCompleted).toBe(0);
      expect(result.regionBreakdown).toEqual({});
    });

    it('should filter audit logs by action types when specified', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(5);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
        actionTypes: [ComplianceAction.AGE_VERIFIED, ComplianceAction.CONSENT_VERIFIED],
      });

      // Should still query all action types for counts in summary
      // actionTypes filter is mainly for detailed report
      expect(mockPrisma.complianceAuditLog.count).toHaveBeenCalled();
    });
  });

  describe('generateDetailReport', () => {
    it('should return summary with paginated audit logs', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.complianceAuditLog.count
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);

      // Mock region breakdown query
      mockPrisma.complianceAuditLog.findMany
        .mockResolvedValueOnce([{ metadata: { region: 'US' } }])
        // Mock paginated audit logs query
        .mockResolvedValueOnce([
          {
            id: 'log-1',
            userId: 'user-1',
            action: ComplianceAction.AGE_VERIFIED,
            metadata: { region: 'US' },
            timestamp: new Date('2026-01-15'),
          },
          {
            id: 'log-2',
            userId: 'user-2',
            action: ComplianceAction.CONSENT_VERIFIED,
            metadata: { region: 'GB' },
            timestamp: new Date('2026-01-16'),
          },
        ]);

      const result = await service.generateDetailReport(
        {
          startDate: mockStartDate,
          endDate: mockEndDate,
        },
        10,
        0,
      );

      expect(result.summary).toBeDefined();
      expect(result.summary.totalMinorUsers).toBe(100);
      expect(result.auditLogs).toHaveLength(2);
      expect(result.auditLogs[0]).toEqual({
        id: 'log-1',
        userId: 'user-1',
        action: ComplianceAction.AGE_VERIFIED,
        metadata: { region: 'US' },
        timestamp: expect.any(Date),
      });
    });

    it('should apply pagination with limit and offset', async () => {
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(10);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.generateDetailReport(
        {
          startDate: mockStartDate,
          endDate: mockEndDate,
        },
        25,
        50,
      );

      // Verify pagination was applied to audit logs query
      const findManyCalls = mockPrisma.complianceAuditLog.findMany.mock.calls;
      // Second call should be the paginated audit logs
      expect(findManyCalls[1][0]).toMatchObject({
        take: 25,
        skip: 50,
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should filter by specific action types', async () => {
      mockPrisma.user.count.mockResolvedValue(20);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(5);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.generateDetailReport(
        {
          startDate: mockStartDate,
          endDate: mockEndDate,
          actionTypes: [
            ComplianceAction.CONSENT_WITHDRAWN,
            ComplianceAction.DATA_DELETION_COMPLETED,
          ],
        },
        50,
        0,
      );

      // Verify action type filter was applied
      const findManyCalls = mockPrisma.complianceAuditLog.findMany.mock.calls;
      expect(findManyCalls[1][0].where.action).toEqual({
        in: [ComplianceAction.CONSENT_WITHDRAWN, ComplianceAction.DATA_DELETION_COMPLETED],
      });
    });

    it('should use default pagination when not specified', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(2);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.generateDetailReport({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      const findManyCalls = mockPrisma.complianceAuditLog.findMany.mock.calls;
      expect(findManyCalls[1][0]).toMatchObject({
        take: 100,
        skip: 0,
      });
    });

    it('should handle empty results gracefully', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.generateDetailReport({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result.summary.totalMinorUsers).toBe(0);
      expect(result.auditLogs).toEqual([]);
    });
  });

  describe('region breakdown parsing', () => {
    it('should count regions from metadata correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([
        { metadata: { region: 'US' } },
        { metadata: { region: 'US' } },
        { metadata: { region: 'US' } },
        { metadata: { region: 'GB' } },
        { metadata: { region: 'DE' } },
        { metadata: { region: 'FR' } },
        { metadata: { region: 'FR' } },
      ]);

      const result = await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result.regionBreakdown).toEqual({
        US: 3,
        GB: 1,
        DE: 1,
        FR: 2,
      });
    });

    it('should handle missing metadata gracefully', async () => {
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.complianceAuditLog.count.mockResolvedValue(0);
      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([
        { metadata: null },
        { metadata: {} },
        { metadata: { region: 'US' } },
        { metadata: { otherField: 'value' } },
      ]);

      const result = await service.generateSummary({
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result.regionBreakdown).toEqual({
        US: 1,
        Unknown: 3,
      });
    });
  });
});
