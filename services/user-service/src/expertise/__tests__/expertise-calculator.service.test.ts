/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExpertiseCalculatorService,
  ExpertiseScoreInput,
} from '../expertise-calculator.service.js';

// Mock Prisma
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
  }
  return {
    Prisma: { Decimal: MockDecimal },
    ExpertiseLevel: {
      NOVICE: 'NOVICE',
      FAMILIAR: 'FAMILIAR',
      KNOWLEDGEABLE: 'KNOWLEDGEABLE',
      EXPERT: 'EXPERT',
    },
  };
});

describe('ExpertiseCalculatorService', () => {
  let service: ExpertiseCalculatorService;

  beforeEach(() => {
    service = new ExpertiseCalculatorService();
  });

  describe('calculateExpertiseScore', () => {
    it('should return score between 0 and 1', () => {
      const input: ExpertiseScoreInput = {
        categoryResponseCount: 25,
        avgQualityScore: 0.5,
        credentialBoostTotal: 0.3,
        daysSinceFirstResponse: 90,
      };

      const score = service.calculateExpertiseScore(input);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should weight categoryEngagement at 40%', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const lowEngagement = service.calculateExpertiseScore({ ...base, categoryResponseCount: 0 });
      // 50 responses = max engagement (1.0)
      const highEngagement = service.calculateExpertiseScore({
        ...base,
        categoryResponseCount: 50,
      });

      // Difference should be 1.0 * 0.40 = 0.40
      expect(highEngagement - lowEngagement).toBeCloseTo(0.4, 2);
    });

    it('should cap categoryEngagement at 50 responses', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const at50 = service.calculateExpertiseScore({ ...base, categoryResponseCount: 50 });
      const over50 = service.calculateExpertiseScore({ ...base, categoryResponseCount: 100 });

      expect(at50).toBeCloseTo(over50, 5);
    });

    it('should weight categoryQuality at 30%', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const lowQuality = service.calculateExpertiseScore({ ...base, avgQualityScore: 0 });
      const highQuality = service.calculateExpertiseScore({ ...base, avgQualityScore: 1.0 });

      // Difference should be 1.0 * 0.30 = 0.30
      expect(highQuality - lowQuality).toBeCloseTo(0.3, 2);
    });

    it('should weight credentialBoost at 20%', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const noCredentials = service.calculateExpertiseScore({ ...base, credentialBoostTotal: 0 });
      const maxCredentials = service.calculateExpertiseScore({
        ...base,
        credentialBoostTotal: 1.0,
      });

      // Difference should be 1.0 * 0.20 = 0.20
      expect(maxCredentials - noCredentials).toBeCloseTo(0.2, 2);
    });

    it('should cap credentialBoost at 1.0', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const at1 = service.calculateExpertiseScore({ ...base, credentialBoostTotal: 1.0 });
      const over1 = service.calculateExpertiseScore({ ...base, credentialBoostTotal: 2.0 });

      expect(at1).toBeCloseTo(over1, 5);
    });

    it('should weight categoryTenure at 10%', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const noTenure = service.calculateExpertiseScore({ ...base, daysSinceFirstResponse: 0 });
      // 180 days = max tenure (1.0)
      const maxTenure = service.calculateExpertiseScore({ ...base, daysSinceFirstResponse: 180 });

      // Difference should be 1.0 * 0.10 = 0.10
      expect(maxTenure - noTenure).toBeCloseTo(0.1, 2);
    });

    it('should cap categoryTenure at 180 days', () => {
      const base: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const at180 = service.calculateExpertiseScore({ ...base, daysSinceFirstResponse: 180 });
      const over180 = service.calculateExpertiseScore({ ...base, daysSinceFirstResponse: 365 });

      expect(at180).toBeCloseTo(over180, 5);
    });

    it('should calculate correct score with all components', () => {
      // All components at 50%
      const input: ExpertiseScoreInput = {
        categoryResponseCount: 25, // 25/50 = 0.5
        avgQualityScore: 0.5,
        credentialBoostTotal: 0.5,
        daysSinceFirstResponse: 90, // 90/180 = 0.5
      };

      const score = service.calculateExpertiseScore(input);

      // Expected: (0.5 * 0.4) + (0.5 * 0.3) + (0.5 * 0.2) + (0.5 * 0.1) = 0.5
      expect(score).toBeCloseTo(0.5, 2);
    });

    it('should clamp score to [0, 1] range for extreme inputs', () => {
      const extremeInput: ExpertiseScoreInput = {
        categoryResponseCount: 1000,
        avgQualityScore: 5.0,
        credentialBoostTotal: 10.0,
        daysSinceFirstResponse: 1000,
      };

      const score = service.calculateExpertiseScore(extremeInput);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle zero values correctly', () => {
      const zeroInput: ExpertiseScoreInput = {
        categoryResponseCount: 0,
        avgQualityScore: 0,
        credentialBoostTotal: 0,
        daysSinceFirstResponse: 0,
      };

      const score = service.calculateExpertiseScore(zeroInput);
      expect(score).toBe(0);
    });
  });

  describe('determineExpertiseLevel', () => {
    it('should return NOVICE for score 0.00-0.24', () => {
      expect(service.determineExpertiseLevel(0)).toBe('NOVICE');
      expect(service.determineExpertiseLevel(0.12)).toBe('NOVICE');
      expect(service.determineExpertiseLevel(0.24)).toBe('NOVICE');
    });

    it('should return FAMILIAR for score 0.25-0.49', () => {
      expect(service.determineExpertiseLevel(0.25)).toBe('FAMILIAR');
      expect(service.determineExpertiseLevel(0.37)).toBe('FAMILIAR');
      expect(service.determineExpertiseLevel(0.49)).toBe('FAMILIAR');
    });

    it('should return KNOWLEDGEABLE for score 0.50-0.74', () => {
      expect(service.determineExpertiseLevel(0.5)).toBe('KNOWLEDGEABLE');
      expect(service.determineExpertiseLevel(0.62)).toBe('KNOWLEDGEABLE');
      expect(service.determineExpertiseLevel(0.74)).toBe('KNOWLEDGEABLE');
    });

    it('should return EXPERT for score 0.75-1.00', () => {
      expect(service.determineExpertiseLevel(0.75)).toBe('EXPERT');
      expect(service.determineExpertiseLevel(0.87)).toBe('EXPERT');
      expect(service.determineExpertiseLevel(1.0)).toBe('EXPERT');
    });

    it('should handle boundary values correctly', () => {
      // Just below boundaries
      expect(service.determineExpertiseLevel(0.249)).toBe('NOVICE');
      expect(service.determineExpertiseLevel(0.499)).toBe('FAMILIAR');
      expect(service.determineExpertiseLevel(0.749)).toBe('KNOWLEDGEABLE');

      // At boundaries
      expect(service.determineExpertiseLevel(0.25)).toBe('FAMILIAR');
      expect(service.determineExpertiseLevel(0.5)).toBe('KNOWLEDGEABLE');
      expect(service.determineExpertiseLevel(0.75)).toBe('EXPERT');
    });
  });

  describe('getNextLevelThreshold', () => {
    it('should return 0.25 for NOVICE', () => {
      expect(service.getNextLevelThreshold('NOVICE')).toBe(0.25);
    });

    it('should return 0.50 for FAMILIAR', () => {
      expect(service.getNextLevelThreshold('FAMILIAR')).toBe(0.5);
    });

    it('should return 0.75 for KNOWLEDGEABLE', () => {
      expect(service.getNextLevelThreshold('KNOWLEDGEABLE')).toBe(0.75);
    });

    it('should return 1.0 for EXPERT (max level)', () => {
      expect(service.getNextLevelThreshold('EXPERT')).toBe(1.0);
    });
  });
});
