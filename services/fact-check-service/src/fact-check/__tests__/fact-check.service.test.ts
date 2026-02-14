/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for FactCheckService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  IFactCheckClient,
  FactCheckResult,
  FactCheckClientHealth,
} from '../../clients/index.js';

// Create mock Logger class
class MockLogger {
  warn = vi.fn();
  debug = vi.fn();
  error = vi.fn();
  log = vi.fn();
}

// Mock @nestjs/common before importing the service
vi.mock('@nestjs/common', async () => {
  const actual = await vi.importActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...actual,
    Logger: MockLogger,
    Injectable: () => (target: unknown) => target,
    Inject: () => () => undefined,
  };
});

// Import service after mock is set up
const { FactCheckService } = await import('../fact-check.service.js');

/**
 * Create a mock fact-check client
 */
function createMockClient(
  name: string,
  result: FactCheckResult | null = null,
  health: FactCheckClientHealth = { isHealthy: true, message: 'Operational', recentErrorCount: 0 },
): IFactCheckClient {
  return {
    name,
    checkClaim: vi.fn().mockResolvedValue(result),
    getHealth: vi.fn().mockResolvedValue(health),
    isConfigured: vi.fn().mockReturnValue(true),
  };
}

/**
 * Create a sample fact-check result
 */
function createFactCheckResult(overrides: Partial<FactCheckResult> = {}): FactCheckResult {
  return {
    claimText: 'Test claim',
    sources: [
      {
        source: 'Snopes',
        title: 'Fact Check: Test Claim',
        url: 'https://snopes.com/fact-check/test',
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        rating: 'False',
        excerpt: 'This claim is false',
        sourceCredibility: 95,
      },
    ],
    hasConflictingSources: false,
    checkedAt: new Date('2026-02-14T12:00:00Z'),
    expiresAt: new Date('2026-02-15T12:00:00Z'),
    ...overrides,
  };
}

