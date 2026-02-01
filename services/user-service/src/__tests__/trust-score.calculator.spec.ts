/**
 * Unit tests for TrustScoreCalculator
 *
 * Tests the Mayer's ABI Model (Ability, Benevolence, Integrity) implementation
 * for calculating user trust scores.
 *
 * @see services/user-service/src/services/trust-score.calculator.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma before importing the calculator
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    Prisma: {
      Decimal: MockDecimal,
    },
  };
});

// Import after mocking
import { TrustScoreCalculator } from '../services/trust-score.calculator.js';
import { TrustScoreUpdateDto } from '../users/dto/trust-score.dto.js';

/**
 * Mock User type for testing
 * Matches the essential fields from Prisma User model
 */
interface MockUser {
  id: string;
  email: string | null;
  displayName: string;
  cognitoSub: string;
  verificationLevel: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: Date;
  updatedAt: Date;
}

describe('TrustScoreCalculator', () => {
  let calculator: TrustScoreCalculator;

  beforeEach(() => {
    calculator = new TrustScoreCalculator();
    // Reset time mocking if any
    vi.useRealTimers();
  });

  /**
   * Helper to create a mock User entity with defaults
   */
  const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'TestUser',
    cognitoSub: 'cognito-sub-123',
    verificationLevel: 'BASIC',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    updatedAt: new Date(),
    ...overrides,
  });

  describe('calculateTrustScores', () => {
    describe('baseline scores', () => {
      it('should return scores for a new user with email', () => {
        const user = createMockUser({
          createdAt: new Date(), // Created now
        });

        const scores = calculator.calculateTrustScores(user as never);

        // Ability: 0.5 (base) + 0.05 (email) = 0.55
        expect(scores.ability).toBeCloseTo(0.55, 2);
        // Benevolence: 0.5 (base) for BASIC
        expect(scores.benevolence).toBeCloseTo(0.5, 2);
        // Integrity: 0.5 (base) for new account
        expect(scores.integrity).toBeCloseTo(0.5, 2);
      });

      it('should return lower ability score without email', () => {
        const user = createMockUser({
          email: null,
          createdAt: new Date(),
        });

        const scores = calculator.calculateTrustScores(user as never);

        // Ability: 0.5 (base) + 0 (no email) = 0.5
        expect(scores.ability).toBeCloseTo(0.5, 2);
      });
    });

    describe('account age bonus', () => {
      it('should increase ability and integrity with account age', () => {
        const newUser = createMockUser({
          createdAt: new Date(), // Created now
        });

        const oldUser = createMockUser({
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 365 days ago
        });

        const newScores = calculator.calculateTrustScores(newUser as never);
        const oldScores = calculator.calculateTrustScores(oldUser as never);

        // Old account should have higher ability (+0.15 age bonus)
        expect(oldScores.ability).toBeGreaterThan(newScores.ability);
        expect(oldScores.ability - newScores.ability).toBeCloseTo(0.15, 2);

        // Old account should have higher integrity (+0.15 age bonus)
        expect(oldScores.integrity).toBeGreaterThan(newScores.integrity);
        expect(oldScores.integrity - newScores.integrity).toBeCloseTo(0.15, 2);
      });

      it('should cap age bonus at 365 days', () => {
        const oneYearUser = createMockUser({
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        });

        const twoYearUser = createMockUser({
          createdAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
        });

        const oneYearScores = calculator.calculateTrustScores(oneYearUser as never);
        const twoYearScores = calculator.calculateTrustScores(twoYearUser as never);

        // Both should have the same age bonus (capped at 0.15)
        expect(oneYearScores.ability).toBeCloseTo(twoYearScores.ability, 2);
        expect(oneYearScores.integrity).toBeCloseTo(twoYearScores.integrity, 2);
      });

      it('should scale age bonus proportionally', () => {
        const halfYearUser = createMockUser({
          createdAt: new Date(Date.now() - 182.5 * 24 * 60 * 60 * 1000), // ~6 months
        });

        const scores = calculator.calculateTrustScores(halfYearUser as never);

        // Ability: 0.5 + 0.05 (email) + ~0.075 (half year) ≈ 0.625
        expect(scores.ability).toBeCloseTo(0.625, 1);
      });
    });

    describe('verification level bonuses', () => {
      it('should reward ENHANCED verification level', () => {
        const basicUser = createMockUser({ verificationLevel: 'BASIC' });
        const enhancedUser = createMockUser({ verificationLevel: 'ENHANCED' });

        const basicScores = calculator.calculateTrustScores(basicUser as never);
        const enhancedScores = calculator.calculateTrustScores(enhancedUser as never);

        // ENHANCED: +0.10 benevolence, +0.15 integrity
        expect(enhancedScores.benevolence - basicScores.benevolence).toBeCloseTo(0.1, 2);
        expect(enhancedScores.integrity - basicScores.integrity).toBeCloseTo(0.15, 2);
      });

      it('should reward VERIFIED_HUMAN verification level more than ENHANCED', () => {
        const enhancedUser = createMockUser({ verificationLevel: 'ENHANCED' });
        const verifiedUser = createMockUser({ verificationLevel: 'VERIFIED_HUMAN' });

        const enhancedScores = calculator.calculateTrustScores(enhancedUser as never);
        const verifiedScores = calculator.calculateTrustScores(verifiedUser as never);

        // VERIFIED_HUMAN gives +0.20 benevolence (vs +0.10 for ENHANCED)
        expect(verifiedScores.benevolence).toBeGreaterThan(enhancedScores.benevolence);
        expect(verifiedScores.benevolence - enhancedScores.benevolence).toBeCloseTo(0.1, 2);

        // VERIFIED_HUMAN gives +0.25 integrity (vs +0.15 for ENHANCED)
        expect(verifiedScores.integrity).toBeGreaterThan(enhancedScores.integrity);
        expect(verifiedScores.integrity - enhancedScores.integrity).toBeCloseTo(0.1, 2);
      });

      it('should calculate exact VERIFIED_HUMAN benevolence', () => {
        const verifiedUser = createMockUser({ verificationLevel: 'VERIFIED_HUMAN' });

        const scores = calculator.calculateTrustScores(verifiedUser as never);

        // Benevolence: 0.5 (base) + 0.2 (verified) = 0.7
        expect(scores.benevolence).toBe(0.7);
      });
    });

    describe('status penalties', () => {
      it('should penalize suspended accounts', () => {
        const activeUser = createMockUser({ status: 'ACTIVE' });
        const suspendedUser = createMockUser({ status: 'SUSPENDED' });

        const activeScores = calculator.calculateTrustScores(activeUser as never);
        const suspendedScores = calculator.calculateTrustScores(suspendedUser as never);

        // Suspended: -0.20 ability, -0.15 benevolence, -0.25 integrity
        expect(suspendedScores.ability).toBeLessThan(activeScores.ability);
        expect(suspendedScores.benevolence).toBeLessThan(activeScores.benevolence);
        expect(suspendedScores.integrity).toBeLessThan(activeScores.integrity);

        expect(activeScores.ability - suspendedScores.ability).toBeCloseTo(0.2, 2);
        expect(activeScores.benevolence - suspendedScores.benevolence).toBeCloseTo(0.15, 2);
        expect(activeScores.integrity - suspendedScores.integrity).toBeCloseTo(0.25, 2);
      });

      it('should heavily penalize banned accounts', () => {
        const activeUser = createMockUser({ status: 'ACTIVE' });
        const bannedUser = createMockUser({ status: 'BANNED' });

        const activeScores = calculator.calculateTrustScores(activeUser as never);
        const bannedScores = calculator.calculateTrustScores(bannedUser as never);

        // Banned: -0.30 ability, -0.25 benevolence, -0.40 integrity
        expect(activeScores.ability - bannedScores.ability).toBeCloseTo(0.3, 2);
        expect(activeScores.benevolence - bannedScores.benevolence).toBeCloseTo(0.25, 2);
        expect(activeScores.integrity - bannedScores.integrity).toBeCloseTo(0.4, 2);
      });

      it('should penalize banned more than suspended', () => {
        const suspendedUser = createMockUser({ status: 'SUSPENDED' });
        const bannedUser = createMockUser({ status: 'BANNED' });

        const suspendedScores = calculator.calculateTrustScores(suspendedUser as never);
        const bannedScores = calculator.calculateTrustScores(bannedUser as never);

        expect(bannedScores.ability).toBeLessThan(suspendedScores.ability);
        expect(bannedScores.benevolence).toBeLessThan(suspendedScores.benevolence);
        expect(bannedScores.integrity).toBeLessThan(suspendedScores.integrity);
      });
    });

    describe('score clamping', () => {
      it('should clamp all scores to [0, 1] range', () => {
        // Banned user with minimal factors - could go negative without clamping
        const bannedUser = createMockUser({
          status: 'BANNED',
          email: null,
          createdAt: new Date(), // New account
        });

        const scores = calculator.calculateTrustScores(bannedUser as never);

        expect(scores.ability).toBeGreaterThanOrEqual(0);
        expect(scores.ability).toBeLessThanOrEqual(1);
        expect(scores.benevolence).toBeGreaterThanOrEqual(0);
        expect(scores.benevolence).toBeLessThanOrEqual(1);
        expect(scores.integrity).toBeGreaterThanOrEqual(0);
        expect(scores.integrity).toBeLessThanOrEqual(1);
      });

      it('should clamp high scores at 1', () => {
        // Verified user with max age bonus
        const maxUser = createMockUser({
          verificationLevel: 'VERIFIED_HUMAN',
          createdAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), // 2 years
        });

        const scores = calculator.calculateTrustScores(maxUser as never);

        // Integrity would be 0.5 + 0.25 + 0.15 = 0.9 (within bounds)
        expect(scores.integrity).toBeLessThanOrEqual(1);
        expect(scores.integrity).toBeCloseTo(0.9, 2);
      });
    });

    describe('formula consistency', () => {
      it('should calculate ability as base + email + age - penalty', () => {
        const user = createMockUser({
          email: 'test@example.com',
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        });

        const scores = calculator.calculateTrustScores(user as never);

        // Ability = 0.5 (base) + 0.05 (email) + 0.15 (1 year age) = 0.7
        expect(scores.ability).toBeCloseTo(0.7, 2);
      });

      it('should calculate benevolence based on verification level', () => {
        const basicUser = createMockUser({ verificationLevel: 'BASIC' });
        const enhancedUser = createMockUser({ verificationLevel: 'ENHANCED' });
        const verifiedUser = createMockUser({ verificationLevel: 'VERIFIED_HUMAN' });

        expect(calculator.calculateTrustScores(basicUser as never).benevolence).toBe(0.5);
        expect(calculator.calculateTrustScores(enhancedUser as never).benevolence).toBe(0.6);
        expect(calculator.calculateTrustScores(verifiedUser as never).benevolence).toBe(0.7);
      });

      it('should calculate integrity as base + verification + age', () => {
        const user = createMockUser({
          verificationLevel: 'VERIFIED_HUMAN',
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        });

        const scores = calculator.calculateTrustScores(user as never);

        // Integrity = 0.5 (base) + 0.25 (verified) + 0.15 (age) = 0.9
        expect(scores.integrity).toBe(0.9);
      });
    });
  });

  describe('TrustScoresDto methods', () => {
    it('should calculate overall score correctly', () => {
      const user = createMockUser();
      const scores = calculator.calculateTrustScores(user as never);

      const overall = scores.getOverallScore();
      const expected = (scores.ability + scores.benevolence + scores.integrity) / 3;

      expect(overall).toBeCloseTo(expected, 5);
    });

    it('should identify trustworthy users (overall >= 0.6)', () => {
      const verifiedUser = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      });

      const scores = calculator.calculateTrustScores(verifiedUser as never);

      expect(scores.isTrustworthy()).toBe(true);
    });

    it('should identify untrustworthy new basic users', () => {
      const newUser = createMockUser({
        verificationLevel: 'BASIC',
        createdAt: new Date(),
      });

      const scores = calculator.calculateTrustScores(newUser as never);

      expect(scores.isTrustworthy()).toBe(false);
    });

    it('should return correct trust levels', () => {
      // High (>= 0.6) - VERIFIED_HUMAN with 1 year age
      // Overall = (0.7 ability + 0.7 benevolence + 0.9 integrity) / 3 = 0.767
      const verifiedOldUser = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });
      expect(calculator.calculateTrustScores(verifiedOldUser as never).getTrustLevel()).toBe(
        'high',
      );

      // High (>= 0.6) - VERIFIED_HUMAN new user
      // Overall = (0.55 + 0.7 + 0.75) / 3 = 0.667
      const verifiedNewUser = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
        createdAt: new Date(),
      });
      expect(calculator.calculateTrustScores(verifiedNewUser as never).getTrustLevel()).toBe(
        'high',
      );

      // Medium (>= 0.4) - BASIC new user
      // Overall = (0.55 + 0.5 + 0.5) / 3 = 0.517
      const basicUser = createMockUser({
        verificationLevel: 'BASIC',
        createdAt: new Date(),
      });
      expect(calculator.calculateTrustScores(basicUser as never).getTrustLevel()).toBe('medium');

      // Low (>= 0.2) - Suspended BASIC user
      // Significantly penalized
      const suspendedUser = createMockUser({
        verificationLevel: 'BASIC',
        status: 'SUSPENDED',
        createdAt: new Date(),
      });
      expect(calculator.calculateTrustScores(suspendedUser as never).getTrustLevel()).toBe('low');
    });

    it('should convert to percentages correctly', () => {
      const user = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });

      const scores = calculator.calculateTrustScores(user as never);
      const percentages = scores.toPercentages();

      expect(percentages.ability).toBe(70); // 0.7 * 100
      expect(percentages.benevolence).toBe(70); // 0.7 * 100
      expect(percentages.integrity).toBe(90); // 0.9 * 100
      expect(percentages.overall).toBe(77); // (0.7 + 0.7 + 0.9) / 3 * 100 ≈ 76.67 -> 77
    });
  });

  describe('mergeScores', () => {
    it('should preserve existing values when no update provided', () => {
      const existing = { ability: 0.7, benevolence: 0.6, integrity: 0.8 };
      const update: TrustScoreUpdateDto = {
        ability: undefined,
        benevolence: undefined,
        integrity: undefined,
      };

      const merged = calculator.mergeScores(existing, update);

      expect(merged.ability).toBe(0.7);
      expect(merged.benevolence).toBe(0.6);
      expect(merged.integrity).toBe(0.8);
    });

    it('should update only provided dimensions', () => {
      const existing = { ability: 0.7, benevolence: 0.6, integrity: 0.8 };
      const update: TrustScoreUpdateDto = {
        ability: 0.5,
        benevolence: undefined,
        integrity: undefined,
      };

      const merged = calculator.mergeScores(existing, update);

      expect(merged.ability).toBe(0.5);
      expect(merged.benevolence).toBe(0.6);
      expect(merged.integrity).toBe(0.8);
    });

    it('should handle all dimensions being updated', () => {
      const existing = { ability: 0.7, benevolence: 0.6, integrity: 0.8 };
      const update: TrustScoreUpdateDto = {
        ability: 0.5,
        benevolence: 0.4,
        integrity: 0.3,
      };

      const merged = calculator.mergeScores(existing, update);

      expect(merged.ability).toBe(0.5);
      expect(merged.benevolence).toBe(0.4);
      expect(merged.integrity).toBe(0.3);
    });
  });

  describe('decimalToNumber', () => {
    it('should pass through numeric values unchanged', () => {
      const result = calculator.decimalToNumber(0.75);

      expect(result).toBe(0.75);
    });

    it('should convert Decimal-like objects to numbers', () => {
      const mockDecimal = { toNumber: () => 0.75 };
      const result = calculator.decimalToNumber(mockDecimal as never);

      expect(result).toBe(0.75);
    });
  });

  describe('numberToDecimal', () => {
    it('should round to 2 decimal places', () => {
      const result = calculator.numberToDecimal(0.7567);

      expect(result.toNumber()).toBe(0.76);
    });

    it('should round down correctly', () => {
      const result = calculator.numberToDecimal(0.7534);

      expect(result.toNumber()).toBe(0.75);
    });

    it('should handle edge values', () => {
      expect(calculator.numberToDecimal(0).toNumber()).toBe(0);
      expect(calculator.numberToDecimal(1).toNumber()).toBe(1);
      expect(calculator.numberToDecimal(0.005).toNumber()).toBe(0.01);
    });
  });
});
