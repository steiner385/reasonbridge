/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { CognitoService } from './cognito.service.js';
import { MockAuthService } from './mock-auth.service.js';
import { DatabaseAuthService } from './database-auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { UsersModule } from '../users/users.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUTH_SERVICE } from './auth.interface.js';

/**
 * Provides authentication service based on environment configuration.
 *
 * AUTH_MODE options:
 * - 'database': Use DatabaseAuthService (authenticates against User table with bcrypt)
 * - 'mock': Use MockAuthService (in-memory, for unit tests)
 * - 'cognito' or unset: Use CognitoService (AWS Cognito)
 *
 * For backwards compatibility:
 * - AUTH_MOCK=true enables mock mode
 * - NODE_ENV=test enables mock mode
 */
const authServiceProvider = {
  provide: AUTH_SERVICE,
  useFactory: (configService: ConfigService, prisma: PrismaService) => {
    const authMode = configService.get<string>('AUTH_MODE');
    const useMock =
      configService.get<string>('AUTH_MOCK') === 'true' ||
      configService.get<string>('NODE_ENV') === 'test';

    // Explicit AUTH_MODE takes precedence
    if (authMode === 'database') {
      return new DatabaseAuthService(configService, prisma);
    }

    if (authMode === 'mock' || useMock) {
      return new MockAuthService(configService);
    }

    return new CognitoService(configService);
  },
  inject: [ConfigService, PrismaService],
};

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      // JWT verification is done using Cognito's public keys (or mock secret in test mode)
      // JwtAuthGuard handles both production (RS256/JWKS) and test (HS256/secret) modes
      signOptions: { algorithm: 'RS256' },
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  // Note: CognitoService, MockAuthService, DatabaseAuthService are NOT listed here
  // because they are manually instantiated by authServiceProvider based on AUTH_MODE
  providers: [authServiceProvider, JwtAuthGuard],
  exports: [AUTH_SERVICE, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
