/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';

// Use Prisma.Decimal for proper module resolution across all environments
type Decimal = Prisma.Decimal;
import { TrustScoreUpdateDto, TrustScoresDto } from '../users/dto/trust-score.dto.js';

/**
 * TrustScoreCalculator - Implements Mayer's ABI (Ability, Benevolence, Integrity) Model
 *
 * Calculates trust scores for users based on their contributions, interactions, and verification status.
 * The model uses three dimensions:
 * - Ability (0-1): Quality and accuracy of contributions
 * - Benevolence (0-1): Helpfulness and constructive engagement
 * - Integrity (0-1): Behavioral consistency and verification status
 *
 * Default scores are 0.50 (50%) for new users, adjusted based on system events.
 *
 * @see https://en.wikipedia.org/wiki/Trust_(social_science)#Mayer's_Model_of_Trust
 */
@Injectable()
export class TrustScoreCalculator {
  /**
   * Bounds scores to valid range [0, 1]
   * @param score - Raw score value
   * @returns Score bounded between 0 and 1
   */
  private clampScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate ability score based on contribution quality metrics
   *
   * Factors considered:
   * - User has verified email (baseline +0.05)
   * - Account age: older accounts gain trust (scales from 0 to +0.15 over 365 days)
   * - Non-suspended status (penalty -0.20 if suspended)
   *
   * @param user - User entity with status and timestamps
   * @returns Ability score (0-1), default 0.50 adjusted by factors
   */
  private calculateAbilityScore(user: User): number {
    let score = 0.5; // Default baseline

    // Email verification bonus
    if (user.email) {
      score += 0.05;
    }

    // Account age bonus (scales from 0 to +0.15 over 365 days)
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
    const ageBonus = Math.min(0.15, (accountAgeDays / 365) * 0.15);
    score += ageBonus;

    // Penalty for suspended accounts
    if (user.status === 'SUSPENDED') {
      score -= 0.2;
    }

    // Penalty for banned accounts
    if (user.status === 'BANNED') {
      score -= 0.3;
    }

    return this.clampScore(score);
  }

  /**
   * Calculate benevolence score based on interaction quality
   *
   * Factors considered:
   * - VERIFIED_HUMAN verification level (+0.20)
   * - ENHANCED verification level (+0.10)
   * - Non-suspended status (penalty -0.15 if suspended)
   *
   * @param user - User entity with verification level and status
   * @returns Benevolence score (0-1), default 0.50 adjusted by factors
   */
  private calculateBenevolenceScore(user: User): number {
    let score = 0.5; // Default baseline

    // Verification level bonuses
    if (user.verificationLevel === 'VERIFIED_HUMAN') {
      score += 0.2;
    } else if (user.verificationLevel === 'ENHANCED') {
      score += 0.1;
    }

    // Penalty for suspended accounts
    if (user.status === 'SUSPENDED') {
      score -= 0.15;
    }

    // Penalty for banned accounts
    if (user.status === 'BANNED') {
      score -= 0.25;
    }

    return this.clampScore(score);
  }

  /**
   * Calculate integrity score based on behavioral consistency
   *
   * Factors considered:
   * - VERIFIED_HUMAN verification level (+0.25)
   * - ENHANCED verification level (+0.15)
   * - Account age: older accounts demonstrate consistency (scales from 0 to +0.15 over 365 days)
   * - Non-suspended status (penalty -0.25 if suspended)
   *
   * @param user - User entity with verification level, status and timestamps
   * @returns Integrity score (0-1), default 0.50 adjusted by factors
   */
  private calculateIntegrityScore(user: User): number {
    let score = 0.5; // Default baseline

    // Verification level bonuses
    if (user.verificationLevel === 'VERIFIED_HUMAN') {
      score += 0.25;
    } else if (user.verificationLevel === 'ENHANCED') {
      score += 0.15;
    }

    // Account age bonus (scales from 0 to +0.15 over 365 days)
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
    const ageBonus = Math.min(0.15, (accountAgeDays / 365) * 0.15);
    score += ageBonus;

    // Penalty for suspended accounts
    if (user.status === 'SUSPENDED') {
      score -= 0.25;
    }

    // Penalty for banned accounts
    if (user.status === 'BANNED') {
      score -= 0.4;
    }

    return this.clampScore(score);
  }

  /**
   * Calculate all trust scores for a user based on their profile
   *
   * @param user - User entity with all required fields
   * @returns TrustScoresDto with calculated ability, benevolence, and integrity scores
   */
  calculateTrustScores(user: User): TrustScoresDto {
    const ability = this.calculateAbilityScore(user);
    const benevolence = this.calculateBenevolenceScore(user);
    const integrity = this.calculateIntegrityScore(user);

    return new TrustScoresDto(ability, benevolence, integrity);
  }

  /**
   * Merge new score dimensions with existing scores
   *
   * Used for partial updates where only some dimensions are provided.
   * Missing dimensions retain their current values.
   *
   * @param existing - Existing trust score values
   * @param update - Partial update with optional dimensions
   * @returns Updated trust scores
   */
  mergeScores(
    existing: { ability: number; benevolence: number; integrity: number },
    update: TrustScoreUpdateDto,
  ): { ability: number; benevolence: number; integrity: number } {
    return {
      ability: update.ability ?? existing.ability,
      benevolence: update.benevolence ?? existing.benevolence,
      integrity: update.integrity ?? existing.integrity,
    };
  }

  /**
   * Convert Decimal database values to plain numbers
   *
   * @param decimal - Prisma Decimal value
   * @returns Numeric value
   */
  decimalToNumber(decimal: Decimal | number): number {
    if (typeof decimal === 'number') {
      return decimal;
    }
    return decimal.toNumber();
  }

  /**
   * Convert plain numbers to Decimal for database storage
   *
   * @param value - Numeric score value (0-1)
   * @returns Prisma Decimal value with 2 decimal places precision
   */
  numberToDecimal(value: number): Decimal {
    // Round to 2 decimal places for storage precision
    const rounded = Math.round(value * 100) / 100;
    return new Prisma.Decimal(rounded);
  }
}
