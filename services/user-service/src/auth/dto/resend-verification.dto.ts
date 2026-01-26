/**
 * Resend verification DTOs
 * Matches OpenAPI schema definitions
 */

import { IsEmail } from 'class-validator';

/**
 * Request payload for resending verification email
 */
export class ResendVerificationRequestDto {
  @IsEmail()
  email!: string;
}

/**
 * Response after successfully resending verification email
 */
export class ResendVerificationResponseDto {
  message!: string;

  email!: string;

  remainingAttempts!: number;

  expiresAt!: string;
}
