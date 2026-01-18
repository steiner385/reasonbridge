import { describe, it, expect, beforeEach } from 'vitest';
import { TrustScoreCalculator } from './trust-score.calculator.js';
import type { User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library.js';
import { TrustScoreUpdateDto } from '../users/dto/trust-score.dto.js';

describe('TrustScoreCalculator', () => {
  let calculator: TrustScoreCalculator;

  beforeEach(() => {
    calculator = new TrustScoreCalculator();
  });

  /**
   * Helper to create a mock User entity
   */
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'TestUser',
    cognitoSub: 'cognito-sub-123',
    verificationLevel: 'BASIC',
    trustScoreAbility: new Decimal('0.50'),
    trustScoreBenevolence: new Decimal('0.50'),
    trustScoreIntegrity: new Decimal('0.50'),
    moralFoundationProfile: null,
    positionFingerprint: null,
    topicAffinities: null,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    updatedAt: new Date(),
    ...overrides,
  });

  describe('calculateTrustScores', () => {
    it('should return default scores for new user', () => {
      const user = createMockUser({
        createdAt: new Date(), // Created now
      });

      const scores = calculator.calculateTrustScores(user);

      expect(scores.ability).toBeGreaterThan(0.5);
      expect(scores.ability).toBeLessThanOrEqual(0.75); // Max with email + new
      expect(scores.benevolence).toBe(0.5); // No enhancement for BASIC
      expect(scores.integrity).toBeGreaterThan(0.5);
    });

    it('should increase scores with account age', () => {
      const newUser = createMockUser({
        createdAt: new Date(), // Created now
      });

      const oldUser = createMockUser({
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 365 days ago
      });

      const newScores = calculator.calculateTrustScores(newUser);
      const oldScores = calculator.calculateTrustScores(oldUser);

      expect(oldScores.ability).toBeGreaterThan(newScores.ability);
      expect(oldScores.integrity).toBeGreaterThan(newScores.integrity);
    });

    it('should reward ENHANCED verification level', () => {
      const basicUser = createMockUser({
        verificationLevel: 'BASIC',
      });

      const enhancedUser = createMockUser({
        verificationLevel: 'ENHANCED',
      });

      const basicScores = calculator.calculateTrustScores(basicUser);
      const enhancedScores = calculator.calculateTrustScores(enhancedUser);

      expect(enhancedScores.benevolence).toBeGreaterThan(basicScores.benevolence);
      expect(enhancedScores.integrity).toBeGreaterThan(basicScores.integrity);
    });

    it('should heavily reward VERIFIED_HUMAN verification level', () => {
      const basicUser = createMockUser({
        verificationLevel: 'BASIC',
      });

      const enhancedUser = createMockUser({
        verificationLevel: 'ENHANCED',
      });

      const verifiedUser = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
      });

      const basicScores = calculator.calculateTrustScores(basicUser);
      const enhancedScores = calculator.calculateTrustScores(enhancedUser);
      const verifiedScores = calculator.calculateTrustScores(verifiedUser);

      expect(verifiedScores.benevolence).toBeGreaterThan(enhancedScores.benevolence);
      expect(verifiedScores.integrity).toBeGreaterThan(basicScores.integrity + 0.2);
      expect(verifiedScores.benevolence).toBeGreaterThan(enhancedScores.benevolence);
    });

    it('should penalize suspended accounts', () => {
      const activeUser = createMockUser({
        status: 'ACTIVE',
        verificationLevel: 'VERIFIED_HUMAN',
      });

      const suspendedUser = createMockUser({
        status: 'SUSPENDED',
        verificationLevel: 'VERIFIED_HUMAN',
      });

      const activeScores = calculator.calculateTrustScores(activeUser);
      const suspendedScores = calculator.calculateTrustScores(suspendedUser);

      expect(suspendedScores.ability).toBeLessThan(activeScores.ability);
      expect(suspendedScores.benevolence).toBeLessThan(activeScores.benevolence);
      expect(suspendedScores.integrity).toBeLessThan(activeScores.integrity);
    });

    it('should heavily penalize banned accounts', () => {
      const activeUser = createMockUser({
        status: 'ACTIVE',
        verificationLevel: 'VERIFIED_HUMAN',
      });

      const bannedUser = createMockUser({
        status: 'BANNED',
        verificationLevel: 'VERIFIED_HUMAN',
      });

      const activeScores = calculator.calculateTrustScores(activeUser);
      const bannedScores = calculator.calculateTrustScores(bannedUser);

      expect(bannedScores.ability).toBeLessThan(activeScores.ability);
      expect(bannedScores.benevolence).toBeLessThan(activeScores.benevolence);
      expect(bannedScores.integrity).toBeLessThan(activeScores.integrity);

      // Banned scores should be significantly lower
      expect(bannedScores.integrity).toBeLessThan(0.3);
    });

    it('should clamp all scores to [0, 1] range', () => {
      const user = createMockUser({
        status: 'BANNED',
      });

      const scores = calculator.calculateTrustScores(user);

      expect(scores.ability).toBeGreaterThanOrEqual(0);
      expect(scores.ability).toBeLessThanOrEqual(1);
      expect(scores.benevolence).toBeGreaterThanOrEqual(0);
      expect(scores.benevolence).toBeLessThanOrEqual(1);
      expect(scores.integrity).toBeGreaterThanOrEqual(0);
      expect(scores.integrity).toBeLessThanOrEqual(1);
    });

    it('should handle user without email gracefully', () => {
      const user = createMockUser({
        email: '',
      });

      const scores = calculator.calculateTrustScores(user);

      expect(scores.ability).toBeLessThanOrEqual(0.65); // No email bonus
      expect(scores).toBeDefined();
    });

    it('should calculate overall score correctly', () => {
      const user = createMockUser();
      const scores = calculator.calculateTrustScores(user);

      const overall = scores.getOverallScore();
      const expected = (scores.ability + scores.benevolence + scores.integrity) / 3;

      expect(overall).toBeCloseTo(expected, 5);
    });

    it('should identify trustworthy users (>= 0.6)', () => {
      const verifiedUser = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days old
      });

      const scores = calculator.calculateTrustScores(verifiedUser);
      expect(scores.isTrustworthy()).toBe(true);
    });

    it('should identify untrustworthy new user', () => {
      const newUser = createMockUser({
        verificationLevel: 'BASIC',
        createdAt: new Date(), // Created now
      });

      const scores = calculator.calculateTrustScores(newUser);
      // New unverified user should have overall score < 0.6
      expect(scores.isTrustworthy()).toBe(false);
    });

    it('should return proper trust level strings', () => {
      const levels = ['very_low', 'low', 'medium', 'high', 'very_high'];

      const user = createMockUser();
      const scores = calculator.calculateTrustScores(user);
      const level = scores.getTrustLevel();

      expect(levels).toContain(level);
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
      expect(merged.benevolence).toBe(0.6); // Unchanged
      expect(merged.integrity).toBe(0.8); // Unchanged
    });

    it('should handle multiple updates', () => {
      const existing = { ability: 0.7, benevolence: 0.6, integrity: 0.8 };
      const update: TrustScoreUpdateDto = {
        ability: 0.5,
        benevolence: 0.4,
        integrity: undefined,
      };

      const merged = calculator.mergeScores(existing, update);

      expect(merged.ability).toBe(0.5);
      expect(merged.benevolence).toBe(0.4);
      expect(merged.integrity).toBe(0.8); // Unchanged
    });
  });

  describe('decimalToNumber', () => {
    it('should convert Decimal to number', () => {
      const decimal = new Decimal('0.75');
      const result = calculator.decimalToNumber(decimal);

      expect(typeof result).toBe('number');
      expect(result).toBe(0.75);
    });

    it('should pass through already numeric values', () => {
      const result = calculator.decimalToNumber(0.75);

      expect(result).toBe(0.75);
    });

    it('should handle Decimal with many places', () => {
      const decimal = new Decimal('0.123456789');
      const result = calculator.decimalToNumber(decimal);

      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(0.123456789, 9);
    });
  });

  describe('numberToDecimal', () => {
    it('should convert number to Decimal', () => {
      const result = calculator.numberToDecimal(0.75);

      expect(result).toBeInstanceOf(Decimal);
      expect(result.toNumber()).toBe(0.75);
    });

    it('should round to 2 decimal places for storage', () => {
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

  describe('score formulas consistency', () => {
    it('ability dimension factors should be consistent with documentation', () => {
      // Verified human user with 1 year of account age
      const user = createMockUser({
        email: 'verified@example.com',
        verificationLevel: 'VERIFIED_HUMAN',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });

      const scores = calculator.calculateTrustScores(user);

      // Ability = 0.5 (base) + 0.05 (email) + 0.15 (age) = 0.7
      expect(scores.ability).toBe(0.7);
    });

    it('benevolence dimension should reflect verification level', () => {
      const basicUser = createMockUser({ verificationLevel: 'BASIC' });
      const enhancedUser = createMockUser({ verificationLevel: 'ENHANCED' });
      const verifiedUser = createMockUser({ verificationLevel: 'VERIFIED_HUMAN' });

      const basicScores = calculator.calculateTrustScores(basicUser);
      const enhancedScores = calculator.calculateTrustScores(enhancedUser);
      const verifiedScores = calculator.calculateTrustScores(verifiedUser);

      // VERIFIED_HUMAN gives +0.2 benevolence
      // ENHANCED gives +0.1 benevolence
      // BASIC gives 0 benevolence bonus
      expect(verifiedScores.benevolence).toBe(0.7); // 0.5 + 0.2
      expect(enhancedScores.benevolence).toBe(0.6); // 0.5 + 0.1
      expect(basicScores.benevolence).toBe(0.5); // 0.5 + 0
    });

    it('integrity dimension should combine verification and age', () => {
      const user = createMockUser({
        verificationLevel: 'VERIFIED_HUMAN',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });

      const scores = calculator.calculateTrustScores(user);

      // Integrity = 0.5 (base) + 0.25 (verified) + 0.15 (age) = 0.9
      expect(scores.integrity).toBe(0.9);
    });
  });
});
