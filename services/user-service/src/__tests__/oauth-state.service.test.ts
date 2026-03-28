/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuthStateService } from '../auth/oauth-state.service.js';

describe('OAuthStateService', () => {
  let service: OAuthStateService;
  let mockCacheManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheManager = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(undefined),
    };
    service = new OAuthStateService(mockCacheManager);
  });

  describe('generateState', () => {
    it('should generate a 64-character hex state token', async () => {
      const state = await service.generateState('GOOGLE');

      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should store state data in cache with 5 minute TTL', async () => {
      const state = await service.generateState('GOOGLE', 'visitor-123');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `oauth:state:${state}`,
        expect.stringContaining('"provider":"GOOGLE"'),
        300000, // 5 minutes in milliseconds
      );

      const storedData = JSON.parse(mockCacheManager.set.mock.calls[0][1]);
      expect(storedData.provider).toBe('GOOGLE');
      expect(storedData.visitorSessionId).toBe('visitor-123');
      expect(storedData.createdAt).toBeDefined();
    });

    it('should store state without visitor session ID', async () => {
      const state = await service.generateState('APPLE');

      const storedData = JSON.parse(mockCacheManager.set.mock.calls[0][1]);
      expect(storedData.provider).toBe('APPLE');
      expect(storedData.visitorSessionId).toBeUndefined();
    });

    it('should generate unique states for each call', async () => {
      const state1 = await service.generateState('GOOGLE');
      const state2 = await service.generateState('GOOGLE');

      expect(state1).not.toBe(state2);
    });

    it('should continue without throwing when cache set fails', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      const state = await service.generateState('GOOGLE');

      // Should still return a state even if caching fails
      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('validateState', () => {
    it('should return true for valid state with matching provider', async () => {
      const stateData = {
        provider: 'GOOGLE',
        visitorSessionId: 'visitor-123',
        createdAt: Date.now(),
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(stateData));

      const result = await service.validateState('valid-state', 'GOOGLE', 'visitor-123');

      expect(result).toBe(true);
      expect(mockCacheManager.del).toHaveBeenCalledWith('oauth:state:valid-state');
    });

    it('should return false for non-existent state', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.validateState('invalid-state', 'GOOGLE');

      expect(result).toBe(false);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should return false for provider mismatch', async () => {
      const stateData = {
        provider: 'GOOGLE',
        visitorSessionId: undefined,
        createdAt: Date.now(),
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(stateData));

      const result = await service.validateState('state-123', 'APPLE');

      expect(result).toBe(false);
    });

    it('should return false for visitor session mismatch', async () => {
      const stateData = {
        provider: 'GOOGLE',
        visitorSessionId: 'visitor-123',
        createdAt: Date.now(),
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(stateData));

      const result = await service.validateState('state-123', 'GOOGLE', 'different-visitor');

      expect(result).toBe(false);
    });

    it('should allow validation without visitor session when stored state has none', async () => {
      const stateData = {
        provider: 'GOOGLE',
        visitorSessionId: undefined,
        createdAt: Date.now(),
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(stateData));

      const result = await service.validateState('state-123', 'GOOGLE');

      expect(result).toBe(true);
    });

    it('should return false for expired state (beyond TTL)', async () => {
      const stateData = {
        provider: 'GOOGLE',
        visitorSessionId: undefined,
        createdAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(stateData));

      const result = await service.validateState('state-123', 'GOOGLE');

      expect(result).toBe(false);
    });

    it('should delete state after successful validation (one-time use)', async () => {
      const stateData = {
        provider: 'GOOGLE',
        visitorSessionId: undefined,
        createdAt: Date.now(),
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(stateData));

      await service.validateState('state-123', 'GOOGLE');

      expect(mockCacheManager.del).toHaveBeenCalledWith('oauth:state:state-123');
    });

    it('should return false when cache get fails', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.validateState('state-123', 'GOOGLE');

      expect(result).toBe(false);
    });
  });

  describe('without cache manager', () => {
    it('should return generated state without caching', async () => {
      const serviceWithoutCache = new OAuthStateService(null);

      const state = await serviceWithoutCache.generateState('GOOGLE');

      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return true for validation when cache unavailable', async () => {
      const serviceWithoutCache = new OAuthStateService(null);

      const result = await serviceWithoutCache.validateState('any-state', 'GOOGLE');

      // When cache is unavailable, allow OAuth to proceed
      expect(result).toBe(true);
    });
  });
});
