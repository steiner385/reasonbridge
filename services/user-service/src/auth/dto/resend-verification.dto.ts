/**
 * Resend verification DTOs
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/**
 * Request payload for resending verification email
 */
export class ResendVerificationRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;
}

/**
 * Response after successfully resending verification email
 */
export class ResendVerificationResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Verification code resent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Email address where verification was resent',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Remaining attempts before rate limit (3 per hour)',
    example: 2,
  })
  remainingAttempts: number;

  @ApiProperty({
    description: 'Expiration time for the new verification code',
    example: '2026-01-26T23:59:59Z',
  })
  expiresAt: string;
}
