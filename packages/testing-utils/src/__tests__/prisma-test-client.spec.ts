/**
 * Tests for Prisma test client factory.
 *
 * Note: These tests verify the module structure and exports.
 * Integration tests that require a running database should be in
 * a separate integration test suite with docker-compose.test.yml.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  TEST_DATABASE_URL,
  createTestPrismaClient,
  cleanupTestPrismaClient,
  createTestContext,
  withTestTransaction,
} from '../prisma/index.js';

describe('Prisma Test Client Factory', () => {
  describe('TEST_DATABASE_URL', () => {
    it('should have default test database URL', () => {
      expect(TEST_DATABASE_URL).toContain('5433');
      expect(TEST_DATABASE_URL).toContain('unite_test');
    });

    it('should use port 5433 for test database isolation', () => {
      expect(TEST_DATABASE_URL).toMatch(/localhost:5433/);
    });
  });

  describe('createTestPrismaClient', () => {
    it('should be a function', () => {
      expect(typeof createTestPrismaClient).toBe('function');
    });

    it('should accept options parameter', () => {
      // Verify the function signature accepts options
      expect(createTestPrismaClient.length).toBeLessThanOrEqual(1);
    });
  });

  describe('cleanupTestPrismaClient', () => {
    it('should be a function', () => {
      expect(typeof cleanupTestPrismaClient).toBe('function');
    });

    it('should accept a prisma client parameter', () => {
      expect(cleanupTestPrismaClient.length).toBe(1);
    });
  });

  describe('createTestContext', () => {
    it('should be a function', () => {
      expect(typeof createTestContext).toBe('function');
    });

    it('should return an object with setup, teardown, and truncate functions', () => {
      const context = createTestContext();

      expect(typeof context.setup).toBe('function');
      expect(typeof context.teardown).toBe('function');
      expect(typeof context.truncate).toBe('function');
    });

    it('should have a prisma getter property', () => {
      const context = createTestContext();
      // Check that prisma is a defined property (getter)
      const descriptor = Object.getOwnPropertyDescriptor(context, 'prisma');
      expect(descriptor).toBeDefined();
      expect(descriptor?.get).toBeDefined();
    });

    it('should throw when accessing prisma before setup', () => {
      const context = createTestContext();

      expect(() => context.prisma).toThrow('Test context not initialized');
    });
  });

  describe('withTestTransaction', () => {
    it('should be a function', () => {
      expect(typeof withTestTransaction).toBe('function');
    });

    it('should accept prisma client and callback parameters', () => {
      expect(withTestTransaction.length).toBe(2);
    });
  });

  describe('Module exports', () => {
    it('should export all required functions', async () => {
      const module = await import('../prisma/index.js');

      expect(module.TEST_DATABASE_URL).toBeDefined();
      expect(module.createTestPrismaClient).toBeDefined();
      expect(module.cleanupTestPrismaClient).toBeDefined();
      expect(module.truncateAllTables).toBeDefined();
      expect(module.withTestTransaction).toBeDefined();
      expect(module.createTestContext).toBeDefined();
    });
  });
});
