/**
 * Authentication response DTOs
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto, OnboardingProgressDto } from '../../dto/common.dto';

/**
 * Successful authentication response with tokens and user data
 */
export class AuthSuccessResponseDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user profile',
    type: UserProfileDto,
  })
  user: UserProfileDto;

  @ApiProperty({
    description: 'Current onboarding progress for the user',
    type: OnboardingProgressDto,
  })
  onboardingProgress: OnboardingProgressDto;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
  })
  expiresIn: number;
}

/**
 * Response when verification email is sent
 */
export class VerificationEmailSentResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Verification email sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Email address where verification was sent',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Expiration time for the verification code (24 hours)',
    example: '2026-01-26T23:59:59Z',
  })
  expiresAt: string;
}
