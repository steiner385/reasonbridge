/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingCalculatorService } from '../ranking-calculator.service.js';

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
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
  };
});

describe('RankingCalculatorService', () => {
  let service: RankingCalculatorService;

  beforeEach(() => {
    service = new RankingCalculatorService();
  });

  describe('calculateCompositeScore', () => {
    it('should return score between 0 and 1', () => {
      const input = {
        trustAverage: 0.5,
        verificationLevel: 'BASIC' as const,
        engagementScore: 0.3,
        qualityScore: 0.4,
        accountAgeDays: 100,
      };

      const score = service.calculateCompositeScore(input);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should weight trust at 40%', () => {
      const base = {
        verificationLevel: 'BASIC' as const,
        engagementScore: 0,
        qualityScore: 0,
        accountAgeDays: 0,
      };

      const lowTrust = service.calculateCompositeScore({ ...base, trustAverage: 0 });
      const highTrust = service.calculateCompositeScore({ ...base, trustAverage: 1 });

      expect(highTrust - lowTrust).toBeCloseTo(0.4, 2);
    });

    it('should weight verification at 20%', () => {
      const base = {
        trustAverage: 0,
        engagementScore: 0,
        qualityScore: 0,
        accountAgeDays: 0,
      };

      const basic = service.calculateCompositeScore({ ...base, verificationLevel: 'BASIC' });
      const verified = service.calculateCompositeScore({
        ...base,
        verificationLevel: 'VERIFIED_HUMAN',
      });

      // BASIC = 0.2, VERIFIED_HUMAN = 1.0 -> difference = 0.8 * 0.2 = 0.16
      expect(verified - basic).toBeCloseTo(0.16, 2);
    });

    it('should clamp score to [0, 1] range', () => {
      const extremeInput = {
        trustAverage: 2,
        verificationLevel: 'VERIFIED_HUMAN' as const,
        engagementScore: 2,
        qualityScore: 2,
        accountAgeDays: 1000,
      };

      const score = service.calculateCompositeScore(extremeInput);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('determineTierLevel', () => {
    it('should return NEWCOMER for score 0-0.19', () => {
      expect(service.determineTierLevel(0)).toBe('NEWCOMER');
      expect(service.determineTierLevel(0.19)).toBe('NEWCOMER');
    });

    it('should return CONTRIBUTOR for score 0.20-0.39', () => {
      expect(service.determineTierLevel(0.2)).toBe('CONTRIBUTOR');
      expect(service.determineTierLevel(0.39)).toBe('CONTRIBUTOR');
    });

    it('should return TRUSTED for score 0.40-0.59', () => {
      expect(service.determineTierLevel(0.4)).toBe('TRUSTED');
      expect(service.determineTierLevel(0.59)).toBe('TRUSTED');
    });

    it('should return LEADER for score 0.60-0.79', () => {
      expect(service.determineTierLevel(0.6)).toBe('LEADER');
      expect(service.determineTierLevel(0.79)).toBe('LEADER');
    });

    it('should return EXPERT for score 0.80-1.00', () => {
      expect(service.determineTierLevel(0.8)).toBe('EXPERT');
      expect(service.determineTierLevel(1.0)).toBe('EXPERT');
    });
  });

  describe('getNextTierThreshold', () => {
    it('should return 0.20 for NEWCOMER', () => {
      expect(service.getNextTierThreshold('NEWCOMER')).toBe(0.2);
    });

    it('should return 0.40 for CONTRIBUTOR', () => {
      expect(service.getNextTierThreshold('CONTRIBUTOR')).toBe(0.4);
    });

    it('should return 0.60 for TRUSTED', () => {
      expect(service.getNextTierThreshold('TRUSTED')).toBe(0.6);
    });

    it('should return 0.80 for LEADER', () => {
      expect(service.getNextTierThreshold('LEADER')).toBe(0.8);
    });

    it('should return 1.0 for EXPERT (max tier)', () => {
      expect(service.getNextTierThreshold('EXPERT')).toBe(1.0);
    });
  });
});
