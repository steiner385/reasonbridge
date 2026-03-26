/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtVerificationService } from './jwt-verification.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Auth Module for notification-service
 *
 * Provides JWT verification capabilities for both WebSocket connections
 * and HTTP endpoints.
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isTestOrDev = nodeEnv === 'test' || nodeEnv === 'development' || !nodeEnv;

        if (!jwtSecret && !isTestOrDev) {
          throw new Error('JWT_SECRET environment variable is required in production');
        }

        return {
          secret: jwtSecret ?? 'mock-jwt-secret-for-testing',
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
              '24h') as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  providers: [JwtVerificationService, JwtAuthGuard],
  exports: [JwtVerificationService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
