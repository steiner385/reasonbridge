/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FactCheckResultDto } from '../../dto/check-claims.dto.js';

// Create mock Logger class
class MockLogger {
  warn = vi.fn();
  debug = vi.fn();
  error = vi.fn();
  log = vi.fn();
}

// Mock @nestjs/common and @nestjs/cache-manager
vi.mock('@nestjs/common', async () => {
  const actual = await vi.importActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...actual,
    Logger: MockLogger,
    Injectable: () => (target: unknown) => target,
    Inject: () => () => undefined,
  };
});

// Import after mocks
const { FactCheckCacheService } = await import('../fact-check-cache.service.js');

/**
 * Create mock cache manager
 */
function createMockCacheManager() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };
}

/**
 * Create sample fact-check result for testing
 */
function createSampleResult(): FactCheckResultDto {
  return {
    id: 'test-id-123',
    claimText: 'Test claim text',
    claimStartOffset: 0,
    claimEndOffset: 15,
    displayedAs: 'Related Context',
    sources: [
      {
        provider: 'Snopes',
        url: 'https://snopes.com/fact-check/test',
        title: 'Test Fact Check',
        publishedAt: '2026-02-14T10:00:00Z',
        rating: 'False',
        credibilityScore: 0.95,
        retrievedAt: '2026-02-14T12:00:00Z',
      },
    ],
    hasConflictingSources: false,
    expiresAt: '2026-02-15T12:00:00Z',
  };
}

describe('FactCheckCacheService', () => {
  let service: InstanceType<typeof FactCheckCacheService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockCacheManager = createMockCacheManager();
    service = new FactCheckCacheService(mockCacheManager as never);
  });

  describe('get', () => {
    it('should return cached result on hit', async () => {
      const cachedResult = createSampleResult();
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.get('abc123');

      expect(mockCacheManager.get).toHaveBeenCalledWith('fact-check:result:abc123');
      expect(result).toEqual(cachedResult);
    });

    it('should return null on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get('abc123');

      expect(result).toBeNull();
    });

    it('should return null on cache error (graceful degradation)', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('abc123');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store result in cache', async () => {
      const result = createSampleResult();
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('abc123', result);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'fact-check:result:abc123',
        result,
        expect.any(Number), // TTL
      );
    });

    it('should not throw on cache error (graceful degradation)', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.set('abc123', createSampleResult())).resolves.toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('should delete cached result', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidate('abc123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('fact-check:result:abc123');
    });

    it('should not throw on cache error (graceful degradation)', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.invalidate('abc123')).resolves.toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should return cached result on hit', async () => {
      const cachedResult = createSampleResult();
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'fact-check:id:123e4567-e89b-12d3-a456-426614174000',
      );
      expect(result).toEqual(cachedResult);
    });

    it('should return null on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBeNull();
    });

    it('should return null on cache error (graceful degradation)', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBeNull();
    });
  });

  describe('setById', () => {
    it('should store result in cache by ID', async () => {
      const result = createSampleResult();
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.setById('123e4567-e89b-12d3-a456-426614174000', result);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'fact-check:id:123e4567-e89b-12d3-a456-426614174000',
        result,
        expect.any(Number), // TTL
      );
    });

    it('should not throw on cache error (graceful degradation)', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(
        service.setById('123e4567-e89b-12d3-a456-426614174000', createSampleResult()),
      ).resolves.toBeUndefined();
    });
  });
});
