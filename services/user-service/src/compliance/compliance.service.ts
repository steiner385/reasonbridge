/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

/**
 * Regulation name type for compliance tracking
 */
export type RegulationName = 'COPPA' | 'GDPR' | 'AADC' | 'OSA' | 'PIPEDA' | 'DEFAULT';

/**
 * Regional compliance rules for child safety
 */
export interface RegionalRules {
  /** Minimum age for data collection without parental consent */
  consentAge: number;
  /** Whether parental consent is required for users under consent age */
  requiresParentalConsent: boolean;
  /** URL to regional privacy policy */
  privacyPolicyUrl: string;
  /** Name of the applicable regulation */
  regulationName: RegulationName;
  /** Whether direct messaging is allowed for minors */
  allowsDirectMessaging: boolean;
  /** Whether profile visibility is allowed for minors */
  allowsProfileVisibility: boolean;
  /** Whether manual moderation is required for minor content */
  requiresManualModeration: boolean;
  /** Number of days to retain user data */
  dataRetentionDays: number;
}

/**
 * Service for handling regional compliance rules (COPPA, GDPR Article 8, UK AADC)
 *
 * @remarks
 * This service provides compliance information based on user's declared country.
 * It handles:
 * - COPPA (US): Age 13
 * - GDPR Article 8 (EU): Default 16, member states can lower to 13
 * - UK AADC: Age 13 for consent (full protection until 18)
 * - Australian Privacy Act: Age 13
 */
@Injectable()
export class ComplianceService {
  /**
   * EU member state country codes for GDPR applicability
   */
  private readonly EU_COUNTRIES: ReadonlySet<string> = new Set([
    'AT', // Austria
    'BE', // Belgium
    'BG', // Bulgaria
    'HR', // Croatia
    'CY', // Cyprus
    'CZ', // Czech Republic
    'DK', // Denmark
    'EE', // Estonia
    'FI', // Finland
    'FR', // France
    'DE', // Germany
    'GR', // Greece
    'HU', // Hungary
    'IE', // Ireland
    'IT', // Italy
    'LV', // Latvia
    'LT', // Lithuania
    'LU', // Luxembourg
    'MT', // Malta
    'NL', // Netherlands
    'PL', // Poland
    'PT', // Portugal
    'RO', // Romania
    'SK', // Slovakia
    'SI', // Slovenia
    'ES', // Spain
    'SE', // Sweden
  ]);

  /**
   * Regional consent ages based on applicable laws
   * Key: ISO 3166-1 alpha-2 country code
   * Value: Minimum age for independent consent
   */
  private readonly CONSENT_AGES: Record<string, number> = {
    // COPPA (United States)
    US: 13,

    // UK Age Appropriate Design Code (AADC)
    GB: 13,

    // Australia
    AU: 13,

    // EU GDPR Article 8 - member states
    // Default is 16, but states can lower to 13
    DE: 16, // Germany
    FR: 16, // France
    IT: 16, // Italy
    NL: 16, // Netherlands
    PL: 16, // Poland
    ES: 14, // Spain (lowered to 14)
    BE: 13, // Belgium (lowered to 13)
    AT: 14, // Austria (lowered to 14)
    SE: 13, // Sweden (lowered to 13)
    DK: 13, // Denmark (lowered to 13)
    FI: 13, // Finland (lowered to 13)
    IE: 16, // Ireland
    PT: 13, // Portugal (lowered to 13)
    GR: 15, // Greece (lowered to 15)
    CZ: 15, // Czech Republic (lowered to 15)
    HU: 16, // Hungary
    RO: 16, // Romania
    BG: 14, // Bulgaria (lowered to 14)
    SK: 16, // Slovakia
    HR: 16, // Croatia
    SI: 16, // Slovenia
    LT: 14, // Lithuania (lowered to 14)
    LV: 13, // Latvia (lowered to 13)
    EE: 13, // Estonia (lowered to 13)
    CY: 14, // Cyprus (lowered to 14)
    LU: 16, // Luxembourg
    MT: 13, // Malta (lowered to 13)

    // Other countries
    CA: 13, // Canada (PIPEDA)
    NZ: 13, // New Zealand
    JP: 16, // Japan
    KR: 14, // South Korea
    BR: 12, // Brazil (LGPD - age 12 with parental consent)
    MX: 14, // Mexico

    // Default for unlisted countries (most restrictive common age)
    DEFAULT: 16,
  };

