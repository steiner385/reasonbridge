/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { CognitoService } from './cognito.service.js';
import { MockAuthService } from './mock-auth.service.js';
import { DatabaseAuthService } from './database-auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AdminGuard } from './guards/admin.guard.js';
import { UsersModule } from '../users/users.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUTH_SERVICE } from './auth.interface.js';
import { ComplianceModule } from '../compliance/compliance.module.js';
import { VerificationService } from './verification.service.js';
import { EmailService } from '../services/email.service.js';

/**
 * Provides authentication service based on environment configuration.
 *
 * AUTH_MODE options:
 * - 'database': Use DatabaseAuthService (authenticates against User table with bcrypt)
 * - 'mock': Use MockAuthService (in-memory, for unit tests)
 * - 'cognito': Use CognitoService (AWS Cognito)
 *
 * Automatic mode detection (when AUTH_MODE is not set):
 * - AUTH_MOCK=true → MockAuthService
 * - NODE_ENV=test → MockAuthService
 * - NODE_ENV=development or not set → DatabaseAuthService (avoids requiring Cognito config)
 * - NODE_ENV=production → CognitoService (requires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID)
 */
const authServiceProvider = {
  provide: AUTH_SERVICE,
  useFactory: (configService: ConfigService, prisma: PrismaService) => {
    const authMode = configService.get<string>('AUTH_MODE');
    const nodeEnv = configService.get<string>('NODE_ENV');
    const useMock = configService.get<string>('AUTH_MOCK') === 'true' || nodeEnv === 'test';
    // Use database auth for local development (when NODE_ENV is development or not set)
    const useDatabase = nodeEnv === 'development' || !nodeEnv;

    // Explicit AUTH_MODE takes precedence
    if (authMode === 'database') {
      return new DatabaseAuthService(configService, prisma);
    }

    if (authMode === 'mock' || useMock) {
      return new MockAuthService(configService);
    }

    // Use database auth in development mode (avoids requiring Cognito config)
    if (useDatabase) {
      return new DatabaseAuthService(configService, prisma);
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
    ComplianceModule,
  ],
  controllers: [AuthController],
  // Note: CognitoService, MockAuthService, DatabaseAuthService are NOT listed here
  // because they are manually instantiated by authServiceProvider based on AUTH_MODE
  providers: [
    authServiceProvider,
    // Factory provider for JwtAuthGuard to bypass NestJS's reflection-based DI issues
    {
      provide: JwtAuthGuard,
      useFactory: (jwtService: JwtService, configService: ConfigService) =>
        new JwtAuthGuard(jwtService, configService),
      inject: [JwtService, ConfigService],
    },
    // Factory provider for AdminGuard
    {
      provide: AdminGuard,
      useFactory: (configService: ConfigService) => new AdminGuard(configService),
      inject: [ConfigService],
    },
    // Verification and email services for verify-email and resend-verification endpoints
    VerificationService,
    EmailService,
    PrismaService,
  ],
  exports: [AUTH_SERVICE, JwtAuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
