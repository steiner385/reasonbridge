/**
 * OAuth authentication DTOs
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, IsOptional, IsUrl } from 'class-validator';

/**
 * OAuth provider types
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

/**
 * Request payload for initiating OAuth flow
 */
export class InitiateOAuthRequestDto {
  @ApiProperty({
    description: 'OAuth provider to use',
    enum: OAuthProvider,
    example: OAuthProvider.GOOGLE,
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({
    description: 'Optional visitor session ID to link pre-signup activity',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  visitorSessionId?: string;

  @ApiProperty({
    description: 'Optional redirect URL after OAuth completion',
    example: 'http://localhost:3000/auth/callback',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;
}

/**
 * Response with OAuth authorization URL
 */
export class InitiateOAuthResponseDto {
  @ApiProperty({
    description: 'OAuth authorization URL to redirect user to',
    example: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...',
  })
  authUrl: string;

  @ApiProperty({
    description: 'State token for CSRF protection (should be verified in callback)',
    example: 'a1b2c3d4e5f6...',
  })
  state: string;

  @ApiProperty({
    description: 'OAuth provider',
    enum: OAuthProvider,
    example: OAuthProvider.GOOGLE,
  })
  provider: OAuthProvider;
}

/**
 * Query parameters from OAuth callback
 */
export class OAuthCallbackQueryDto {
  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: '4/0AfJohXkR...',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'State token to verify against CSRF attacks',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'Optional error from OAuth provider',
    example: 'access_denied',
    required: false,
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Optional error description from OAuth provider',
    example: 'User denied access',
    required: false,
  })
  @IsOptional()
  @IsString()
  error_description?: string;
}
