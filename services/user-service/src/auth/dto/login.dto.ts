/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  password!: string;
}

export class LoginResponseDto {
  accessToken!: string;
  idToken!: string;
  refreshToken!: string;
  expiresIn!: number;
  tokenType!: string;
}
