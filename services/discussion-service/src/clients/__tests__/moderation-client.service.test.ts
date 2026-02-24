/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModerationClientService } from '../moderation-client.service.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ModerationClientService', () => {
  let service: ModerationClientService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ModerationClientService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queueChildContent', () => {
    const mockData = {
      responseId: 'response-123',
      topicId: 'topic-456',
      authorId: 'user-789',
      content: 'Test content for child review',
    };

    it('should successfully queue child content for moderation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await service.queueChildContent(mockData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/moderation/child-content/queue'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockData),
        }),
      );
    });

    it('should include AI flags when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const dataWithFlags = {
        ...mockData,
        aiFlags: {
          grooming: true,
          groomingConfidence: 0.85,
          groomingPatternType: 'secrecy_request' as const,
          recommendedAction: 'REVIEW' as const,
        },
      };

      await service.queueChildContent(dataWithFlags);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(dataWithFlags),
        }),
      );
    });

    it('should log warning but not throw on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      // Should not throw
      await expect(service.queueChildContent(mockData)).resolves.not.toThrow();
    });

    it('should log warning but not throw on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw (fire-and-forget)
      await expect(service.queueChildContent(mockData)).resolves.not.toThrow();
    });

    it('should use default moderation service URL when env var not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await service.queueChildContent(mockData);

      // Should use getServiceUrl default
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/localhost:\d+\/moderation\/child-content\/queue/),
        expect.any(Object),
      );
    });
  });

  describe('screenContentForChildren', () => {
    const testContent = 'Test content to screen for child safety';

    it('should return screening result on success', async () => {
      const mockResult = {
        childSafetyRisk: 'low' as const,
        groomingDetection: {
          detected: false,
          confidence: 0.1,
          patternType: null,
          flaggedPhrases: [],
          recommendedAction: 'ALLOW' as const,
          explanation: 'No concerning patterns detected',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResult),
      });

      const result = await service.screenContentForChildren(testContent);

      expect(result).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/moderation/child-content/screen'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: testContent }),
        }),
      );
    });

    it('should return safe default on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const result = await service.screenContentForChildren(testContent);

      // Should return safe default
      expect(result).toEqual({ childSafetyRisk: 'none' });
    });

    it('should return safe default on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.screenContentForChildren(testContent);

      // Should return safe default
      expect(result).toEqual({ childSafetyRisk: 'none' });
    });

    it('should handle grooming detection in response', async () => {
      const mockResult = {
        childSafetyRisk: 'high' as const,
        groomingDetection: {
          detected: true,
          confidence: 0.9,
          patternType: 'secrecy_request' as const,
          flaggedPhrases: ["don't tell anyone"],
          recommendedAction: 'REVIEW' as const,
          explanation: 'Potential secrecy request detected',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResult),
      });

      const result = await service.screenContentForChildren(testContent);

      expect(result.childSafetyRisk).toBe('high');
      expect(result.groomingDetection?.detected).toBe(true);
      expect(result.groomingDetection?.patternType).toBe('secrecy_request');
    });

    it('should handle critical safety risk', async () => {
      const mockResult = {
        childSafetyRisk: 'critical' as const,
        groomingDetection: {
          detected: true,
          confidence: 0.95,
          patternType: 'inappropriate_contact' as const,
          flaggedPhrases: ['meet me alone'],
          recommendedAction: 'BLOCK' as const,
          explanation: 'Severe grooming pattern detected',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResult),
      });

      const result = await service.screenContentForChildren(testContent);

      expect(result.childSafetyRisk).toBe('critical');
      expect(result.groomingDetection?.recommendedAction).toBe('BLOCK');
    });
  });

  describe('environment configuration', () => {
    it('should respect MODERATION_SERVICE_URL environment variable', () => {
      const originalEnv = process.env['MODERATION_SERVICE_URL'];
      process.env['MODERATION_SERVICE_URL'] = 'http://custom-moderation:8080';

      const customService = new ModerationClientService();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      customService.queueChildContent({
        responseId: 'test',
        topicId: 'test',
        authorId: 'test',
        content: 'test',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom-moderation:8080/moderation/child-content/queue',
        expect.any(Object),
      );

      // Restore original env
      if (originalEnv) {
        process.env['MODERATION_SERVICE_URL'] = originalEnv;
      } else {
        delete process.env['MODERATION_SERVICE_URL'];
      }
    });
  });
});
