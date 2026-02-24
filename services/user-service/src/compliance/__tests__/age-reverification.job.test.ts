/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AgeReverificationJob } from '../age-reverification.job.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('AgeReverificationJob', () => {
  let job: AgeReverificationJob;
  let mockPrisma: {
    user: {
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    job = new AgeReverificationJob(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findUsersNeedingReverification', () => {
    it('should find users needing re-verification (lastAgeVerifiedAt > 365 days)', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const mockUsers = [
        { id: 'user-1', lastAgeVerifiedAt: twoYearsAgo },
        { id: 'user-2', lastAgeVerifiedAt: twoYearsAgo },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const users = await job.findUsersNeedingReverification();

      expect(users).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledOnce();

      // Verify the query includes lastAgeVerifiedAt filter with lt (less than) one year ago
      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.lastAgeVerifiedAt).toBeDefined();
      expect(callArgs.where.lastAgeVerifiedAt.lt).toBeInstanceOf(Date);

      // The date should be approximately 1 year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const queryDate = callArgs.where.lastAgeVerifiedAt.lt;
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(queryDate.getTime() - oneYearAgo.getTime())).toBeLessThan(1000);
    });

    it('should only find ACTIVE users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await job.findUsersNeedingReverification();

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe('ACTIVE');
    });

    it('should only find minor users (isMinor: true)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await job.findUsersNeedingReverification();

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.isMinor).toBe(true);
    });

    it('should not include users already flagged for re-verification', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await job.findUsersNeedingReverification();

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.requiresAgeReverification).toBe(false);
    });

    it('should select only id and lastAgeVerifiedAt fields', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await job.findUsersNeedingReverification();

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.select).toEqual({ id: true, lastAgeVerifiedAt: true });
    });
  });

  describe('flagForReverification', () => {
    it('should flag users for re-verification on next login', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      mockPrisma.user.updateMany.mockResolvedValue({ count: 3 });

      const result = await job.flagForReverification(userIds);

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: userIds } },
        data: { requiresAgeReverification: true },
      });
      expect(result.count).toBe(3);
    });

    it('should handle empty user list', async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });

      const result = await job.flagForReverification([]);

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
        data: { requiresAgeReverification: true },
      });
      expect(result.count).toBe(0);
    });
  });

  describe('handleCron', () => {
    it('should find and flag users needing re-verification', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const mockUsers = [
        { id: 'user-1', lastAgeVerifiedAt: twoYearsAgo },
        { id: 'user-2', lastAgeVerifiedAt: twoYearsAgo },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      await job.handleCron();

      expect(mockPrisma.user.findMany).toHaveBeenCalledOnce();
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        data: { requiresAgeReverification: true },
      });
    });

    it('should not call updateMany when no users need re-verification', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await job.handleCron();

      expect(mockPrisma.user.findMany).toHaveBeenCalledOnce();
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should log error and re-throw when findMany fails', async () => {
      const dbError = new Error('Database connection lost');
      mockPrisma.user.findMany.mockRejectedValue(dbError);

      await expect(job.handleCron()).rejects.toThrow('Database connection lost');

      // updateMany should not have been called
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should log error and re-throw when updateMany fails', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', lastAgeVerifiedAt: new Date('2024-01-01') },
      ]);
      mockPrisma.user.updateMany.mockRejectedValue(new Error('Update failed'));

      await expect(job.handleCron()).rejects.toThrow('Update failed');
    });
  });
});
