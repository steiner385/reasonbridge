/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for FactCheckController
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactCheckController } from '../fact-check.controller.js';
import { FactCheckService } from '../fact-check.service.js';
import type { FactCheckResponseDto, NoFactCheckFoundResponseDto } from '../dto/index.js';

describe('FactCheckController', () => {
  let controller: FactCheckController;
  let mockService: {
    checkClaim: ReturnType<typeof vi.fn>;
    getClientsHealth: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      checkClaim: vi.fn(),
      getClientsHealth: vi.fn(),
    };
    controller = new FactCheckController(mockService as unknown as FactCheckService);
  });

  describe('checkClaim', () => {
    it('should call service.checkClaim with request dto', async () => {
      const request = { claim: 'Test claim for verification' };
      const expectedResult: FactCheckResponseDto = {
        claimText: 'Test claim for verification',
        sources: [],
        hasConflictingSources: false,
        checkedAt: '2026-02-14T12:00:00Z',
        expiresAt: '2026-02-15T12:00:00Z',
        sourceCount: 0,
      };
      mockService.checkClaim.mockResolvedValue(expectedResult);

      const result = await controller.checkClaim(request);

      expect(mockService.checkClaim).toHaveBeenCalledWith(request);
      expect(result).toEqual(expectedResult);
    });

    it('should return NoFactCheckFoundResponseDto when no results', async () => {
      const request = { claim: 'Unknown claim without matching results' };
      const expectedResult: NoFactCheckFoundResponseDto = {
        claimText: 'Unknown claim without matching results',
        message: 'No fact-checks found for this claim',
        suggestions: ['Try rephrasing'],
      };
      mockService.checkClaim.mockResolvedValue(expectedResult);

      const result = await controller.checkClaim(request);

      expect(result).toEqual(expectedResult);
    });

    it('should pass through language code and max results', async () => {
      const request = {
        claim: 'German language claim test',
        languageCode: 'de',
        maxResults: 5,
      };
      mockService.checkClaim.mockResolvedValue({
        claimText: request.claim,
        sources: [],
        hasConflictingSources: false,
        checkedAt: '2026-02-14T12:00:00Z',
        expiresAt: '2026-02-15T12:00:00Z',
        sourceCount: 0,
      });

      await controller.checkClaim(request);

      expect(mockService.checkClaim).toHaveBeenCalledWith({
        claim: 'German language claim test',
        languageCode: 'de',
        maxResults: 5,
      });
    });
  });

  describe('getHealth', () => {
    it('should return health status wrapped in clients object', async () => {
      const healthData = [
        { name: 'google', isHealthy: true, message: 'Operational' },
        { name: 'snopes', isHealthy: false, message: 'API key not configured' },
      ];
      mockService.getClientsHealth.mockResolvedValue(healthData);

      const result = await controller.getHealth();

      expect(mockService.getClientsHealth).toHaveBeenCalled();
      expect(result).toEqual({ clients: healthData });
    });

    it('should return empty clients array when no clients', async () => {
      mockService.getClientsHealth.mockResolvedValue([]);

      const result = await controller.getHealth();

      expect(result).toEqual({ clients: [] });
    });
  });
});
