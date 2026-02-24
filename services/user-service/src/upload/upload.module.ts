/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';
import { S3Service } from '../services/s3.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [ConfigModule, forwardRef(() => UsersModule)],
  controllers: [UploadController],
  providers: [UploadService, S3Service],
  exports: [UploadService, S3Service],
})
export class UploadModule {}
