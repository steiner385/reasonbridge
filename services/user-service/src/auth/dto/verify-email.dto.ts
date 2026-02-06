/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Email verification DTOs
 * Matches OpenAPI schema definitions
 */

import { IsEmail, IsString, Length, Matches } from 'class-validator';

/**
 * Request payload for email verification
 */
export class VerifyEmailRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, {
    message: 'Verification code must be exactly 6 digits',
  })
  code!: string;
}
