/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication response DTOs
 * Matches OpenAPI schema definitions
 */

import { UserProfileDto, OnboardingProgressDto } from '../../dto/common.dto';

/**
 * Successful authentication response with tokens and user data
 */
export class AuthSuccessResponseDto {
  accessToken!: string;

  refreshToken!: string;

  user!: UserProfileDto;

  onboardingProgress!: OnboardingProgressDto;

  expiresIn!: number;
}

/**
 * Response when verification email is sent
 */
export class VerificationEmailSentResponseDto {
  message!: string;

  email!: string;

  expiresAt!: string;
}
