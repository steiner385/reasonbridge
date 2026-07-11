/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataDeletionService } from '../data-deletion.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ComplianceAuditService } from '../compliance-audit.service.js';
import { DeletionStatus, ComplianceAction } from '@prisma/client';

describe('DataDeletionService', () => {
  let service: DataDeletionService;
  let mockPrisma: {
    dataDeletionRequest: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    response: {
      updateMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    parentalConsent: {
      delete: ReturnType<typeof vi.fn>;
    };
    discussionTopic: {
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    videoUpload: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    verificationRecord: {
      deleteMany: ReturnType<typeof vi.fn>;
    };
    verificationToken: {
      deleteMany: ReturnType<typeof vi.fn>;
    };
    activityEvent: {
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    logAction: ReturnType<typeof vi.fn>;
  };
  let mockS3Service: {
    deleteObject: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      dataDeletionRequest: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      response: {
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      parentalConsent: {
        delete: vi.fn(),
      },
      discussionTopic: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      videoUpload: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      verificationRecord: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      verificationToken: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      activityEvent: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    mockAuditService = {
      logAction: vi.fn().mockResolvedValue({}),
    };

    mockS3Service = {
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };

    service = new DataDeletionService(
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as ComplianceAuditService,
      mockS3Service as unknown as import('../../services/s3.service.js').S3Service,
    );
  });

  describe('createDeletionRequest', () => {
    it('should create a deletion request with 48-hour scheduled deletion', async () => {
      const userId = 'user-123';
      const requestedBy = 'PARENT';
      const now = new Date('2026-02-22T12:00:00Z');
      vi.setSystemTime(now);

      const expectedScheduledFor = new Date('2026-02-24T12:00:00Z'); // 48 hours later

      mockPrisma.dataDeletionRequest.create.mockResolvedValue({
        id: 'request-123',
        userId,
        requestedBy,
        requestedAt: now,
        scheduledFor: expectedScheduledFor,
        status: DeletionStatus.PENDING,
        completedAt: null,
        deletionLog: null,
      });

      const result = await service.createDeletionRequest(userId, requestedBy);

      expect(result.id).toBe('request-123');
      expect(result.status).toBe(DeletionStatus.PENDING);
      expect(mockPrisma.dataDeletionRequest.create).toHaveBeenCalledWith({
        data: {
          userId,
          requestedBy,
          scheduledFor: expectedScheduledFor,
          status: DeletionStatus.PENDING,
        },
      });

      vi.useRealTimers();
    });

    it('should log DATA_DELETION_REQUESTED audit action', async () => {
      const userId = 'user-123';
      const requestedBy = 'PARENT';

      mockPrisma.dataDeletionRequest.create.mockResolvedValue({
        id: 'request-123',
        userId,
        requestedBy,
        requestedAt: new Date(),
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
        completedAt: null,
        deletionLog: null,
      });

      await service.createDeletionRequest(userId, requestedBy);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        ComplianceAction.DATA_DELETION_REQUESTED,
        expect.objectContaining({
          requestedBy,
          scheduledFor: expect.any(String),
        }),
      );
    });

    it('should succeed even when audit logging fails', async () => {
      const userId = 'user-123';
      const requestedBy = 'PARENT';

      mockPrisma.dataDeletionRequest.create.mockResolvedValue({
        id: 'request-123',
        userId,
        requestedBy,
        requestedAt: new Date(),
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
        completedAt: null,
        deletionLog: null,
      });
      mockAuditService.logAction.mockRejectedValue(new Error('Audit service unavailable'));

      const result = await service.createDeletionRequest(userId, requestedBy);

      expect(result.id).toBe('request-123');
    });
  });

  describe('getPendingDeletionRequests', () => {
    it('should return pending requests scheduled before current time', async () => {
      const now = new Date('2026-02-22T12:00:00Z');
      vi.setSystemTime(now);

      const pendingRequests = [
        {
          id: 'request-1',
          userId: 'user-1',
          requestedBy: 'PARENT',
          scheduledFor: new Date('2026-02-20T12:00:00Z'),
          status: DeletionStatus.PENDING,
        },
        {
          id: 'request-2',
          userId: 'user-2',
          requestedBy: 'USER',
          scheduledFor: new Date('2026-02-21T12:00:00Z'),
          status: DeletionStatus.PENDING,
        },
      ];

      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue(pendingRequests);

      const result = await service.getPendingDeletionRequests();

      expect(result).toHaveLength(2);
      expect(mockPrisma.dataDeletionRequest.findMany).toHaveBeenCalledWith({
        where: {
          status: DeletionStatus.PENDING,
          scheduledFor: { lte: now },
        },
        orderBy: { scheduledFor: 'asc' },
        take: 100,
      });

      vi.useRealTimers();
    });
  });

  describe('executeDeletion', () => {
    it('should anonymize user data and delete related records', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        requestedBy: 'PARENT',
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'child@example.com',
        displayName: 'Test Child',
      });

      mockPrisma.response.count.mockResolvedValue(5);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([
        { id: 'topic-1', responseCount: 0 },
        { id: 'topic-2', responseCount: 3 },
      ]);

      // Mock the transaction to execute the callback
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({
        id: requestId,
        status: DeletionStatus.IN_PROGRESS,
      });

      mockPrisma.response.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.parentalConsent.delete.mockResolvedValue({});
      mockPrisma.discussionTopic.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.discussionTopic.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.executeDeletion(requestId);

      expect(result.success).toBe(true);
      expect(result.deletionLog).toBeDefined();
    });

    it('should null all PII columns and delete verification + activity data', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        requestedBy: 'PARENT',
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'child@example.com',
        displayName: 'Test Child',
      });
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        typeof callback === 'function' ? callback(mockPrisma) : Promise.all(callback),
      );
      mockPrisma.dataDeletionRequest.update.mockResolvedValue({});
      mockPrisma.parentalConsent.delete.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      // Verification videos exist in S3.
      mockPrisma.videoUpload.findMany.mockResolvedValue([
        { s3Key: 'videos/user-123/a.webm' },
        { s3Key: 'videos/user-123/b.webm' },
      ]);
      mockPrisma.videoUpload.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.verificationRecord.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.activityEvent.deleteMany.mockResolvedValue({ count: 7 });

      const result = await service.executeDeletion(requestId);

      // PII columns beyond the original set are now scrubbed.
      const userUpdateData = mockPrisma.user.update.mock.calls[0]![0].data;
      expect(userUpdateData).toMatchObject({
        emailHash: null,
        parentPhone: null,
        bio: null,
        avatarUrl: null,
        avatarS3Key: null,
        accountStatus: 'DELETED',
      });

      // Related records are deleted by userId.
      expect(mockPrisma.videoUpload.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrisma.verificationRecord.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrisma.activityEvent.deleteMany).toHaveBeenCalledWith({ where: { userId } });

      // S3 verification videos are deleted after the DB commit.
      expect(mockS3Service.deleteObject).toHaveBeenCalledTimes(2);
      expect(mockS3Service.deleteObject).toHaveBeenCalledWith('videos/user-123/a.webm');

      expect(result.deletionLog).toMatchObject({
        verificationRecordsDeleted: 3,
        videoUploadsDeleted: 2,
        videoObjectsDeleted: 2,
        verificationTokensDeleted: 1,
        activityEventsDeleted: 7,
      });
    });

    it('should mark request as FAILED if deletion fails', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        requestedBy: 'PARENT',
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'child@example.com',
        displayName: 'Test Child',
      });

      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));
      mockPrisma.dataDeletionRequest.update.mockResolvedValue({});

      const result = await service.executeDeletion(requestId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockPrisma.dataDeletionRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: DeletionStatus.FAILED,
          deletionLog: expect.objectContaining({ error: 'Database error' }),
        },
      });
    });

    it('should throw if deletion request not found', async () => {
      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue(null);

      await expect(service.executeDeletion('nonexistent')).rejects.toThrow(
        'Deletion request nonexistent not found',
      );
    });

    it('should log DATA_DELETION_COMPLETED audit action on success', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        requestedBy: 'PARENT',
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'child@example.com',
        displayName: 'Test Child',
      });

      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({
        id: requestId,
        status: DeletionStatus.COMPLETED,
      });

      mockPrisma.parentalConsent.delete.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      await service.executeDeletion(requestId);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        ComplianceAction.DATA_DELETION_COMPLETED,
        expect.objectContaining({
          requestId,
          completedAt: expect.any(String),
        }),
      );
    });

    it('should retain ComplianceAuditLog records (legal requirement)', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        requestedBy: 'PARENT',
        scheduledFor: new Date(),
        status: DeletionStatus.PENDING,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'child@example.com',
        displayName: 'Test Child',
      });

      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({});
      mockPrisma.parentalConsent.delete.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      await service.executeDeletion(requestId);

      // Verify that complianceAuditLog.delete was NOT called
      // The service should NOT have a complianceAuditLog.delete mock
      // This verifies by checking the deletion log includes note about retained records
      const updateCall = mockPrisma.dataDeletionRequest.update.mock.calls.find(
        (call) => call[0].data.deletionLog?.retainedRecords,
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('processDeletionRequests', () => {
    it('should process all pending requests that are due', async () => {
      const now = new Date('2026-02-22T12:00:00Z');
      vi.setSystemTime(now);

      const pendingRequests = [
        {
          id: 'request-1',
          userId: 'user-1',
          requestedBy: 'PARENT',
          scheduledFor: new Date('2026-02-20T12:00:00Z'),
          status: DeletionStatus.PENDING,
        },
      ];

      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue(pendingRequests);

      // Mock for executeDeletion
      mockPrisma.dataDeletionRequest.findUnique.mockResolvedValue(pendingRequests[0]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'child@example.com',
        displayName: 'Test Child',
      });

      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({});
      mockPrisma.parentalConsent.delete.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.processDeletionRequests();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);

      vi.useRealTimers();
    });

    it('should continue processing even if one request fails', async () => {
      const now = new Date('2026-02-22T12:00:00Z');
      vi.setSystemTime(now);

      const pendingRequests = [
        {
          id: 'request-1',
          userId: 'user-1',
          requestedBy: 'PARENT',
          scheduledFor: new Date('2026-02-20T12:00:00Z'),
          status: DeletionStatus.PENDING,
        },
        {
          id: 'request-2',
          userId: 'user-2',
          requestedBy: 'USER',
          scheduledFor: new Date('2026-02-21T12:00:00Z'),
          status: DeletionStatus.PENDING,
        },
      ];

      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue(pendingRequests);

      // First request fails, second succeeds
      mockPrisma.dataDeletionRequest.findUnique
        .mockResolvedValueOnce(pendingRequests[0])
        .mockResolvedValueOnce(pendingRequests[1]);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'child1@example.com',
          displayName: 'Test Child 1',
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          email: 'child2@example.com',
          displayName: 'Test Child 2',
        });

      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      // First transaction fails, second succeeds
      mockPrisma.$transaction
        .mockRejectedValueOnce(new Error('Database error'))
        .mockImplementationOnce(async (callback) => {
          if (typeof callback === 'function') {
            return callback(mockPrisma);
          }
          return Promise.all(callback);
        });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({});
      mockPrisma.parentalConsent.delete.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.processDeletionRequests();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);

      vi.useRealTimers();
    });
  });
});
