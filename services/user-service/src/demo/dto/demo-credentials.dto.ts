/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTOs for demo credential hints endpoint
 *
 * Provides credential hints for demo personas without exposing actual passwords.
 * Pattern: Demo{Role}2026!
 */

import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Query parameters for credential hints request
 */
export class GetDemoCredentialsQueryDto {
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

/**
 * A single credential hint for a demo persona
 */
export class DemoCredentialHintDto {
  /** Display name of the persona */
  displayName!: string;

  /** Role category (Admin, Moderator, Power User, Regular User, New User) */
  role!: string;

  /** Email address for login */
  email!: string;

  /** Password pattern hint (not the actual password) */
  passwordHint!: string;

  /** Brief description of what this persona demonstrates */
  description!: string;
}

/**
 * Response containing all credential hints
 */
export class DemoCredentialsResponseDto {
  /** List of credential hints for all demo personas */
  credentials!: DemoCredentialHintDto[];

  /** Pattern explanation for password format */
  passwordPattern!: string;

  /** Warning about demo credential restrictions */
  warning!: string;
}
