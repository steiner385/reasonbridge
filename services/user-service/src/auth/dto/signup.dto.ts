/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Signup DTOs for user registration
 * Matches OpenAPI schema definitions
 */

import { IsEmail, IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

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
}