  /**
   * Get regional compliance rules for a country
   *
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'DE')
   * @returns Regional rules including consent age, regulation name, and compliance properties
   */
  getRegionalRules(countryCode: string): RegionalRules {
    const normalizedCode = countryCode.toUpperCase();
    const consentAge = this.CONSENT_AGES[normalizedCode] ?? 16;
    const regulationName = this.getRegulationName(normalizedCode);

    // Base defaults for child safety - DMs and profile visibility are always disabled for minors
    const allowsDirectMessaging = false;
    const allowsProfileVisibility = false;
    let requiresManualModeration = false;
    let dataRetentionDays = 730; // 2 years default

    // Override for specific regulations
    if (regulationName === 'AADC' || regulationName === 'OSA') {
      requiresManualModeration = true;
    }

    if (regulationName === 'GDPR') {
      dataRetentionDays = 365; // GDPR requires shorter retention
    }

    return {
      consentAge,
      requiresParentalConsent: true, // Always required for minors under consent age
      privacyPolicyUrl: `/privacy/${normalizedCode.toLowerCase()}`,
      regulationName,
      allowsDirectMessaging,
      allowsProfileVisibility,
      requiresManualModeration,
      dataRetentionDays,
    };
  }

  /**
   * Calculate age from birth date
   *
   * @param birthDate - User's date of birth
   * @returns Age in years
   *
   * @remarks
   * Uses precise age calculation accounting for:
   * - Month differences
   * - Day differences within the same month
   * - Leap years are handled correctly by JavaScript Date
   */
  calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Check if a user is considered a minor in their region
   *
   * @param birthDate - User's date of birth
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns true if user is under the regional consent age
   */
  isMinor(birthDate: Date, countryCode: string): boolean {
    const age = this.calculateAge(birthDate);
    const rules = this.getRegionalRules(countryCode);
    return age < rules.consentAge;
  }

  /**
   * Check if parental consent is required for a user
   *
   * @param birthDate - User's date of birth
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns true if parental consent is required
   *
   * @remarks
   * Parental consent is required when:
   * - User is under the regional consent age
   * - The region has parental consent requirements (all do currently)
   */
  requiresParentalConsent(birthDate: Date, countryCode: string): boolean {
    return this.isMinor(birthDate, countryCode);
  }

  /**
   * Get the consent age for a specific country
   *
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Consent age for the country (defaults to 16 if unknown)
   */
  getConsentAge(countryCode: string): number {
    const normalizedCode = countryCode.toUpperCase();
    return this.CONSENT_AGES[normalizedCode] ?? 16;
  }

  /**
   * Get the regulation name for a country
   *
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns The applicable regulation name (COPPA, GDPR, AADC, OSA, PIPEDA, or DEFAULT)
   */
  getRegulationName(countryCode: string): RegulationName {
    const normalizedCode = countryCode.toUpperCase();

    if (normalizedCode === 'US') {
      return 'COPPA';
    }

    if (normalizedCode === 'GB') {
      return 'AADC';
    }

    if (normalizedCode === 'AU') {
      return 'OSA';
    }

    if (normalizedCode === 'CA') {
      return 'PIPEDA';
    }

    if (this.isEUCountry(normalizedCode)) {
      return 'GDPR';
    }

    return 'DEFAULT';
  }

  /**
   * Check if a country is an EU member state
   *
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns true if the country is an EU member state
   */
  isEUCountry(countryCode: string): boolean {
    const normalizedCode = countryCode.toUpperCase();
    return this.EU_COUNTRIES.has(normalizedCode);
  }

  /**
   * Get list of supported country codes
   *
   * @returns Array of ISO 3166-1 alpha-2 country codes
   */
  getSupportedCountries(): string[] {
    return Object.keys(this.CONSENT_AGES).filter((code) => code !== 'DEFAULT');
  }
}
