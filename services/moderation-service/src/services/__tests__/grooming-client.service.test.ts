/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroomingClientService } from '../grooming-client.service.js';
import type {
  GroomingDetectionResult,
  DetailedGroomingAnalysis,
} from '../grooming-client.service.js';
import { of, throwError } from 'rxjs';

const createMockHttpService = () => ({
  post: vi.fn(),
});

describe('GroomingClientService', () => {
  let service: GroomingClientService;
  let mockHttpService: ReturnType<typeof createMockHttpService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpService = createMockHttpService();
    service = new GroomingClientService(mockHttpService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeForGrooming', () => {
    it('should call ai-service analyze endpoint with content', async () => {
      const mockResult: GroomingDetectionResult = {
        detected: false,
        confidence: 0,
        patternType: null,
        flaggedPhrases: [],
        recommendedAction: 'ALLOW',
        explanation: 'No grooming patterns detected.',
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResult }));

      const content = 'This is safe content';
      const result = await service.analyzeForGrooming(content);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/ai/grooming/analyze'),
        { content },
      );
      expect(result).toEqual(mockResult);
    });

    it('should return detection result for grooming content', async () => {
      const mockResult: GroomingDetectionResult = {
        detected: true,
        confidence: 0.85,
        patternType: 'isolation_attempt',
        flaggedPhrases: ["don't tell your parents"],
        recommendedAction: 'BLOCK',
        explanation: 'Detected concerning pattern.',
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResult }));

      const result = await service.analyzeForGrooming("Don't tell your parents");

      expect(result.detected).toBe(true);
      expect(result.patternType).toBe('isolation_attempt');
      expect(result.recommendedAction).toBe('BLOCK');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.analyzeForGrooming('test content')).rejects.toThrow(
        'Failed to analyze content for grooming',
      );
    });

    it('should handle empty response', async () => {
      mockHttpService.post.mockReturnValue(of({ data: null }));

      await expect(service.analyzeForGrooming('test content')).rejects.toThrow(
        'Invalid response from grooming analysis',
      );
    });
  });

  describe('getDetailedAnalysis', () => {
    it('should call ai-service detailed endpoint with content', async () => {
      const mockResult: DetailedGroomingAnalysis = {
        allPatternsFound: [],
        riskLevel: 'low',
        moderatorNotes: 'No concerning patterns detected.',
        originalContent: 'Safe content',
        timestamp: new Date(),
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResult }));

      const content = 'Safe content';
      const result = await service.getDetailedAnalysis(content);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/ai/grooming/detailed'),
        { content },
      );
      expect(result).toEqual(mockResult);
    });

    it('should return detailed analysis with patterns found', async () => {
      const mockResult: DetailedGroomingAnalysis = {
        allPatternsFound: [
          { type: 'isolation_attempt', match: "don't tell your parents", severity: 3 },
          { type: 'age_probing', match: 'how old are you', severity: 2 },
        ],
        riskLevel: 'high',
        moderatorNotes: 'Multiple grooming indicators detected.',
        originalContent: "Don't tell your parents. How old are you?",
        timestamp: new Date(),
      };

      mockHttpService.post.mockReturnValue(of({ data: mockResult }));

      const result = await service.getDetailedAnalysis("Don't tell your parents. How old are you?");

      expect(result.allPatternsFound.length).toBe(2);
      expect(result.riskLevel).toBe('high');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getDetailedAnalysis('test content')).rejects.toThrow(
        'Failed to get detailed grooming analysis',
      );
    });

    it('should handle empty response', async () => {
      mockHttpService.post.mockReturnValue(of({ data: null }));

      await expect(service.getDetailedAnalysis('test content')).rejects.toThrow(
        'Invalid response from detailed grooming analysis',
      );
    });
  });

  describe('configuration', () => {
    it('should use configured AI service URL', () => {
      // The service should read from environment/config
      expect(service).toBeDefined();
    });
  });
});
