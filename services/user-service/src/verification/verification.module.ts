import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { VideoVerificationService } from './video-challenge.service.js';

/**
 * Verification Module
 * Provides verification-related services and controllers for user authenticity
 * Handles phone number verification, government ID verification, and video verification requests
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [VerificationController],
  providers: [VerificationService, VideoVerificationService],
  exports: [VerificationService, VideoVerificationService],
})
export class VerificationModule {}
