/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OAuth authentication DTOs
 * Matches OpenAPI schema definitions
 */

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
  @IsEnum(OAuthProvider)
  provider!: OAuthProvider;

  @IsOptional()
  @IsUUID()
  visitorSessionId?: string;

  @IsOptional()
  @IsUrl()
  redirectUrl?: string;
}

/**
 * Response with OAuth authorization URL
 */
export class InitiateOAuthResponseDto {
  authUrl!: string;

  state!: string;

  provider!: OAuthProvider;
}

/**
 * Query parameters from OAuth callback
 */
export class OAuthCallbackQueryDto {
  @IsString()
  code!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}
