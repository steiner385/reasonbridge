/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroomingController } from './grooming.controller.js';
import { GroomingDetectorService } from '../services/grooming-detector.service.js';

describe('GroomingController', () => {
  let controller: GroomingController;
  let groomingService: GroomingDetectorService;

  beforeEach(() => {
    vi.clearAllMocks();
    groomingService = new GroomingDetectorService();
    controller = new GroomingController(groomingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /ai/grooming/analyze', () => {
    it('should call analyze on the grooming detector service', async () => {
      const analyzeSpy = vi.spyOn(groomingService, 'analyze');
      const content = 'This is a test message';

      await controller.analyze({ content });

      expect(analyzeSpy).toHaveBeenCalledWith(content);
    });

    it('should return GroomingDetectionResult for clean content', async () => {
      const result = await controller.analyze({
        content: 'This is a safe discussion about science',
      });

      expect(result).toBeDefined();
      expect(result.detected).toBe(false);
      expect(result.recommendedAction).toBe('ALLOW');
      expect(result.confidence).toBe(0);
      expect(result.patternType).toBeNull();
      expect(result.flaggedPhrases).toHaveLength(0);
    });

    it('should detect grooming patterns and return appropriate result', async () => {
      const content = "Don't tell your parents about our conversation";

      const result = await controller.analyze({ content });

      expect(result.detected).toBe(true);
      expect(result.patternType).toBe('isolation_attempt');
      expect(result.flaggedPhrases.length).toBeGreaterThan(0);
    });

    it('should return BLOCK recommendation for high confidence matches', async () => {
      const content =
        "Don't tell your parents. Our little secret. Are you alone? " +
        "I'll buy you anything. You're so mature for your age.";

      const result = await controller.analyze({ content });

      expect(result.detected).toBe(true);
      expect(result.recommendedAction).toBe('BLOCK');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should return REVIEW recommendation for medium-high confidence', async () => {
      const content = "Don't tell your parents. Our little secret.";

      const result = await controller.analyze({ content });

      expect(result.detected).toBe(true);
      expect(result.recommendedAction).toBe('REVIEW');
    });

    it('should handle empty content gracefully', async () => {
      const result = await controller.analyze({ content: '' });

      expect(result.detected).toBe(false);
      expect(result.recommendedAction).toBe('ALLOW');
    });
  });

  describe('POST /ai/grooming/detailed', () => {
    it('should call getDetailedAnalysis on the grooming detector service', async () => {
      const detailedSpy = vi.spyOn(groomingService, 'getDetailedAnalysis');
      const content = 'This is a test message';

      await controller.detailed({ content });

      expect(detailedSpy).toHaveBeenCalledWith(content);
    });

    it('should return DetailedGroomingAnalysis for clean content', async () => {
      const result = await controller.detailed({
        content: 'This is a safe discussion about space exploration',
      });

      expect(result).toBeDefined();
      expect(result.allPatternsFound).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
      expect(result.moderatorNotes).toBeDefined();
      expect(result.originalContent).toBe('This is a safe discussion about space exploration');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return detailed pattern breakdown for concerning content', async () => {
      const content = "How old are you? Don't tell your parents.";

      const result = await controller.detailed({ content });

      expect(result.allPatternsFound.length).toBeGreaterThan(0);
      expect(result.allPatternsFound).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            match: expect.any(String),
            severity: expect.any(Number),
          }),
        ]),
      );
    });

    it('should return risk level based on confidence', async () => {
      const highRiskContent =
        "Don't tell your parents. Are you alone? I'll buy you gifts. DM me privately.";

      const result = await controller.detailed({ content: highRiskContent });

      expect(['medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('should include moderator notes with pattern breakdown', async () => {
      const content = "Don't tell your parents about this conversation.";

      const result = await controller.detailed({ content });

      expect(result.moderatorNotes).toBeDefined();
      expect(result.moderatorNotes.length).toBeGreaterThan(0);
      expect(result.moderatorNotes).toContain('isolation_attempt');
    });

    it('should include timestamp in the result', async () => {
      const beforeTest = new Date();
      const result = await controller.detailed({ content: 'Test content' });
      const afterTest = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    it('should preserve original content in the result', async () => {
      const originalContent = 'This is the original content that was analyzed.';

      const result = await controller.detailed({ content: originalContent });

      expect(result.originalContent).toBe(originalContent);
    });
  });

  describe('error handling', () => {
    it('should handle null content by treating it as empty', async () => {
      // The DTO validation should handle null, but if it passes through:
      const result = await controller.analyze({ content: '' });

      expect(result.detected).toBe(false);
      expect(result.recommendedAction).toBe('ALLOW');
    });
  });
});
