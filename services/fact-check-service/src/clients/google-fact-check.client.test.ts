/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleFactCheckClient } from './google-fact-check.client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GoogleFactCheckClient', () => {
  let client: GoogleFactCheckClient;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env['GOOGLE_FACT_CHECK_API_KEY'] = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      client = new GoogleFactCheckClient();
      expect(client.isConfigured()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env['GOOGLE_FACT_CHECK_API_KEY'];
      client = new GoogleFactCheckClient();
      expect(client.isConfigured()).toBe(false);
    });
  });

  describe('searchClaims', () => {
    beforeEach(() => {
      client = new GoogleFactCheckClient();
    });

    it('should return empty array when not configured', async () => {
      delete process.env['GOOGLE_FACT_CHECK_API_KEY'];
      const unconfiguredClient = new GoogleFactCheckClient();

      const results = await unconfiguredClient.searchClaims('test claim');

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return transformed results on success', async () => {
      const mockResponse = {
        claims: [
          {
            text: 'The earth is flat',
            claimant: 'Someone',
            claimReview: [
              {
                publisher: { name: 'Snopes', site: 'snopes.com' },
                url: 'https://snopes.com/fact-check/earth-flat',
                title: 'Is the Earth Flat?',
                reviewDate: '2023-01-15',
                textualRating: 'False',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await client.searchClaims('earth flat');

      expect(results).toHaveLength(1);
      expect(results[0].claimText).toBe('The earth is flat');
      expect(results[0].sources).toHaveLength(1);
      expect(results[0].sources[0].provider).toBe('Snopes');
      expect(results[0].sources[0].rating).toBe('False');
      expect(results[0].hasConflictingSources).toBe(false);
    });

    it('should detect conflicting sources', async () => {
      const mockResponse = {
        claims: [
          {
            text: 'Controversial claim',
            claimReview: [
              {
                publisher: { name: 'Source A' },
                url: 'https://a.com/check',
                title: 'Check A',
                textualRating: 'True',
              },
              {
                publisher: { name: 'Source B' },
                url: 'https://b.com/check',
                title: 'Check B',
                textualRating: 'False',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await client.searchClaims('controversial claim');

      expect(results[0].hasConflictingSources).toBe(true);
      expect(results[0].conflictSummary).toBeDefined();
    });

    it('should return empty array when no claims found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ claims: [] }),
      });

      const results = await client.searchClaims('obscure claim');

      expect(results).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const results = await client.searchClaims('test claim');

      expect(results).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await client.searchClaims('test claim');

      expect(results).toEqual([]);
    });

    it('should include language code in request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ claims: [] }),
      });

      await client.searchClaims('test claim', 'en');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('languageCode=en'),
        expect.any(Object),
      );
    });

    it('should assign higher credibility to IFCN signatories', async () => {
      const mockResponse = {
        claims: [
          {
            text: 'Test claim',
            claimReview: [
              {
                publisher: { name: 'PolitiFact' },
                url: 'https://politifact.com/check',
                title: 'Test',
                textualRating: 'True',
              },
              {
                publisher: { name: 'Unknown Blog' },
                url: 'https://unknownblog.com/check',
                title: 'Test',
                textualRating: 'True',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await client.searchClaims('test claim');

      // PolitiFact (IFCN signatory) should have higher credibility
      expect(results[0].sources[0].credibilityScore).toBe(0.9);
      // Unknown blog should have default credibility
      expect(results[0].sources[1].credibilityScore).toBe(0.5);
    });
  });
});
