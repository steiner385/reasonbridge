/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ComplianceService } from './compliance.service.js';
import { AgeVerificationService } from './age-verification.service.js';
import { ParentalConsentService } from './parental-consent.service.js';
import { ParentalConsentController } from './parental-consent.controller.js';
import { ParentalDashboardController } from './parental-dashboard.controller.js';
import { EmailService } from '../services/email.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

/**
 * Module for child safety and compliance features
 *
 * @remarks
 * Provides services for:
 * - Regional compliance rules (COPPA, GDPR Article 8, UK AADC)
 * - Age verification and calculation
 * - Minor status determination
 * - Parental consent tracking and verification
 * - Consent email sending via SES
 * - Parental dashboard for viewing child activity
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({
      // JWT verification is done using Cognito's public keys (or mock secret in test mode)
      // JwtAuthGuard handles both production (RS256/JWKS) and test (HS256/secret) modes
      signOptions: { algorithm: 'RS256' },
    }),
  ],
  controllers: [ParentalConsentController, ParentalDashboardController],
  providers: [
    ComplianceService,
    AgeVerificationService,
    ParentalConsentService,
    EmailService,
    JwtAuthGuard,
  ],
  exports: [ComplianceService, AgeVerificationService, ParentalConsentService],
})
export class ComplianceModule {}
