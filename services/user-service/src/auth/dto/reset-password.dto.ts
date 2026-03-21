/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * Request payload for password reset
 */
export class ResetPasswordRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, {
    message: 'Code must be exactly 6 digits',
  })
  code!: string;

  @IsString()
  @MinLength(12)
  newPassword!: string;
}

/**
 * Response payload for password reset
 */
export class ResetPasswordResponseDto {
  message!: string;
}
