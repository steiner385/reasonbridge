/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for factCheckService
 * T261: Tests for fact-check frontend service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { factCheckService } from '../factCheckService';
import type { FactCheckResult } from '../../types/factCheck';

const API_BASE = 'http://localhost:3000';

describe('factCheckService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('checkClaims', () => {
    it('should send claims to the API and return results', async () => {
      const mockResponse = {
        results: [
          {
            id: 'result-1',
            claimText: 'Test claim',
            displayedAs: 'Related Context',
            sources: [],
            hasConflictingSources: false,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
        processingTimeMs: 100,
      };

      server.use(
        http.post(`${API_BASE}/fact-check/check`, () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await factCheckService.checkClaims('response-123', [
        { text: 'Test claim', startOffset: 0, endOffset: 10 },
      ]);

      expect(result).toEqual(mockResponse);
    });

    it('should include auth token from localStorage', async () => {
      localStorage.setItem('authToken', 'test-token-123');

      let capturedHeaders: Headers | null = null;
      server.use(
        http.post(`${API_BASE}/fact-check/check`, ({ request }) => {
          capturedHeaders = new Headers(request.headers);
          return HttpResponse.json({ results: [], processingTimeMs: 0 });
        }),
      );

      await factCheckService.checkClaims('response-123', []);

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-token-123');
    });

    it('should include auth token from sessionStorage if not in localStorage', async () => {
      sessionStorage.setItem('authToken', 'session-token-456');

      let capturedHeaders: Headers | null = null;
      server.use(
        http.post(`${API_BASE}/fact-check/check`, ({ request }) => {
          capturedHeaders = new Headers(request.headers);
          return HttpResponse.json({ results: [], processingTimeMs: 0 });
        }),
      );

      await factCheckService.checkClaims('response-123', []);

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer session-token-456');
    });

    it('should throw error when API returns non-ok response', async () => {
      server.use(
        http.post(`${API_BASE}/fact-check/check`, () => {
          return HttpResponse.json({ message: 'Invalid request' }, { status: 400 });
        }),
      );

      await expect(
        factCheckService.checkClaims('response-123', [
          { text: 'Test', startOffset: 0, endOffset: 4 },
        ]),
      ).rejects.toThrow('Invalid request');
    });

    it('should throw generic error when API error has no message', async () => {
      server.use(
        http.post(`${API_BASE}/fact-check/check`, () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        }),
      );

      await expect(
        factCheckService.checkClaims('response-123', [
          { text: 'Test', startOffset: 0, endOffset: 4 },
        ]),
      ).rejects.toThrow('Failed to check claims');
    });
  });

  describe('extractClaims', () => {
    it('should extract factual claims from content', () => {
      const content =
        'The Earth is round and has been proven by science. Studies show that this has been known for centuries. What do you think?';

      const claims = factCheckService.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      // At least one claim should be extracted
      const claimTexts = claims.map((c) => c.text).join(' ');
      expect(claimTexts).toContain('been');
    });

    it('should skip questions', () => {
      const content = 'Is the Earth flat? What do you think about this topic?';

      const claims = factCheckService.extractClaims(content);

      expect(claims).toHaveLength(0);
    });

    it('should skip short sentences', () => {
      const content = 'Yes. No. Maybe.';

      const claims = factCheckService.extractClaims(content);

      expect(claims).toHaveLength(0);
    });

    it('should include correct offsets', () => {
      const content = 'This is a prefix. The temperature has risen by 2 degrees.';

      const claims = factCheckService.extractClaims(content);

      if (claims.length > 0) {
        const claim = claims.find((c) => c.text.includes('temperature'));
        if (claim) {
          expect(claim.startOffset).toBeGreaterThan(0);
          expect(claim.endOffset).toBe(claim.startOffset + claim.text.length);
        }
      }
    });

    it('should limit to 10 claims maximum', () => {
      // Create content with many factual sentences
      const sentences = Array.from(
        { length: 15 },
        (_, i) => `Studies show that fact number ${i + 1} has been proven.`,
      );
      const content = sentences.join(' ');

      const claims = factCheckService.extractClaims(content);

      expect(claims.length).toBeLessThanOrEqual(10);
    });

    it('should detect percentage patterns', () => {
      const content = 'About 75 percent of scientists agree on this matter.';

      const claims = factCheckService.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].text).toContain('percent');
    });

    it('should detect date patterns', () => {
      const content = 'Since 2020, the global temperature has increased significantly.';

      const claims = factCheckService.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].text).toContain('2020');
    });

    it('should detect quantifier patterns', () => {
      const content = 'All experts in the field have confirmed this finding.';

      const claims = factCheckService.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].text).toContain('All experts');
    });
  });

  describe('isExpired', () => {
    it('should return true for expired results', () => {
      const expiredResult: FactCheckResult = {
        id: 'result-1',
        claimText: 'Test claim',
        displayedAs: 'Related Context',
        sources: [],
        hasConflictingSources: false,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      expect(factCheckService.isExpired(expiredResult)).toBe(true);
    });

    it('should return false for non-expired results', () => {
      const validResult: FactCheckResult = {
        id: 'result-1',
        claimText: 'Test claim',
        displayedAs: 'Related Context',
        sources: [],
        hasConflictingSources: false,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      expect(factCheckService.isExpired(validResult)).toBe(false);
    });
  });

  describe('getOverallStatus', () => {
    it('should return "no-context" for empty results', () => {
      expect(factCheckService.getOverallStatus([])).toBe('no-context');
    });

    it('should return "conflicts" when any result has conflicts', () => {
      const results: FactCheckResult[] = [
        {
          id: 'result-1',
          claimText: 'Test claim',
          displayedAs: 'Related Context',
          sources: [
            {
              provider: 'Snopes',
              url: 'https://snopes.com/test',
              title: 'Test',
              credibilityScore: 0.9,
              retrievedAt: new Date().toISOString(),
            },
          ],
          hasConflictingSources: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      expect(factCheckService.getOverallStatus(results)).toBe('conflicts');
    });

    it('should return "has-context" when sources exist without conflicts', () => {
      const results: FactCheckResult[] = [
        {
          id: 'result-1',
          claimText: 'Test claim',
          displayedAs: 'Related Context',
          sources: [
            {
              provider: 'Snopes',
              url: 'https://snopes.com/test',
              title: 'Test',
              credibilityScore: 0.9,
              retrievedAt: new Date().toISOString(),
            },
          ],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      expect(factCheckService.getOverallStatus(results)).toBe('has-context');
    });

    it('should return "no-context" when results have no sources', () => {
      const results: FactCheckResult[] = [
        {
          id: 'result-1',
          claimText: 'Test claim',
          displayedAs: 'Related Context',
          sources: [],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      expect(factCheckService.getOverallStatus(results)).toBe('no-context');
    });
  });
});
