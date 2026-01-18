import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { VideoVerificationService } from './video-challenge.service';
import { VideoUploadService } from './video-upload.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VideoVerificationService,
    VideoUploadService,
  ],
  exports: [
    VerificationService,
    VideoVerificationService,
    VideoUploadService,
  ],
})
export class VerificationModule {}
