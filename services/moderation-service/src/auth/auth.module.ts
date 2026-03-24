/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AdminGuard } from './admin.guard.js';

/**
 * Authentication module for moderation-service.
 *
 * This module provides JWT-based authentication for protecting endpoints.
 * It validates tokens issued by user-service (via Cognito or database auth).
 *
 * Usage:
 * 1. Import AuthModule in the feature module
 * 2. Use @UseGuards(JwtAuthGuard) on protected endpoints
 * 3. Use @UseGuards(JwtAuthGuard, AdminGuard) for admin-only endpoints
 * 4. Use @CurrentUser() to extract the authenticated user's payload
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
    AdminGuard,
  ],
  exports: [JwtAuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
