/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsISO8601,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character',
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(50, { message: 'Display name must be at most 50 characters' })
  displayName!: string;

  /**
   * User's date of birth in ISO 8601 format (YYYY-MM-DD)
   * Optional for Phase 1 - will be required in later phases
   */
  @IsOptional()
  @IsISO8601({ strict: true })
  birthDate?: string;

  /**
   * User's declared country of residence (ISO 3166-1 alpha-2)
   * Examples: 'US', 'GB', 'DE', 'FR'
   */
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2)' })
  declaredCountry?: string;

  /**
   * Parent/guardian email address for consent
   * Required when birthDate indicates user is a minor
   */
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid parent/guardian email address' })
  parentEmail?: string;
}

export class RegisterResponseDto {
  userId!: string;
  email!: string;
  displayName!: string;
  message!: string;
  requiresEmailVerification!: boolean;
  /** Whether parental consent is required (true for minors) */
  requiresParentalConsent?: boolean;
  /** The regional consent age that applies to this user */
  consentAge?: number;
  /** Whether the consent email was sent */
  consentEmailSent?: boolean;
}
