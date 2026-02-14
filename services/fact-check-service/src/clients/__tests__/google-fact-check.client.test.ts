/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for GoogleFactCheckClient
 *
 * Tests cover:
 * - Configuration detection
 * - Health monitoring
 * - API request/response handling
 * - Error handling and timeouts
 * - Publisher credibility scoring
 * - Conflict detection
 * - TTL calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GoogleFactCheckApiResponse } from '../types.js';

// Create mock Logger class
class MockLogger {
  warn = vi.fn();
  debug = vi.fn();
  error = vi.fn();
  log = vi.fn();
}

// Mock @nestjs/common before importing the client
vi.mock('@nestjs/common', async () => {
  const actual = await vi.importActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...actual,
    Logger: MockLogger,
  };
});

// Import client after mock is set up
const { GoogleFactCheckClient } = await import('../google-fact-check.client.js');

describe('GoogleFactCheckClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('should return false when API key is not set', () => {
      delete process.env['GOOGLE_FACT_CHECK_API_KEY'];
      const client = new GoogleFactCheckClient();

      expect(client.isConfigured()).toBe(false);
    });

    it('should return true when API key is set', () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      expect(client.isConfigured()).toBe(true);
    });

    it('should return false for empty API key', () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = '';
      const client = new GoogleFactCheckClient();

      expect(client.isConfigured()).toBe(false);
    });
  });

  describe('getHealth', () => {
    it('should return unhealthy when not configured', async () => {
      delete process.env['GOOGLE_FACT_CHECK_API_KEY'];
      const client = new GoogleFactCheckClient();

      const health = await client.getHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.message).toBe('API key not configured');
    });

    it('should return healthy when configured and no recent errors', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const health = await client.getHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.message).toBe('Operational');
      expect(health.recentErrorCount).toBe(0);
    });

    it('should return unhealthy when more than 5 errors in last hour', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      // Simulate multiple failed requests
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      // Make 6 failed requests
      for (let i = 0; i < 6; i++) {
        await client.checkClaim({ claim: 'test claim' });
      }

      const health = await client.getHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.message).toBe('High error rate detected');
      expect(health.recentErrorCount).toBe(6);
    });

    it('should clean up errors older than 1 hour', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      // Simulate failed requests
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      // Make 3 failed requests
      for (let i = 0; i < 3; i++) {
        await client.checkClaim({ claim: 'test claim' });
      }

      // Advance time by 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      const health = await client.getHealth();

      expect(health.recentErrorCount).toBe(0); // Errors should be cleaned up
      expect(health.isHealthy).toBe(true);
    });
  });

  describe('checkClaim', () => {
    it('should return null when not configured', async () => {
      delete process.env['GOOGLE_FACT_CHECK_API_KEY'];
      const client = new GoogleFactCheckClient();

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).toBeNull();
    });

    it('should make API request with correct parameters', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      process.env['GOOGLE_FACT_CHECK_API_URL'] = 'https://api.example.com';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = { claims: [] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      await client.checkClaim({
        claim: 'test claim',
        languageCode: 'en',
        maxResults: 5,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(callUrl.origin).toBe('https://api.example.com');
      expect(callUrl.pathname).toBe('/claims:search');
      expect(callUrl.searchParams.get('query')).toBe('test claim');
      expect(callUrl.searchParams.get('languageCode')).toBe('en');
      expect(callUrl.searchParams.get('pageSize')).toBe('5');
      expect(callUrl.searchParams.get('key')).toBe('test-api-key');
    });

    it('should return null when no claims found', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = { claims: [] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).toBeNull();
    });

    it('should transform Google API response correctly', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'The earth is flat',
            claimant: 'Test Claimant',
            claimReview: [
              {
                publisher: {
                  name: 'Snopes',
                  site: 'snopes.com',
                },
                url: 'https://snopes.com/fact-check/earth-flat',
                title: 'Is the Earth Flat?',
                textualRating: 'False',
                reviewDate: '2026-01-15T00:00:00Z',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'earth is flat' });

      expect(result).not.toBeNull();
      expect(result!.claimText).toBe('earth is flat');
      expect(result!.sources).toHaveLength(1);
      expect(result!.sources[0].source).toBe('Snopes');
      expect(result!.sources[0].url).toBe('https://snopes.com/fact-check/earth-flat');
      expect(result!.sources[0].rating).toBe('False');
      expect(result!.sources[0].sourceCredibility).toBe(95); // Snopes credibility
      expect(result!.hasConflictingSources).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).toBeNull();
    });

    it('should handle timeout', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      process.env['FACT_CHECK_API_TIMEOUT_MS'] = '100';
      const client = new GoogleFactCheckClient();

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const mockFetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 200);
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const resultPromise = client.checkClaim({ claim: 'test claim' });
      vi.advanceTimersByTime(200);

      const result = await resultPromise;
      expect(result).toBeNull();
    });
  });

  describe('publisher credibility', () => {
    it('should assign correct credibility for known publishers', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Test claim',
            claimReview: [
              {
                publisher: { name: 'Snopes', site: 'snopes.com' },
                url: 'https://snopes.com/test',
                textualRating: 'True',
              },
              {
                publisher: { name: 'PolitiFact', site: 'politifact.com' },
                url: 'https://politifact.com/test',
                textualRating: 'True',
              },
              {
                publisher: { name: 'AP News', site: 'apnews.com' },
                url: 'https://apnews.com/test',
                textualRating: 'True',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).not.toBeNull();
      expect(result!.sources).toHaveLength(3);

      // Sources should be sorted by credibility (highest first)
      expect(result!.sources[0].source).toBe('Snopes');
      expect(result!.sources[0].sourceCredibility).toBe(95);

      expect(result!.sources[1].source).toBe('PolitiFact');
      expect(result!.sources[1].sourceCredibility).toBe(90);

      expect(result!.sources[2].source).toBe('AP News');
      expect(result!.sources[2].sourceCredibility).toBe(88);
    });

    it('should assign default credibility for unknown publishers', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Test claim',
            claimReview: [
              {
                publisher: { name: 'Unknown Publisher', site: 'unknown.com' },
                url: 'https://unknown.com/test',
                textualRating: 'True',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).not.toBeNull();
      expect(result!.sources[0].sourceCredibility).toBe(60); // Default credibility
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicting ratings between sources', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Controversial claim',
            claimReview: [
              {
                publisher: { name: 'Source A', site: 'a.com' },
                url: 'https://a.com/test',
                textualRating: 'True',
              },
              {
                publisher: { name: 'Source B', site: 'b.com' },
                url: 'https://b.com/test',
                textualRating: 'False',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'controversial claim' });

      expect(result).not.toBeNull();
      expect(result!.hasConflictingSources).toBe(true);
    });

    it('should not flag conflict when all sources agree', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Clear claim',
            claimReview: [
              {
                publisher: { name: 'Source A', site: 'a.com' },
                url: 'https://a.com/test',
                textualRating: 'False',
              },
              {
                publisher: { name: 'Source B', site: 'b.com' },
                url: 'https://b.com/test',
                textualRating: 'Mostly False',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'clear claim' });

      expect(result).not.toBeNull();
      expect(result!.hasConflictingSources).toBe(false);
    });

    it('should detect conflict with "pants on fire" vs "true"', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Test claim',
            claimReview: [
              {
                publisher: { name: 'Source A', site: 'a.com' },
                url: 'https://a.com/test',
                textualRating: 'Pants on Fire',
              },
              {
                publisher: { name: 'Source B', site: 'b.com' },
                url: 'https://b.com/test',
                textualRating: 'Mostly True',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).not.toBeNull();
      expect(result!.hasConflictingSources).toBe(true);
    });
  });

  describe('TTL calculation', () => {
    it('should use shorter TTL for recent claims (within 7 days)', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      // Set current time
      const now = new Date('2026-02-14T12:00:00Z');
      vi.setSystemTime(now);

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Breaking news claim',
            claimReview: [
              {
                publisher: { name: 'Snopes', site: 'snopes.com' },
                url: 'https://snopes.com/test',
                textualRating: 'True',
                reviewDate: '2026-02-12T00:00:00Z', // 2 days ago
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'breaking news' });

      expect(result).not.toBeNull();

      // Should use 6-hour TTL for developing situations
      const expectedExpiry = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      expect(result!.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should use longer TTL for established claims (older than 7 days)', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const now = new Date('2026-02-14T12:00:00Z');
      vi.setSystemTime(now);

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Old established claim',
            claimReview: [
              {
                publisher: { name: 'Snopes', site: 'snopes.com' },
                url: 'https://snopes.com/test',
                textualRating: 'False',
                reviewDate: '2026-01-01T00:00:00Z', // Over a month ago
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'old claim' });

      expect(result).not.toBeNull();

      // Should use 24-hour TTL for established facts
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(result!.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('edge cases', () => {
    it('should skip reviews without URL', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Test claim',
            claimReview: [
              {
                publisher: { name: 'Publisher A', site: 'a.com' },
                // Missing URL
                textualRating: 'True',
              },
              {
                publisher: { name: 'Publisher B', site: 'b.com' },
                url: 'https://b.com/test',
                textualRating: 'True',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).not.toBeNull();
      expect(result!.sources).toHaveLength(1);
      expect(result!.sources[0].source).toBe('Publisher B');
    });

    it('should skip reviews without publisher name', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Test claim',
            claimReview: [
              {
                publisher: {}, // Missing name
                url: 'https://a.com/test',
                textualRating: 'True',
              },
              {
                publisher: { name: 'Publisher B', site: 'b.com' },
                url: 'https://b.com/test',
                textualRating: 'True',
              },
            ],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).not.toBeNull();
      expect(result!.sources).toHaveLength(1);
      expect(result!.sources[0].source).toBe('Publisher B');
    });

    it('should use default values for optional parameters', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = { claims: [] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      await client.checkClaim({ claim: 'test claim' });

      const callUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(callUrl.searchParams.get('languageCode')).toBe('en'); // Default
      expect(callUrl.searchParams.get('pageSize')).toBe('10'); // Default
    });

    it('should handle claims with no claimReview array', async () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();

      const mockResponse: GoogleFactCheckApiResponse = {
        claims: [
          {
            text: 'Test claim',
            // Missing claimReview array
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.checkClaim({ claim: 'test claim' });

      expect(result).not.toBeNull();
      expect(result!.sources).toHaveLength(0);
    });
  });

  describe('client name', () => {
    it('should have correct name property', () => {
      process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
      const client = new GoogleFactCheckClient();
      expect(client.name).toBe('google-fact-check');
    });
  });
});
