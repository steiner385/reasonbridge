/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComplianceService, type RegionalRules } from './compliance.service.js';
import { ParentConsentStatus } from '@prisma/client';

/**
 * Result of age verification process
 */
export interface AgeVerificationResult {
  /** Whether the user is considered a minor in their region */
  isMinor: boolean;
  /** Whether parental consent is required */
  requiresConsent: boolean;
  /** The consent age for the user's region */
  consentAge: number;
  /** The user's calculated age */
  age: number;
  /** Regional rules that apply to the user */
  regionalRules: RegionalRules;
}

/**
 * Service for verifying user age and managing age-related data
 *
 * @remarks
 * This service handles:
 * - Age verification during registration
 * - Updating user records with age-related data
 * - Determining parental consent requirements
 *
 * @example
 * ```typescript
 * const result = await ageVerificationService.verifyAge(
 *   userId,
 *   new Date('2015-06-15'),
 *   'US'
 * );
 * if (result.requiresConsent) {
 *   // Initiate parental consent flow
 * }
 * ```
 */
@Injectable()
export class AgeVerificationService {
  private readonly logger = new Logger(AgeVerificationService.name);

  constructor(
    private readonly complianceService: ComplianceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verify a user's age and update their record accordingly
   *
   * @param userId - The user's database ID
   * @param birthDate - The user's date of birth
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Age verification result with regional rules
   *
   * @remarks
   * This method:
   * 1. Calculates the user's age
   * 2. Determines if they're a minor in their region
   * 3. Updates the user record with child safety fields
   * 4. Sets parentConsentStatus to PENDING if consent is required
   */
  async verifyAge(
    userId: string,
    birthDate: Date,
    countryCode: string,
  ): Promise<AgeVerificationResult> {
    this.logger.log(`Verifying age for user ${userId}, country: ${countryCode}`);

    const rules = this.complianceService.getRegionalRules(countryCode);
    const age = this.complianceService.calculateAge(birthDate);
    const isMinor = this.complianceService.isMinor(birthDate, countryCode);
    const requiresConsent = this.complianceService.requiresParentalConsent(birthDate, countryCode);

    // Determine parent consent status
    const parentConsentStatus: ParentConsentStatus = requiresConsent
      ? ParentConsentStatus.PENDING
      : ParentConsentStatus.NOT_REQUIRED;

    // Update user record with child safety fields
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        birthDate,
        declaredCountry: countryCode.toUpperCase(),
        isMinor,
        regionalConsentAge: rules.consentAge,
        parentConsentStatus,
      },
    });

    this.logger.log(
      `User ${userId} age verified: age=${age}, isMinor=${isMinor}, ` +
        `requiresConsent=${requiresConsent}, consentAge=${rules.consentAge}`,
    );

    return {
      isMinor,
      requiresConsent,
      consentAge: rules.consentAge,
      age,
      regionalRules: rules,
    };
  }

  /**
   * Check if a user requires parental consent based on stored data
   *
   * @param userId - The user's database ID
   * @returns true if parental consent is required and not yet verified
   */
  async requiresParentalConsent(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentConsentStatus: true, isMinor: true },
    });

    if (!user) {
      return false;
    }

    return user.isMinor && user.parentConsentStatus === ParentConsentStatus.PENDING;
  }

  /**
   * Get the consent status for a user
   *
   * @param userId - The user's database ID
   * @returns The user's parent consent status, or null if user not found
   */
  async getConsentStatus(userId: string): Promise<ParentConsentStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentConsentStatus: true },
    });

    return user?.parentConsentStatus ?? null;
  }

  /**
   * Check if a user has verified parental consent
   *
   * @param userId - The user's database ID
   * @returns true if parental consent has been verified
   */
  async hasVerifiedConsent(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentConsentStatus: true },
    });

    return user?.parentConsentStatus === ParentConsentStatus.VERIFIED;
  }

  /**
   * Update parent email for a minor user
   *
   * @param userId - The user's database ID
   * @param parentEmail - Parent/guardian email address
   */
  async setParentEmail(userId: string, parentEmail: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { parentEmail },
    });

    this.logger.log(`Parent email set for user ${userId}`);
  }
}
