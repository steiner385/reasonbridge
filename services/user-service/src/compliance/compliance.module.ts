/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ComplianceService } from './compliance.service.js';
import { AgeVerificationService } from './age-verification.service.js';
import { ParentalConsentService } from './parental-consent.service.js';
import { ComplianceAuditService } from './compliance-audit.service.js';
import { ComplianceReportService } from './compliance-report.service.js';
import { DataDeletionService } from './data-deletion.service.js';
import { DataDeletionJob } from './data-deletion.job.js';
import { AgeReverificationJob } from './age-reverification.job.js';
import { ParentalConsentController } from './parental-consent.controller.js';
import { ParentalDashboardController } from './parental-dashboard.controller.js';
import { ComplianceController } from './compliance.controller.js';
import { AdminGuard } from './guards/admin.guard.js';
import { EmailService } from '../services/email.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GeoModule } from '../geo/index.js';

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
 * - Compliance audit logging for regulatory reporting
 * - GeoIP-based country detection for regional compliance
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    GeoModule,
    JwtModule.register({
      // JWT secret is required for JwtService to work properly
      // JwtAuthGuard will use this for mock/database auth modes
      secret: process.env['JWT_SECRET'] || 'default-dev-secret',
      signOptions: { algorithm: 'HS256' },
    }),
  ],
  controllers: [ParentalConsentController, ParentalDashboardController, ComplianceController],
  providers: [
    ComplianceService,
    AgeVerificationService,
    ParentalConsentService,
    ComplianceAuditService,
    ComplianceReportService,
    DataDeletionService,
    DataDeletionJob,
    AgeReverificationJob,
    EmailService,
    AdminGuard,
    // Factory provider that explicitly injects dependencies
    // This bypasses NestJS's reflection-based DI which can hang with @Optional() decorators
    {
      provide: JwtAuthGuard,
      useFactory: (jwtService: JwtService, configService: ConfigService) =>
        new JwtAuthGuard(jwtService, configService),
      inject: [JwtService, ConfigService],
    },
  ],
  exports: [
    ComplianceService,
    AgeVerificationService,
    ParentalConsentService,
    ComplianceAuditService,
    ComplianceReportService,
    DataDeletionService,
    DataDeletionJob,
    AgeReverificationJob,
    JwtAuthGuard,
    AdminGuard,
    GeoModule,
  ],
})
export class ComplianceModule {}
