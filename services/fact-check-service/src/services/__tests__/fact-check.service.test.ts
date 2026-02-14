/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactCheckService } from '../fact-check.service.js';
import type { IFactCheckClient } from '../../clients/abstract-fact-check.client.js';
import type { FactCheckResult, FactCheckClientHealth } from '../../clients/types.js';
import type { CheckClaimsRequestDto } from '../../dto/check-claims.dto.js';

describe('FactCheckService', () => {
  let service: FactCheckService;
  let mockClient: {
    name: string;
    checkClaim: ReturnType<typeof vi.fn>;
    getHealth: ReturnType<typeof vi.fn>;
    isConfigured: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      name: 'mock-client',
      checkClaim: vi.fn(),
      getHealth: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(true),
    };
    service = new FactCheckService([mockClient as unknown as IFactCheckClient]);
  });

  describe('checkClaims', () => {
    const validRequest: CheckClaimsRequestDto = {
      responseId: '123e4567-e89b-12d3-a456-426614174000',
      claims: [
        {
          text: 'The Earth is flat',
          startOffset: 0,
          endOffset: 17,
        },
      ],
    };

    it('should return empty results when no clients are configured', async () => {
      const emptyService = new FactCheckService([]);

      const result = await emptyService.checkClaims(validRequest);

      expect(result.results).toHaveLength(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should process claims and return results', async () => {
      const mockResult: FactCheckResult = {
        claimText: 'The Earth is flat',
        sources: [
          {
            source: 'Snopes',
            title: 'Is the Earth Flat?',
            url: 'https://snopes.com/earth-flat',
            publishedAt: new Date('2023-01-01'),
            rating: 'False',
            excerpt: 'The Earth is not flat',
            sourceCredibility: 95,
          },
        ],
        hasConflictingSources: false,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockClient.checkClaim.mockResolvedValue(mockResult);

      const result = await service.checkClaims(validRequest);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].claimText).toBe('The Earth is flat');
      expect(result.results[0].displayedAs).toBe('Related Context');
      expect(result.results[0].sources).toHaveLength(1);
      expect(result.results[0].sources[0].provider).toBe('Snopes');
      expect(result.results[0].sources[0].credibilityScore).toBe(0.95);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return empty results when no fact-checks found', async () => {
      mockClient.checkClaim.mockResolvedValue(null);

      const result = await service.checkClaims(validRequest);

      expect(result.results).toHaveLength(0);
    });

    it('should process multiple claims in parallel', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [
          { text: 'Claim 1', startOffset: 0, endOffset: 7 },
          { text: 'Claim 2', startOffset: 10, endOffset: 17 },
        ],
      };

      mockClient.checkClaim
        .mockResolvedValueOnce({
          claimText: 'Claim 1',
          sources: [
            {
              source: 'Source 1',
              title: 'Title 1',
              url: 'https://example.com/1',
              publishedAt: new Date(),
              sourceCredibility: 80,
            },
          ],
          hasConflictingSources: false,
          checkedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .mockResolvedValueOnce({
          claimText: 'Claim 2',
          sources: [
            {
              source: 'Source 2',
              title: 'Title 2',
              url: 'https://example.com/2',
              publishedAt: new Date(),
              sourceCredibility: 90,
            },
          ],
          hasConflictingSources: false,
          checkedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        });

      const result = await service.checkClaims(request);

      expect(result.results).toHaveLength(2);
      expect(mockClient.checkClaim).toHaveBeenCalledTimes(2);
    });

    it('should handle client errors gracefully', async () => {
      mockClient.checkClaim.mockRejectedValue(new Error('API error'));

      const result = await service.checkClaims(validRequest);

      expect(result.results).toHaveLength(0);
    });

    it('should detect conflicting sources', async () => {
      const mockResult: FactCheckResult = {
        claimText: 'Test claim',
        sources: [
          {
            source: 'Source A',
            title: 'Title A',
            url: 'https://a.com',
            publishedAt: new Date(),
            rating: 'True',
            sourceCredibility: 90,
          },
          {
            source: 'Source B',
            title: 'Title B',
            url: 'https://b.com',
            publishedAt: new Date(),
            rating: 'False',
            sourceCredibility: 85,
          },
        ],
        hasConflictingSources: true,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockClient.checkClaim.mockResolvedValue(mockResult);

      const result = await service.checkClaims(validRequest);

      expect(result.results[0].hasConflictingSources).toBe(true);
      expect(result.results[0].conflictSummary).toBe(
        'Multiple fact-checking sources have different assessments for this claim.',
      );
    });

    it('should include claim offsets in results', async () => {
      const mockResult: FactCheckResult = {
        claimText: 'The Earth is flat',
        sources: [
          {
            source: 'Snopes',
            title: 'Is the Earth Flat?',
            url: 'https://snopes.com/earth-flat',
            publishedAt: new Date(),
            sourceCredibility: 95,
          },
        ],
        hasConflictingSources: false,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockClient.checkClaim.mockResolvedValue(mockResult);

      const result = await service.checkClaims(validRequest);

      expect(result.results[0].claimStartOffset).toBe(0);
      expect(result.results[0].claimEndOffset).toBe(17);
    });

    it('should sort sources by credibility (highest first)', async () => {
      const mockResult: FactCheckResult = {
        claimText: 'Test claim',
        sources: [
          {
            source: 'Low credibility',
            title: 'Title',
            url: 'https://low.com',
            publishedAt: new Date(),
            sourceCredibility: 50,
          },
          {
            source: 'High credibility',
            title: 'Title',
            url: 'https://high.com',
            publishedAt: new Date(),
            sourceCredibility: 95,
          },
          {
            source: 'Medium credibility',
            title: 'Title',
            url: 'https://medium.com',
            publishedAt: new Date(),
            sourceCredibility: 75,
          },
        ],
        hasConflictingSources: false,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockClient.checkClaim.mockResolvedValue(mockResult);

      const result = await service.checkClaims(validRequest);

      expect(result.results[0].sources[0].credibilityScore).toBe(0.95);
      expect(result.results[0].sources[1].credibilityScore).toBe(0.75);
      expect(result.results[0].sources[2].credibilityScore).toBe(0.5);
    });
  });

  describe('getProvidersHealth', () => {
    it('should return health status of all providers', async () => {
      const mockHealth: FactCheckClientHealth = {
        isHealthy: true,
        message: 'Operational',
        recentErrorCount: 0,
      };

      mockClient.getHealth.mockResolvedValue(mockHealth);

      const result = await service.getProvidersHealth();

      expect(result.providers).toHaveLength(1);
      expect(result.providers[0].name).toBe('mock-client');
      expect(result.providers[0].isHealthy).toBe(true);
      expect(result.providers[0].message).toBe('Operational');
    });

    it('should handle multiple providers', async () => {
      const secondClient = {
        name: 'second-client',
        checkClaim: vi.fn(),
        getHealth: vi.fn().mockResolvedValue({
          isHealthy: false,
          message: 'API key not configured',
          recentErrorCount: 0,
        }),
        isConfigured: vi.fn().mockReturnValue(false),
      };

      mockClient.getHealth.mockResolvedValue({
        isHealthy: true,
        message: 'Operational',
        recentErrorCount: 0,
      });

      const multiService = new FactCheckService([
        mockClient as unknown as IFactCheckClient,
        secondClient as unknown as IFactCheckClient,
      ]);

      const result = await multiService.getProvidersHealth();

      expect(result.providers).toHaveLength(2);
      expect(result.providers[0].isHealthy).toBe(true);
      expect(result.providers[1].isHealthy).toBe(false);
    });
  });
});
