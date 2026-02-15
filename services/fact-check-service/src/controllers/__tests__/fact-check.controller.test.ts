/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FactCheckController } from '../fact-check.controller.js';
import { FactCheckService } from '../../services/fact-check.service.js';
import type {
  CheckClaimsRequestDto,
  CheckClaimsResponseDto,
  FactCheckResultDto,
} from '../../dto/check-claims.dto.js';

describe('FactCheckController', () => {
  let controller: FactCheckController;
  let mockFactCheckService: {
    checkClaims: ReturnType<typeof vi.fn>;
    getResultById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockFactCheckService = {
      checkClaims: vi.fn(),
      getResultById: vi.fn(),
    };
    controller = new FactCheckController(mockFactCheckService as unknown as FactCheckService);
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

    it('should check claims successfully', async () => {
      const mockResponse: CheckClaimsResponseDto = {
        results: [
          {
            id: 'result-1',
            claimText: 'The Earth is flat',
            claimStartOffset: 0,
            claimEndOffset: 17,
            displayedAs: 'Related Context',
            sources: [
              {
                provider: 'Snopes',
                url: 'https://snopes.com/earth-flat',
                title: 'Is the Earth Flat?',
                publishedAt: '2023-01-01T00:00:00.000Z',
                rating: 'False',
                ratingDescription: 'False',
                credibilityScore: 0.95,
                retrievedAt: '2024-01-01T00:00:00.000Z',
              },
            ],
            hasConflictingSources: false,
            expiresAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        processingTimeMs: 100,
      };

      mockFactCheckService.checkClaims.mockResolvedValue(mockResponse);

      const result = await controller.checkClaims(validRequest);

      expect(result).toEqual(mockResponse);
      expect(mockFactCheckService.checkClaims).toHaveBeenCalledWith(validRequest);
    });

    it('should throw BadRequestException when responseId is missing', async () => {
      const request = { claims: validRequest.claims } as CheckClaimsRequestDto;

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow('responseId is required');
    });

    it('should throw BadRequestException when claims is not an array', async () => {
      const request = {
        responseId: '123',
        claims: 'not an array',
      } as unknown as CheckClaimsRequestDto;

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow('claims array is required');
    });

    it('should throw BadRequestException when claims is empty', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow('claims array cannot be empty');
    });

    it('should throw BadRequestException when claim text is missing', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [{ startOffset: 0, endOffset: 10 }] as CheckClaimsRequestDto['claims'],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'claims[0].text is required and must be a string',
      );
    });

    it('should throw BadRequestException when claim text is empty', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [{ text: '   ', startOffset: 0, endOffset: 10 }],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'claims[0].text cannot be empty',
      );
    });

    it('should throw BadRequestException when claim text exceeds 1000 characters', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [{ text: 'a'.repeat(1001), startOffset: 0, endOffset: 1001 }],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'claims[0].text exceeds maximum length of 1000 characters',
      );
    });

    it('should throw BadRequestException when startOffset is negative', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [{ text: 'test claim', startOffset: -1, endOffset: 10 }],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'claims[0].startOffset is required and must be a non-negative number',
      );
    });

    it('should throw BadRequestException when endOffset is not greater than startOffset', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [{ text: 'test claim', startOffset: 10, endOffset: 5 }],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'claims[0].endOffset must be greater than startOffset',
      );
    });

    it('should throw BadRequestException when more than 10 claims are provided', async () => {
      const claims = Array.from({ length: 11 }, (_, i) => ({
        text: `Claim ${i}`,
        startOffset: i * 10,
        endOffset: i * 10 + 9,
      }));

      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims,
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'Maximum 10 claims allowed per request',
      );
    });

    it('should validate multiple claims and report the first error', async () => {
      const request: CheckClaimsRequestDto = {
        responseId: '123',
        claims: [
          { text: 'Valid claim', startOffset: 0, endOffset: 11 },
          { text: '   ', startOffset: 12, endOffset: 20 }, // whitespace-only is not empty but trims to empty
        ],
      };

      await expect(controller.checkClaims(request)).rejects.toThrow(BadRequestException);
      await expect(controller.checkClaims(request)).rejects.toThrow(
        'claims[1].text cannot be empty',
      );
    });
  });

  describe('getResult', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    const mockResult: FactCheckResultDto = {
      id: validUuid,
      claimText: 'The Earth is flat',
      claimStartOffset: 0,
      claimEndOffset: 17,
      displayedAs: 'Related Context',
      sources: [
        {
          provider: 'Snopes',
          url: 'https://snopes.com/earth-flat',
          title: 'Is the Earth Flat?',
          publishedAt: '2023-01-01T00:00:00.000Z',
          rating: 'False',
          ratingDescription: 'False',
          credibilityScore: 0.95,
          retrievedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      hasConflictingSources: false,
      expiresAt: '2024-01-02T00:00:00.000Z',
    };

    it('should return fact-check result successfully', async () => {
      mockFactCheckService.getResultById.mockResolvedValue(mockResult);

      const result = await controller.getResult(validUuid);

      expect(result).toEqual(mockResult);
      expect(mockFactCheckService.getResultById).toHaveBeenCalledWith(validUuid);
    });

    it('should throw BadRequestException for invalid UUID format', async () => {
      const invalidId = 'not-a-valid-uuid';

      await expect(controller.getResult(invalidId)).rejects.toThrow(BadRequestException);
      await expect(controller.getResult(invalidId)).rejects.toThrow(
        'Invalid fact-check result ID format',
      );
    });

    it('should accept valid UUID v1 format', async () => {
      // UUID v1 format is also accepted
      const uuidV1 = '123e4567-e89b-12d3-8456-426614174000';
      mockFactCheckService.getResultById.mockResolvedValue(mockResult);

      const result = await controller.getResult(uuidV1);
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException when result not found', async () => {
      mockFactCheckService.getResultById.mockResolvedValue(null);

      await expect(controller.getResult(validUuid)).rejects.toThrow(NotFoundException);
      await expect(controller.getResult(validUuid)).rejects.toThrow(
        `Fact-check result not found: ${validUuid}`,
      );
    });

    it('should accept various valid UUID v4 formats', async () => {
      mockFactCheckService.getResultById.mockResolvedValue(mockResult);

      // Lowercase
      await expect(
        controller.getResult('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
      ).resolves.toBeDefined();

      // Uppercase
      await expect(
        controller.getResult('A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11'),
      ).resolves.toBeDefined();

      // Mixed case
      await expect(
        controller.getResult('A0eebc99-9C0B-4ef8-Bb6d-6BB9BD380a11'),
      ).resolves.toBeDefined();
    });
  });
});
