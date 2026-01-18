import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

/**
 * Verification Module
 * Provides verification-related services and controllers for user authenticity
 * Handles phone number verification and government ID verification requests
 */
@Module({
  imports: [PrismaModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
