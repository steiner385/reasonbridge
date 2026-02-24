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

    describe('regulationName property', () => {
      it('should return COPPA for US', () => {
        const rules = service.getRegionalRules('US');

        expect(rules.regulationName).toBe('COPPA');
        expect(rules.consentAge).toBe(13);
        expect(rules.allowsDirectMessaging).toBe(false);
        expect(rules.requiresManualModeration).toBe(false);
      });

      it('should return AADC for GB with manual moderation required', () => {
        const rules = service.getRegionalRules('GB');

        expect(rules.regulationName).toBe('AADC');
        expect(rules.consentAge).toBe(13);
        expect(rules.requiresManualModeration).toBe(true);
      });

      it('should return OSA for AU with manual moderation required', () => {
        const rules = service.getRegionalRules('AU');

        expect(rules.regulationName).toBe('OSA');
        expect(rules.consentAge).toBe(13);
        expect(rules.requiresManualModeration).toBe(true);
      });

      it('should return GDPR for EU countries (DE)', () => {
        const rules = service.getRegionalRules('DE');

        expect(rules.regulationName).toBe('GDPR');
        expect(rules.dataRetentionDays).toBe(365);
      });

      it('should return GDPR for EU countries (FR)', () => {
        const rules = service.getRegionalRules('FR');

        expect(rules.regulationName).toBe('GDPR');
        expect(rules.dataRetentionDays).toBe(365);
      });

      it('should return PIPEDA for CA', () => {
        const rules = service.getRegionalRules('CA');

        expect(rules.regulationName).toBe('PIPEDA');
        expect(rules.consentAge).toBe(13);
      });

      it('should return DEFAULT for unknown countries', () => {
        const rules = service.getRegionalRules('XX');

        expect(rules.regulationName).toBe('DEFAULT');
      });
    });

    describe('full RegionalRules properties', () => {
      it('should include all required properties', () => {
        const rules = service.getRegionalRules('US');

        expect(rules).toHaveProperty('consentAge');
        expect(rules).toHaveProperty('requiresParentalConsent');
        expect(rules).toHaveProperty('privacyPolicyUrl');
        expect(rules).toHaveProperty('regulationName');
        expect(rules).toHaveProperty('allowsDirectMessaging');
        expect(rules).toHaveProperty('allowsProfileVisibility');
        expect(rules).toHaveProperty('requiresManualModeration');
        expect(rules).toHaveProperty('dataRetentionDays');
      });

      it('should default allowsDirectMessaging to false', () => {
        const rules = service.getRegionalRules('US');

        expect(rules.allowsDirectMessaging).toBe(false);
      });

      it('should default allowsProfileVisibility to false', () => {
        const rules = service.getRegionalRules('US');

        expect(rules.allowsProfileVisibility).toBe(false);
      });

      it('should have default dataRetentionDays of 730 (2 years)', () => {
        const rules = service.getRegionalRules('US');

        expect(rules.dataRetentionDays).toBe(730);
      });

      it('should have dataRetentionDays of 365 for GDPR countries', () => {
        const rules = service.getRegionalRules('DE');

        expect(rules.dataRetentionDays).toBe(365);
      });
    });
  });

  describe('getRegulationName', () => {
    it('should return COPPA for US', () => {
      expect(service.getRegulationName('US')).toBe('COPPA');
    });

    it('should return AADC for GB', () => {
      expect(service.getRegulationName('GB')).toBe('AADC');
    });

    it('should return OSA for AU', () => {
      expect(service.getRegulationName('AU')).toBe('OSA');
    });

    it('should return PIPEDA for CA', () => {
      expect(service.getRegulationName('CA')).toBe('PIPEDA');
    });

    it('should return GDPR for EU countries', () => {
      expect(service.getRegulationName('DE')).toBe('GDPR');
      expect(service.getRegulationName('FR')).toBe('GDPR');
      expect(service.getRegulationName('IT')).toBe('GDPR');
      expect(service.getRegulationName('ES')).toBe('GDPR');
      expect(service.getRegulationName('NL')).toBe('GDPR');
      expect(service.getRegulationName('BE')).toBe('GDPR');
    });

    it('should return DEFAULT for unknown countries', () => {
      expect(service.getRegulationName('XX')).toBe('DEFAULT');
      expect(service.getRegulationName('ZZ')).toBe('DEFAULT');
    });

    it('should handle lowercase country codes', () => {
      expect(service.getRegulationName('us')).toBe('COPPA');
      expect(service.getRegulationName('gb')).toBe('AADC');
    });
  });

  describe('isEUCountry', () => {
    it('should return true for EU member states', () => {
      expect(service.isEUCountry('DE')).toBe(true);
      expect(service.isEUCountry('FR')).toBe(true);
      expect(service.isEUCountry('IT')).toBe(true);
      expect(service.isEUCountry('ES')).toBe(true);
      expect(service.isEUCountry('NL')).toBe(true);
      expect(service.isEUCountry('BE')).toBe(true);
      expect(service.isEUCountry('AT')).toBe(true);
      expect(service.isEUCountry('SE')).toBe(true);
      expect(service.isEUCountry('PL')).toBe(true);
    });

    it('should return false for non-EU countries', () => {
      expect(service.isEUCountry('US')).toBe(false);
      expect(service.isEUCountry('GB')).toBe(false);
      expect(service.isEUCountry('AU')).toBe(false);
      expect(service.isEUCountry('CA')).toBe(false);
      expect(service.isEUCountry('JP')).toBe(false);
    });

    it('should return false for unknown countries', () => {
      expect(service.isEUCountry('XX')).toBe(false);
      expect(service.isEUCountry('ZZ')).toBe(false);
    });

    it('should handle lowercase country codes', () => {
      expect(service.isEUCountry('de')).toBe(true);
      expect(service.isEUCountry('us')).toBe(false);
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
