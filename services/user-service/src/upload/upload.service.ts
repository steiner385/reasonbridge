/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { S3Service, type UploadResult } from '../services/s3.service.js';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly s3Service: S3Service) {}

  async uploadAvatar(userId: string, file: Buffer, mimeType: string): Promise<UploadResult> {
    this.logger.log(`Uploading avatar for user ${userId}`);

    try {
      const result = await this.s3Service.uploadAvatar(userId, file, mimeType);

      this.logger.log(`Avatar uploaded successfully for user ${userId}`);

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to upload avatar for user ${userId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async deleteAvatar(key: string): Promise<void> {
    this.logger.log(`Deleting avatar: ${key}`);

    try {
      await this.s3Service.deleteAvatar(key);

      this.logger.log(`Avatar deleted successfully: ${key}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete avatar ${key}: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
