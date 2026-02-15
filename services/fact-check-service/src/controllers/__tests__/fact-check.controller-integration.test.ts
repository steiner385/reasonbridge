/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration tests for Fact-Check Controller
 * T262: Tests the fact-check service flow with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FactCheckController } from '../fact-check.controller.js';
import { FactCheckService } from '../../services/fact-check.service.js';
import type { IFactCheckClient } from '../../clients/abstract-fact-check.client.js';
import type { FactCheckResult } from '../../clients/types.js';

/**
 * These tests exercise the full flow from controller through service
 * using realistic mocks for external dependencies
 */
describe('FactCheckController Integration', () => {
  let controller: FactCheckController;
  let service: FactCheckService;
  let mockClient: {
    name: string;
    checkClaim: ReturnType<typeof vi.fn>;
    getHealth: ReturnType<typeof vi.fn>;
    isConfigured: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      name: 'integration-test-client',
      checkClaim: vi.fn(),
      getHealth: vi.fn().mockResolvedValue({
        isHealthy: true,
        message: 'Operational',
        recentErrorCount: 0,
      }),
      isConfigured: vi.fn().mockReturnValue(true),
    };

    // Create real service with mock client
    service = new FactCheckService([mockClient as unknown as IFactCheckClient]);
    controller = new FactCheckController(service);
  });

  describe('Full claim checking flow', () => {
    it('should process claims through the entire pipeline', async () => {
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

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [
          {
            text: 'The Earth is flat',
            startOffset: 0,
            endOffset: 17,
          },
        ],
      });

      // Verify response structure
      expect(response.results).toHaveLength(1);
      expect(response.results[0].claimText).toBe('The Earth is flat');
      expect(response.results[0].displayedAs).toBe('Related Context');
      expect(response.results[0].sources).toHaveLength(1);
      expect(response.results[0].sources[0].provider).toBe('Snopes');
      expect(response.results[0].sources[0].credibilityScore).toBe(0.95);
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Verify client was called correctly
      expect(mockClient.checkClaim).toHaveBeenCalledTimes(1);
      expect(mockClient.checkClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          claim: 'The Earth is flat',
        }),
      );
    });

    it('should process multiple claims in parallel', async () => {
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

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [
          { text: 'Claim 1 text here', startOffset: 0, endOffset: 15 },
          { text: 'Claim 2 text here', startOffset: 20, endOffset: 35 },
        ],
      });

      expect(response.results).toHaveLength(2);
      expect(mockClient.checkClaim).toHaveBeenCalledTimes(2);
    });

    it('should handle client errors gracefully', async () => {
      mockClient.checkClaim.mockRejectedValue(new Error('External API error'));

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [
          {
            text: 'Test claim that causes error',
            startOffset: 0,
            endOffset: 25,
          },
        ],
      });

      // Should return empty results, not throw
      expect(response.results).toHaveLength(0);
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect and flag conflicting sources', async () => {
      mockClient.checkClaim.mockResolvedValue({
        claimText: 'Coffee is good for health',
        sources: [
          {
            source: 'Snopes',
            title: 'Coffee Benefits',
            url: 'https://snopes.com/coffee-good',
            publishedAt: new Date(),
            rating: 'Mostly True',
            sourceCredibility: 90,
          },
          {
            source: 'FactCheck.org',
            title: 'Coffee Concerns',
            url: 'https://factcheck.org/coffee-bad',
            publishedAt: new Date(),
            rating: 'Needs Context',
            sourceCredibility: 85,
          },
        ],
        hasConflictingSources: true,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [
          {
            text: 'Coffee is good for health',
            startOffset: 0,
            endOffset: 25,
          },
        ],
      });

      expect(response.results[0].hasConflictingSources).toBe(true);
      expect(response.results[0].conflictSummary).toBe(
        'Multiple fact-checking sources have different assessments for this claim.',
      );
    });

    it('should sort sources by credibility', async () => {
      mockClient.checkClaim.mockResolvedValue({
        claimText: 'Test claim',
        sources: [
          {
            source: 'Low',
            title: 'T',
            url: 'http://low.com',
            publishedAt: new Date(),
            sourceCredibility: 50,
          },
          {
            source: 'High',
            title: 'T',
            url: 'http://high.com',
            publishedAt: new Date(),
            sourceCredibility: 95,
          },
          {
            source: 'Medium',
            title: 'T',
            url: 'http://mid.com',
            publishedAt: new Date(),
            sourceCredibility: 75,
          },
        ],
        hasConflictingSources: false,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [{ text: 'Test claim text', startOffset: 0, endOffset: 15 }],
      });

      expect(response.results[0].sources[0].credibilityScore).toBe(0.95);
      expect(response.results[0].sources[1].credibilityScore).toBe(0.75);
      expect(response.results[0].sources[2].credibilityScore).toBe(0.5);
    });

    it('should return empty results when no fact-checks found', async () => {
      mockClient.checkClaim.mockResolvedValue(null);

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [
          {
            text: 'Some obscure claim with no fact-checks',
            startOffset: 0,
            endOffset: 35,
          },
        ],
      });

      expect(response.results).toHaveLength(0);
    });

    it('should include claim offsets in results', async () => {
      mockClient.checkClaim.mockResolvedValue({
        claimText: 'Test claim',
        sources: [
          {
            source: 'Test',
            title: 'T',
            url: 'http://test.com',
            publishedAt: new Date(),
            sourceCredibility: 80,
          },
        ],
        hasConflictingSources: false,
        checkedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      const response = await controller.checkClaims({
        responseId: 'response-123',
        claims: [
          {
            text: 'Test claim',
            startOffset: 100,
            endOffset: 110,
          },
        ],
      });

      expect(response.results[0].claimStartOffset).toBe(100);
      expect(response.results[0].claimEndOffset).toBe(110);
    });
  });

  describe('Validation integration', () => {
    it('should reject requests with no responseId through full pipeline', async () => {
      await expect(
        controller.checkClaims({
          responseId: '',
          claims: [{ text: 'Test', startOffset: 0, endOffset: 4 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject claims exceeding max length through full pipeline', async () => {
      await expect(
        controller.checkClaims({
          responseId: 'response-123',
          claims: [
            {
              text: 'a'.repeat(1001),
              startOffset: 0,
              endOffset: 1001,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject more than 10 claims through full pipeline', async () => {
      const claims = Array.from({ length: 11 }, (_, i) => ({
        text: `Claim number ${i + 1} is a test`,
        startOffset: i * 25,
        endOffset: i * 25 + 20,
      }));

      await expect(
        controller.checkClaims({
          responseId: 'response-123',
          claims,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Result retrieval integration', () => {
    it('should throw NotFoundException when result not found', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      await expect(controller.getResult(uuid)).rejects.toThrow(NotFoundException);
    });

    it('should validate UUID format', async () => {
      await expect(controller.getResult('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });
});
