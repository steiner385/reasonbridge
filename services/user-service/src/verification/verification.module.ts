/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { VideoVerificationService } from './video-challenge.service.js';
import { VideoUploadService } from './video-upload.service.js';
import { OtpService } from './services/otp.service.js';
import { PhoneValidationService } from './services/phone-validation.service.js';

/**
 * Verification Module
 * Provides verification-related services and controllers for user authenticity
 * Handles phone number verification, government ID verification, and video verification
 * Includes video challenge generation and upload handling
 */
@Module({
  imports: [PrismaModule, ConfigModule, AuthModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VideoVerificationService,
    VideoUploadService,
    OtpService,
    PhoneValidationService,
  ],
  exports: [VerificationService, VideoVerificationService, VideoUploadService],
})
export class VerificationModule {}
