/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '@reason-bridge/common';

/**
 * Authentication module for activity-service.
 *
 * Provides JWT-based authentication for protecting endpoints. It validates
 * tokens issued by user-service (Cognito RS256 in production, or HS256 mock
 * secret in test/database mode). This gives the feed endpoints defence-in-depth:
 * the user id is derived from the verified token rather than a caller-supplied
 * x-user-id header, so the service cannot be spoofed if its port is reachable
 * directly (issue #1301).
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      // JwtAuthGuard handles both production (RS256/JWKS) and test (HS256/secret) modes.
      signOptions: { algorithm: 'RS256' },
    }),
  ],
  providers: [
    // Factory provider mirrors the other services to bypass reflection-based DI issues.
    {
      provide: JwtAuthGuard,
      useFactory: (jwtService: JwtService, configService: ConfigService) =>
        new JwtAuthGuard(jwtService, configService),
      inject: [JwtService, ConfigService],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
