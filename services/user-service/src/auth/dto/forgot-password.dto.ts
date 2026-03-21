/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEmail } from 'class-validator';

/**
 * Request payload for forgot password
 */
export class ForgotPasswordRequestDto {
  @IsEmail()
  email!: string;
}

/**
 * Response payload for forgot password
 * Always returns success to prevent email enumeration
 */
export class ForgotPasswordResponseDto {
  message!: string;
}
