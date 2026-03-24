/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OptionalAuthGuard } from './guards/optional-auth.guard.js';
import { ModeratorGuard } from './guards/moderator.guard.js';

/**
 * Authentication module for discussion-service.
 *
 * This module provides JWT-based authentication for protecting endpoints.
 * It validates tokens issued by user-service (via Cognito or database auth).
 *
 * Usage:
 * 1. Import AuthModule in the feature module
 * 2. Use @UseGuards(JwtAuthGuard) on protected endpoints
 * 3. Use @UseGuards(OptionalAuthGuard) for endpoints accessible to both authenticated and anonymous users
 * 4. Use @UseGuards(JwtAuthGuard, ModeratorGuard) for moderator-only endpoints
 * 5. Use @CurrentUser() to extract the authenticated user's payload
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      // JWT verification is done using Cognito's public keys (or mock secret in test mode)
      // JwtAuthGuard handles both production (RS256/JWKS) and test (HS256/secret) modes
      signOptions: { algorithm: 'RS256' },
    }),
  ],
  providers: [
    // Factory provider for JwtAuthGuard to bypass NestJS's reflection-based DI issues
    {
      provide: JwtAuthGuard,
      useFactory: (jwtService: JwtService, configService: ConfigService) =>
        new JwtAuthGuard(jwtService, configService),
      inject: [JwtService, ConfigService],
    },
    // Factory provider for OptionalAuthGuard
    {
      provide: OptionalAuthGuard,
      useFactory: (jwtService: JwtService, configService: ConfigService) =>
        new OptionalAuthGuard(jwtService, configService),
      inject: [JwtService, ConfigService],
    },
    ModeratorGuard,
  ],
  exports: [JwtAuthGuard, OptionalAuthGuard, ModeratorGuard, JwtModule],
})
export class AuthModule {}
