/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from '../compliance.service.js';

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = new ComplianceService();
  });

  describe('calculateAge', () => {
    it('should calculate age correctly for a date in the past', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2000-01-01');
      const age = service.calculateAge(birthDate);

      expect(age).toBe(26);

      vi.useRealTimers();
    });

    it('should handle birthdays that have not occurred yet this year', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2000-12-15');
      const age = service.calculateAge(birthDate);

      expect(age).toBe(25);

      vi.useRealTimers();
    });

    it('should handle exact birthday', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2000-02-09');
      const age = service.calculateAge(birthDate);

      expect(age).toBe(26);

      vi.useRealTimers();
    });

    it('should handle leap year birthdays correctly', () => {
      const now = new Date('2026-03-01');
      vi.setSystemTime(now);

      const birthDate = new Date('2000-02-29');
      const age = service.calculateAge(birthDate);

      expect(age).toBe(26);

      vi.useRealTimers();
    });

    it('should return 0 for a baby born this year', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2026-01-01');
      const age = service.calculateAge(birthDate);

      expect(age).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('getRegionalRules', () => {
    it('should return US consent age of 13 (COPPA)', () => {
      const rules = service.getRegionalRules('US');

      expect(rules.consentAge).toBe(13);
      expect(rules.requiresParentalConsent).toBe(true);
    });

    it('should return UK consent age of 13 (AADC)', () => {
      const rules = service.getRegionalRules('GB');

      expect(rules.consentAge).toBe(13);
    });

    it('should return German consent age of 16 (GDPR)', () => {
      const rules = service.getRegionalRules('DE');

      expect(rules.consentAge).toBe(16);
    });

    it('should return Spanish consent age of 14', () => {
      const rules = service.getRegionalRules('ES');

      expect(rules.consentAge).toBe(14);
    });

    it('should handle lowercase country codes', () => {
      const rules = service.getRegionalRules('us');

      expect(rules.consentAge).toBe(13);
    });

    it('should return default consent age of 16 for unknown countries', () => {
      const rules = service.getRegionalRules('XX');

      expect(rules.consentAge).toBe(16);
    });
  });

  describe('isMinor', () => {
    it('should return true for a 10-year-old in the US', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2016-01-01');
      const isMinor = service.isMinor(birthDate, 'US');

      expect(isMinor).toBe(true);

      vi.useRealTimers();
    });

    it('should return false for a 25-year-old in the US', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2000-01-01');
      const isMinor = service.isMinor(birthDate, 'US');

      expect(isMinor).toBe(false);

      vi.useRealTimers();
    });

    it('should return true for a 15-year-old in Germany', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2011-01-01');
      const isMinor = service.isMinor(birthDate, 'DE');

      expect(isMinor).toBe(true);

      vi.useRealTimers();
    });

    it('should return false for a 15-year-old in Belgium', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2011-01-01');
      const isMinor = service.isMinor(birthDate, 'BE');

      expect(isMinor).toBe(false);

      vi.useRealTimers();
    });

    it('should handle exactly at consent age', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2013-02-09');
      const isMinor = service.isMinor(birthDate, 'US');

      expect(isMinor).toBe(false);

      vi.useRealTimers();
    });

    it('should handle day before consent age', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2013-02-10');
      const isMinor = service.isMinor(birthDate, 'US');

      expect(isMinor).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('requiresParentalConsent', () => {
    it('should require consent for minors', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2016-01-01');
      const requiresConsent = service.requiresParentalConsent(birthDate, 'US');

      expect(requiresConsent).toBe(true);

      vi.useRealTimers();
    });

    it('should not require consent for adults', () => {
      const now = new Date('2026-02-09');
      vi.setSystemTime(now);

      const birthDate = new Date('2000-01-01');
      const requiresConsent = service.requiresParentalConsent(birthDate, 'US');

      expect(requiresConsent).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('getConsentAge', () => {
    it('should return consent age for known countries', () => {
      expect(service.getConsentAge('US')).toBe(13);
      expect(service.getConsentAge('GB')).toBe(13);
      expect(service.getConsentAge('DE')).toBe(16);
      expect(service.getConsentAge('FR')).toBe(16);
      expect(service.getConsentAge('ES')).toBe(14);
      expect(service.getConsentAge('BE')).toBe(13);
    });

    it('should return 16 for unknown countries', () => {
      expect(service.getConsentAge('ZZ')).toBe(16);
    });
  });

  describe('getSupportedCountries', () => {
    it('should return a non-empty array of country codes', () => {
      const countries = service.getSupportedCountries();

      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should include major countries', () => {
      const countries = service.getSupportedCountries();

      expect(countries).toContain('US');
      expect(countries).toContain('GB');
      expect(countries).toContain('DE');
      expect(countries).toContain('FR');
    });

    it('should not include DEFAULT', () => {
      const countries = service.getSupportedCountries();

      expect(countries).not.toContain('DEFAULT');
    });
  });
});
