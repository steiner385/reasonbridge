/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for RankingCronService
 *
 * Tests the cron-based daily recalculation of user rankings,
 * including batch processing, error handling, and manual trigger functionality.
 *
 * @see services/user-service/src/ranking/ranking-cron.service.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';

// Mock Prisma before importing services
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    Prisma: { Decimal: MockDecimal },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
  };
});

// Import after mocking
import { RankingCronService } from '../ranking-cron.service.js';
import { RankingService } from '../ranking.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Mock User for testing
 */
interface MockUser {
  id: string;
  email: string;
}

/**
 * Helper to create mock users
 */
const createMockUsers = (count: number): MockUser[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${String(i + 1).padStart(3, '0')}`,
    email: `user${i + 1}@example.com`,
  }));
};

describe('RankingCronService', () => {
  let service: RankingCronService;
  let mockPrisma: {
    user: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let mockRankingService: {
    recalculateUserRank: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Silence logger during tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    // Create mock services
    mockPrisma = {
      user: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      $executeRaw: vi.fn(),
    };

    mockRankingService = {
      recalculateUserRank: vi.fn(),
    };

    // Directly instantiate service with mocks
    service = new RankingCronService(
      mockPrisma as unknown as PrismaService,
      mockRankingService as unknown as RankingService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recalculateAllRankings', () => {
    it('should process all users in batches', async () => {
      // Setup: 250 users (should process in 3 batches of 100, 100, 50)
      const allUsers = createMockUsers(250);
      mockPrisma.user.count.mockResolvedValue(250);

      // Return batches of users
      mockPrisma.user.findMany
        .mockResolvedValueOnce(allUsers.slice(0, 100)) // First batch
        .mockResolvedValueOnce(allUsers.slice(100, 200)) // Second batch
        .mockResolvedValueOnce(allUsers.slice(200, 250)) // Third batch
        .mockResolvedValueOnce([]); // End of pagination

      mockRankingService.recalculateUserRank.mockResolvedValue({});

      const result = await service.recalculateAllRankings();

      // Should have processed all users
      expect(result.usersProcessed).toBe(250);
      expect(result.errors).toBe(0);
      expect(result.success).toBe(true);
      expect(mockRankingService.recalculateUserRank).toHaveBeenCalledTimes(250);
    });

    it('should continue processing when individual user recalculation fails', async () => {
      // Setup: 5 users, user-002 and user-004 fail
      const users = createMockUsers(5);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]); // End of pagination

      mockRankingService.recalculateUserRank
        .mockResolvedValueOnce({}) // user-001 succeeds
        .mockRejectedValueOnce(new Error('Database error')) // user-002 fails
        .mockResolvedValueOnce({}) // user-003 succeeds
        .mockRejectedValueOnce(new Error('Network error')) // user-004 fails
        .mockResolvedValueOnce({}); // user-005 succeeds

      const result = await service.recalculateAllRankings();

      // Should have attempted all users
      expect(mockRankingService.recalculateUserRank).toHaveBeenCalledTimes(5);
      // Should report both successes and failures
      expect(result.usersProcessed).toBe(3);
      expect(result.errors).toBe(2);
      expect(result.success).toBe(true); // Overall still successful despite some errors
    });

    it('should use cursor-based pagination for efficiency', async () => {
      const batch1 = createMockUsers(100);
      const batch2 = createMockUsers(50).map((u) => ({
        ...u,
        id: `user-${100 + parseInt(u.id.split('-')[1], 10)}`,
      }));

      mockPrisma.user.count.mockResolvedValue(150);
      mockPrisma.user.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce([]);

      mockRankingService.recalculateUserRank.mockResolvedValue({});

      await service.recalculateAllRankings();

      // First call should have no cursor
      expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
          select: { id: true },
        }),
      );

      // Second call should use cursor from last user of first batch
      expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1, // Skip the cursor item itself
          cursor: { id: 'user-100' },
          orderBy: { id: 'asc' },
          select: { id: true },
        }),
      );
    });

    it('should return timing information in the result', async () => {
      const users = createMockUsers(10);
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]);
      mockRankingService.recalculateUserRank.mockResolvedValue({});

      const result = await service.recalculateAllRankings();

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty user database gracefully', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.recalculateAllRankings();

      expect(result.usersProcessed).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.success).toBe(true);
      expect(mockRankingService.recalculateUserRank).not.toHaveBeenCalled();
    });

    it('should log progress during batch processing', async () => {
      const logSpy = vi.spyOn(Logger.prototype, 'log');
      const users = createMockUsers(150);
      mockPrisma.user.count.mockResolvedValue(150);
      mockPrisma.user.findMany
        .mockResolvedValueOnce(users.slice(0, 100))
        .mockResolvedValueOnce(users.slice(100, 150))
        .mockResolvedValueOnce([]);
      mockRankingService.recalculateUserRank.mockResolvedValue({});

      await service.recalculateAllRankings();

      // Should log start, progress updates, and completion
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting daily ranking recalculation'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Processed 100/150'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('complete'));
    });
  });

  describe('triggerRecalculation', () => {
    it('should call recalculateAllRankings and return the result', async () => {
      const users = createMockUsers(5);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]);
      mockRankingService.recalculateUserRank.mockResolvedValue({});

      const result = await service.triggerRecalculation();

      expect(result.usersProcessed).toBe(5);
      expect(result.success).toBe(true);
    });

    it('should be idempotent - multiple calls should produce consistent results', async () => {
      const users = createMockUsers(3);
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.user.findMany
        .mockResolvedValueOnce(users)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(users)
        .mockResolvedValueOnce([]);
      mockRankingService.recalculateUserRank.mockResolvedValue({});

      const result1 = await service.triggerRecalculation();
      const result2 = await service.triggerRecalculation();

      expect(result1.usersProcessed).toBe(3);
      expect(result2.usersProcessed).toBe(3);
    });
  });

  describe('getLastRecalculation', () => {
    it('should return the most recent recalculation metadata', async () => {
      // First, run a recalculation
      const users = createMockUsers(5);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]);
      mockRankingService.recalculateUserRank.mockResolvedValue({});

      await service.recalculateAllRankings();

      const lastRecalc = service.getLastRecalculation();

      expect(lastRecalc).not.toBeNull();
      expect(lastRecalc?.usersProcessed).toBe(5);
      expect(lastRecalc?.startedAt).toBeInstanceOf(Date);
      expect(lastRecalc?.completedAt).toBeInstanceOf(Date);
    });

    it('should return null if no recalculation has been performed', () => {
      const result = service.getLastRecalculation();
      expect(result).toBeNull();
    });
  });

  describe('isRecalculationInProgress', () => {
    it('should return false when no recalculation is running', () => {
      expect(service.isRecalculationInProgress()).toBe(false);
    });

    it('should return true during active recalculation', async () => {
      const users = createMockUsers(5);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]);

      // Create a delayed mock to simulate long-running recalculation
      let resolveRecalculation: () => void;
      const recalculationPromise = new Promise<void>((resolve) => {
        resolveRecalculation = resolve;
      });

      let callCount = 0;
      mockRankingService.recalculateUserRank.mockImplementation(async () => {
        callCount++;
        // Only wait for first user
        if (callCount === 1) {
          await recalculationPromise;
        }
        return {};
      });

      // Start recalculation
      const recalcPromise = service.recalculateAllRankings();

      // Brief delay to allow recalculation to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(service.isRecalculationInProgress()).toBe(true);

      // Complete the recalculation
      resolveRecalculation!();
      await recalcPromise;

      expect(service.isRecalculationInProgress()).toBe(false);
    });
  });

  describe('concurrent execution prevention', () => {
    it('should prevent concurrent recalculations', async () => {
      const users = createMockUsers(10);
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]);

      // Create a delayed mock
      let resolveFirst: () => void;
      const firstRecalcPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      let callCount = 0;
      mockRankingService.recalculateUserRank.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          await firstRecalcPromise;
        }
        return {};
      });

      // Start first recalculation
      const first = service.recalculateAllRankings();

      // Brief delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Try to start second recalculation while first is in progress
      const second = service.recalculateAllRankings();

      // Second should return immediately with skipped status
      const secondResult = await second;
      expect(secondResult.skipped).toBe(true);
      expect(secondResult.reason).toContain('already in progress');

      // Complete the first
      resolveFirst!();
      const firstResult = await first;
      expect(firstResult.skipped).toBeUndefined();
    });
  });

  describe('batch size configuration', () => {
    it('should respect the configured batch size', async () => {
      const users = createMockUsers(50);
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.user.findMany.mockResolvedValueOnce(users).mockResolvedValueOnce([]);
      mockRankingService.recalculateUserRank.mockResolvedValue({});

      await service.recalculateAllRankings();

      // Default batch size is 100, so all 50 users should be in one batch
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });
});