describe('FactCheckService', () => {
  describe('checkClaim', () => {
    it('should return no-result response when no clients configured', async () => {
      const service = new FactCheckService([]);

      const result = await service.checkClaim({ claim: 'Test claim for verification' });

      expect(result).toHaveProperty('message');
      expect((result as { message: string }).message).toBe(
        'No fact-check services are currently configured',
      );
      expect(result.claimText).toBe('Test claim for verification');
    });

    it('should return fact-check results from a single client', async () => {
      const mockResult = createFactCheckResult();
      const mockClient = createMockClient('test-client', mockResult);
      const service = new FactCheckService([mockClient]);

      const result = await service.checkClaim({ claim: 'Test claim for verification' });

      expect(mockClient.checkClaim).toHaveBeenCalledWith({
        claim: 'Test claim for verification',
        languageCode: undefined,
        maxResults: undefined,
      });
      expect(result).toHaveProperty('sources');
      expect((result as { sources: unknown[] }).sources).toHaveLength(1);
      expect((result as { sourceCount: number }).sourceCount).toBe(1);
    });

    it('should pass language code and max results to client', async () => {
      const mockResult = createFactCheckResult();
      const mockClient = createMockClient('test-client', mockResult);
      const service = new FactCheckService([mockClient]);

      await service.checkClaim({
        claim: 'Test claim for verification',
        languageCode: 'de',
        maxResults: 5,
      });

      expect(mockClient.checkClaim).toHaveBeenCalledWith({
        claim: 'Test claim for verification',
        languageCode: 'de',
        maxResults: 5,
      });
    });

    it('should return no-result response when client returns null', async () => {
      const mockClient = createMockClient('test-client', null);
      const service = new FactCheckService([mockClient]);

      const result = await service.checkClaim({ claim: 'Unknown claim without results' });

      expect(result).toHaveProperty('message');
      expect((result as { message: string }).message).toBe('No fact-checks found for this claim');
      expect(result).toHaveProperty('suggestions');
    });

    it('should merge results from multiple clients', async () => {
      const result1 = createFactCheckResult({
        sources: [
          {
            source: 'Snopes',
            title: 'Snopes Check',
            url: 'https://snopes.com/check',
            publishedAt: new Date('2026-02-14T10:00:00Z'),
            rating: 'False',
            sourceCredibility: 95,
          },
        ],
      });
      const result2 = createFactCheckResult({
        sources: [
          {
            source: 'PolitiFact',
            title: 'PolitiFact Check',
            url: 'https://politifact.com/check',
            publishedAt: new Date('2026-02-14T11:00:00Z'),
            rating: 'Mostly False',
            sourceCredibility: 90,
          },
        ],
      });

      const client1 = createMockClient('snopes', result1);
      const client2 = createMockClient('politifact', result2);
      const service = new FactCheckService([client1, client2]);

      const result = await service.checkClaim({ claim: 'Multi-source claim test' });

      expect((result as { sources: unknown[] }).sources).toHaveLength(2);
      expect((result as { sourceCount: number }).sourceCount).toBe(2);
      // Should be sorted by credibility (Snopes 95 > PolitiFact 90)
      expect((result as { sources: { source: string }[] }).sources[0].source).toBe('Snopes');
    });

    it('should deduplicate sources by URL', async () => {
      const sharedUrl = 'https://snopes.com/same-check';
      const result1 = createFactCheckResult({
        sources: [
          {
            source: 'Snopes',
            title: 'Snopes Check',
            url: sharedUrl,
            publishedAt: new Date('2026-02-14T10:00:00Z'),
            rating: 'False',
            sourceCredibility: 95,
          },
        ],
      });
      const result2 = createFactCheckResult({
        sources: [
          {
            source: 'Snopes (via Google)',
            title: 'Snopes Check',
            url: sharedUrl, // Same URL
            publishedAt: new Date('2026-02-14T10:00:00Z'),
            rating: 'False',
            sourceCredibility: 95,
          },
        ],
      });

      const client1 = createMockClient('google', result1);
      const client2 = createMockClient('other', result2);
      const service = new FactCheckService([client1, client2]);

      const result = await service.checkClaim({ claim: 'Duplicate source claim' });

      expect((result as { sources: unknown[] }).sources).toHaveLength(1);
    });

    it('should handle client errors gracefully', async () => {
      const successResult = createFactCheckResult();
      const successClient = createMockClient('success-client', successResult);
      const failingClient: IFactCheckClient = {
        name: 'failing-client',
        checkClaim: vi.fn().mockRejectedValue(new Error('API Error')),
        getHealth: vi
          .fn()
          .mockResolvedValue({ isHealthy: false, message: 'Error', recentErrorCount: 1 }),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      const service = new FactCheckService([successClient, failingClient]);

      const result = await service.checkClaim({ claim: 'Partial failure test' });

      // Should still return results from successful client
      expect((result as { sources: unknown[] }).sources).toHaveLength(1);
    });

    it('should return no-result when all clients fail', async () => {
      const failingClient: IFactCheckClient = {
        name: 'failing-client',
        checkClaim: vi.fn().mockRejectedValue(new Error('API Error')),
        getHealth: vi
          .fn()
          .mockResolvedValue({ isHealthy: false, message: 'Error', recentErrorCount: 1 }),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      const service = new FactCheckService([failingClient]);

      const result = await service.checkClaim({ claim: 'All fail test claim' });

      expect(result).toHaveProperty('message');
      expect((result as { message: string }).message).toBe('No fact-checks found for this claim');
    });

    it('should set hasConflictingSources to true if any client reports conflicts', async () => {
      const result1 = createFactCheckResult({ hasConflictingSources: false });
      const result2 = createFactCheckResult({ hasConflictingSources: true });

      const client1 = createMockClient('client1', result1);
      const client2 = createMockClient('client2', result2);
      const service = new FactCheckService([client1, client2]);

      const result = await service.checkClaim({ claim: 'Conflict detection test' });

      expect((result as { hasConflictingSources: boolean }).hasConflictingSources).toBe(true);
    });

    it('should use earliest expiration time from all results', async () => {
      const earlyExpiry = new Date('2026-02-14T18:00:00Z');
      const lateExpiry = new Date('2026-02-15T12:00:00Z');

      const result1 = createFactCheckResult({ expiresAt: earlyExpiry });
      const result2 = createFactCheckResult({
        expiresAt: lateExpiry,
        sources: [
          {
            source: 'Other',
            title: 'Other Check',
            url: 'https://other.com/check',
            publishedAt: new Date(),
            sourceCredibility: 80,
          },
        ],
      });

      const client1 = createMockClient('client1', result1);
      const client2 = createMockClient('client2', result2);
      const service = new FactCheckService([client1, client2]);

      const result = await service.checkClaim({ claim: 'Expiry test claim' });

      expect((result as { expiresAt: string }).expiresAt).toBe(earlyExpiry.toISOString());
    });

    it('should set topVerdict from highest credibility source', async () => {
      const result = createFactCheckResult({
        sources: [
          {
            source: 'LowCred',
            title: 'Low Check',
            url: 'https://low.com/check',
            publishedAt: new Date(),
            rating: 'True',
            sourceCredibility: 60,
          },
          {
            source: 'HighCred',
            title: 'High Check',
            url: 'https://high.com/check',
            publishedAt: new Date(),
            rating: 'False',
            sourceCredibility: 95,
          },
        ],
      });

      const client = createMockClient('client', result);
      const service = new FactCheckService([client]);

      const checkResult = await service.checkClaim({ claim: 'Top verdict test' });

      expect((checkResult as { topVerdict: string }).topVerdict).toBe('False');
    });
  });

  describe('getClientsHealth', () => {
    it('should return empty array when no clients configured', async () => {
      const service = new FactCheckService([]);

      const health = await service.getClientsHealth();

      expect(health).toEqual([]);
    });

    it('should return health status for all clients', async () => {
      const healthyClient = createMockClient('healthy', null, {
        isHealthy: true,
        message: 'Operational',
        recentErrorCount: 0,
      });
      const unhealthyClient = createMockClient('unhealthy', null, {
        isHealthy: false,
        message: 'High error rate',
        recentErrorCount: 10,
      });

      const service = new FactCheckService([healthyClient, unhealthyClient]);

      const health = await service.getClientsHealth();

      expect(health).toHaveLength(2);
      expect(health[0]).toEqual({ name: 'healthy', isHealthy: true, message: 'Operational' });
      expect(health[1]).toEqual({
        name: 'unhealthy',
        isHealthy: false,
        message: 'High error rate',
      });
    });
  });
});
