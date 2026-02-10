/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Signup DTOs for user registration
 * Matches OpenAPI schema definitions
 */

import {
  IsEmail,
  IsString,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  IsISO8601,
  Length,
} from 'class-validator';

/**
 * Request payload for user signup with email/password
 */
export class SignupRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsUUID()
  visitorSessionId?: string;

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
}
