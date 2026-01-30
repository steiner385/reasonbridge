/**
 * Tests for database cleanup utility.
 *
 * Note: These tests verify the module structure, exports, and logic.
 * Integration tests that require a running database should be in
 * a separate integration test suite with docker-compose.test.yml.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanDatabase,
  getTableDeletionOrder,
  cleanModels,
  type CleanDatabaseOptions,
} from '../db-cleanup.js';

// Mock PrismaClient for unit testing
const createMockPrismaClient = () => ({
  $executeRawUnsafe: vi.fn().mockResolvedValue(0),
});

describe('Database Cleanup Utility', () => {
  describe('getTableDeletionOrder', () => {
    it('should return an array of table names', () => {
      const order = getTableDeletionOrder();
      expect(Array.isArray(order)).toBe(true);
      expect(order.length).toBeGreaterThan(0);
    });

    it('should return tables in FK-safe order (leaf tables first)', () => {
      const order = getTableDeletionOrder();

      // Leaf tables should come before their parent tables
      const citationIndex = order.indexOf('citation');
      const responsesIndex = order.indexOf('responses');
      const usersIndex = order.indexOf('users');

      // citation references responses, so it should come first
      expect(citationIndex).toBeLessThan(responsesIndex);

      // responses references users, so it should come before users
      expect(responsesIndex).toBeLessThan(usersIndex);
    });

    it('should include all major tables', () => {
      const order = getTableDeletionOrder();

      const expectedTables = [
        'users',
        'responses',
        'discussions',
        'propositions',
        'votes',
        'alignments',
        'discussion_topics',
        'tags',
      ];

      for (const table of expectedTables) {
        expect(order).toContain(table);
      }
    });

    it('should have users as one of the last tables', () => {
      const order = getTableDeletionOrder();
      const usersIndex = order.indexOf('users');

      // users should be near the end (within last 5 tables)
      expect(usersIndex).toBeGreaterThan(order.length - 6);
    });

    it('should not include _prisma_migrations', () => {
      const order = getTableDeletionOrder();
      expect(order).not.toContain('_prisma_migrations');
    });
  });

  describe('cleanDatabase', () => {
    let mockPrisma: ReturnType<typeof createMockPrismaClient>;

    beforeEach(() => {
      mockPrisma = createMockPrismaClient();
      vi.clearAllMocks();
    });

    it('should be a function', () => {
      expect(typeof cleanDatabase).toBe('function');
    });

    it('should accept prisma client and optional options', () => {
      // Function should accept 1-2 parameters
      expect(cleanDatabase.length).toBeLessThanOrEqual(2);
    });

    it('should call $executeRawUnsafe for each table', async () => {
      await cleanDatabase(mockPrisma as any);

      const order = getTableDeletionOrder();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(order.length);
    });

    it('should delete tables in the correct order', async () => {
      const callOrder: string[] = [];
      mockPrisma.$executeRawUnsafe.mockImplementation(async (query: string) => {
        const match = query.match(/DELETE FROM "(\w+)"/);
        if (match && match[1]) {
          callOrder.push(match[1]);
        }
        return 0;
      });

      await cleanDatabase(mockPrisma as any);

      expect(callOrder).toEqual([...getTableDeletionOrder()]);
    });

    it('should exclude specified tables', async () => {
      const options: CleanDatabaseOptions = {
        excludeTables: ['users', 'responses'],
      };

      await cleanDatabase(mockPrisma as any, options);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).not.toContainEqual(expect.stringContaining('"users"'));
      expect(calls).not.toContainEqual(expect.stringContaining('"responses"'));
    });

    it('should exclude _prisma_migrations by default', async () => {
      await cleanDatabase(mockPrisma as any);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).not.toContainEqual(expect.stringContaining('"_prisma_migrations"'));
    });

    it('should only clean specified tables when onlyTables is provided', async () => {
      const options: CleanDatabaseOptions = {
        onlyTables: ['users', 'responses'],
      };

      await cleanDatabase(mockPrisma as any, options);

      // Should only call for 2 tables
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual(expect.stringContaining('"users"'));
      expect(calls).toContainEqual(expect.stringContaining('"responses"'));
    });

    it('should maintain FK-safe order even with onlyTables', async () => {
      const callOrder: string[] = [];
      mockPrisma.$executeRawUnsafe.mockImplementation(async (query: string) => {
        const match = query.match(/DELETE FROM "(\w+)"/);
        if (match && match[1]) {
          callOrder.push(match[1]);
        }
        return 0;
      });

      // Request in wrong order - should still be corrected
      const options: CleanDatabaseOptions = {
        onlyTables: ['users', 'responses', 'citation'],
      };

      await cleanDatabase(mockPrisma as any, options);

      // Should be in FK-safe order: citation, responses, users
      expect(callOrder.indexOf('citation')).toBeLessThan(callOrder.indexOf('responses'));
      expect(callOrder.indexOf('responses')).toBeLessThan(callOrder.indexOf('users'));
    });

    it('should handle errors gracefully and continue', async () => {
      let callCount = 0;
      mockPrisma.$executeRawUnsafe.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Table not found');
        }
        return 0;
      });

      // Should not throw
      await expect(cleanDatabase(mockPrisma as any)).resolves.not.toThrow();

      // Should continue to call remaining tables
      const order = getTableDeletionOrder();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(order.length);
    });

    it('should be case-insensitive for excludeTables', async () => {
      const options: CleanDatabaseOptions = {
        excludeTables: ['USERS', 'Responses'],
      };

      await cleanDatabase(mockPrisma as any, options);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).not.toContainEqual(expect.stringContaining('"users"'));
      expect(calls).not.toContainEqual(expect.stringContaining('"responses"'));
    });
  });

  describe('cleanModels', () => {
    let mockPrisma: ReturnType<typeof createMockPrismaClient>;

    beforeEach(() => {
      mockPrisma = createMockPrismaClient();
      vi.clearAllMocks();
    });

    it('should be a function', () => {
      expect(typeof cleanModels).toBe('function');
    });

    it('should accept prisma client and models array', () => {
      expect(cleanModels.length).toBe(2);
    });

    it('should map model names to table names', async () => {
      await cleanModels(mockPrisma as any, ['user', 'response']);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual(expect.stringContaining('"users"'));
      expect(calls).toContainEqual(expect.stringContaining('"responses"'));
    });

    it('should handle camelCase model names', async () => {
      await cleanModels(mockPrisma as any, ['discussionTopic', 'userFollow']);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual(expect.stringContaining('"discussion_topics"'));
      expect(calls).toContainEqual(expect.stringContaining('"user_follows"'));
    });

    it('should be case-insensitive for model names', async () => {
      await cleanModels(mockPrisma as any, ['USER', 'Response']);

      const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual(expect.stringContaining('"users"'));
      expect(calls).toContainEqual(expect.stringContaining('"responses"'));
    });

    it('should ignore unknown model names', async () => {
      await cleanModels(mockPrisma as any, ['user', 'unknownModel', 'response']);

      // Should only clean 2 known models
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    });
  });

  describe('Module exports from main index', () => {
    it('should export cleanDatabase from main index', async () => {
      const module = await import('../index.js');

      expect(module.cleanDatabase).toBeDefined();
      expect(typeof module.cleanDatabase).toBe('function');
    });

    it('should export getTableDeletionOrder from main index', async () => {
      const module = await import('../index.js');

      expect(module.getTableDeletionOrder).toBeDefined();
      expect(typeof module.getTableDeletionOrder).toBe('function');
    });

    it('should export cleanModels from main index', async () => {
      const module = await import('../index.js');

      expect(module.cleanModels).toBeDefined();
      expect(typeof module.cleanModels).toBe('function');
    });

    it('should export CleanDatabaseOptions type', async () => {
      // Type exports are verified at compile time
      // This test ensures the module loads without errors
      const module = await import('../index.js');
      expect(module).toBeDefined();
    });
  });
});
