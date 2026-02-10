/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplianceService } from './compliance.service.js';
import { AgeVerificationService } from './age-verification.service.js';
import { ParentalConsentService } from './parental-consent.service.js';
import { ParentalConsentController } from './parental-consent.controller.js';
import { EmailService } from '../services/email.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

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
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ParentalConsentController],
  providers: [ComplianceService, AgeVerificationService, ParentalConsentService, EmailService],
  exports: [ComplianceService, AgeVerificationService, ParentalConsentService],
})
export class ComplianceModule {}
