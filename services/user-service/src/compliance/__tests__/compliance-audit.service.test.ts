/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceAuditService } from '../compliance-audit.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { ComplianceAction } from '@prisma/client';

describe('ComplianceAuditService', () => {
  let service: ComplianceAuditService;
  let mockPrisma: {
    complianceAuditLog: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      complianceAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new ComplianceAuditService(mockPrisma as unknown as PrismaService);
  });

  describe('logAction', () => {
    it('should create audit log entry with correct data', async () => {
      const userId = 'user-123';
      const action = ComplianceAction.AGE_VERIFIED;
      const metadata = { region: 'US', consentAge: 13 };

      mockPrisma.complianceAuditLog.create.mockResolvedValue({
        id: 'log-1',
        userId,
        action,
        metadata,
        timestamp: new Date(),
      });

      const result = await service.logAction(userId, action, metadata);

      expect(mockPrisma.complianceAuditLog.create).toHaveBeenCalledWith({
        data: { userId, action, metadata },
      });
      expect(result.action).toBe(action);
    });

    it('should create audit log entry with empty metadata when not provided', async () => {
      const userId = 'user-456';
      const action = ComplianceAction.CONSENT_REQUESTED;

      mockPrisma.complianceAuditLog.create.mockResolvedValue({
        id: 'log-2',
        userId,
        action,
        metadata: {},
        timestamp: new Date(),
      });

      const result = await service.logAction(userId, action);

      expect(mockPrisma.complianceAuditLog.create).toHaveBeenCalledWith({
        data: { userId, action, metadata: {} },
      });
      expect(result.id).toBe('log-2');
    });

    it('should handle all compliance action types', async () => {
      const userId = 'user-789';
      const actions = [
        ComplianceAction.AGE_VERIFIED,
        ComplianceAction.CONSENT_REQUESTED,
        ComplianceAction.CONSENT_VERIFIED,
        ComplianceAction.CONSENT_WITHDRAWN,
        ComplianceAction.DATA_DELETION_REQUESTED,
        ComplianceAction.DATA_DELETION_COMPLETED,
        ComplianceAction.ANNUAL_REVERIFICATION,
      ];

      for (const action of actions) {
        mockPrisma.complianceAuditLog.create.mockResolvedValue({
          id: `log-${action}`,
          userId,
          action,
          metadata: {},
          timestamp: new Date(),
        });

        const result = await service.logAction(userId, action);
        expect(result.action).toBe(action);
      }
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit logs for user ordered by timestamp desc', async () => {
      const userId = 'user-123';
      const logs = [
        {
          id: 'log-1',
          userId,
          action: ComplianceAction.AGE_VERIFIED,
          metadata: {},
          timestamp: new Date(),
        },
      ];

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue(logs);

      const result = await service.getAuditHistory(userId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should use custom limit when provided', async () => {
      const userId = 'user-123';

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.getAuditHistory(userId, 50);

      expect(mockPrisma.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });

    it('should return empty array when no logs exist', async () => {
      const userId = 'user-no-logs';

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      const result = await service.getAuditHistory(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getLogsByAction', () => {
    it('should return logs filtered by action type', async () => {
      const action = ComplianceAction.CONSENT_VERIFIED;
      const logs = [
        { id: 'log-1', userId: 'user-1', action, metadata: {}, timestamp: new Date() },
        { id: 'log-2', userId: 'user-2', action, metadata: {}, timestamp: new Date() },
      ];

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue(logs);

      const result = await service.getLogsByAction(action);

      expect(result).toHaveLength(2);
      expect(mockPrisma.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: { action },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });
    });

    it('should filter by start date when provided', async () => {
      const action = ComplianceAction.AGE_VERIFIED;
      const startDate = new Date('2026-01-01');

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.getLogsByAction(action, startDate);

      expect(mockPrisma.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          action,
          timestamp: { gte: startDate },
        },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });
    });

    it('should filter by end date when provided', async () => {
      const action = ComplianceAction.CONSENT_WITHDRAWN;
      const endDate = new Date('2026-12-31');

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.getLogsByAction(action, undefined, endDate);

      expect(mockPrisma.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          action,
          timestamp: { lte: endDate },
        },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });
    });

    it('should filter by date range when both dates provided', async () => {
      const action = ComplianceAction.DATA_DELETION_COMPLETED;
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue([]);

      await service.getLogsByAction(action, startDate, endDate);

      expect(mockPrisma.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          action,
          timestamp: { gte: startDate, lte: endDate },
        },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });
    });
  });
});
