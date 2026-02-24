/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { S3Service, type UploadResult } from '../services/s3.service.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly usersService: UsersService,
  ) {}

  async uploadAvatar(userId: string, file: Buffer, mimeType: string): Promise<UploadResult> {
    this.logger.log(`Uploading avatar for user ${userId}`);

    try {
      // Check if user has an existing avatar to delete
      const existingS3Key = await this.usersService.getAvatarS3Key(userId);
      if (existingS3Key) {
        this.logger.log(`Deleting existing avatar for user ${userId}: ${existingS3Key}`);
        try {
          await this.s3Service.deleteAvatar(existingS3Key);
        } catch (deleteError) {
          // Log but continue - old avatar cleanup failure shouldn't block new upload
          this.logger.warn(`Failed to delete old avatar ${existingS3Key}: ${deleteError}`);
        }
      }

      // Upload new avatar to S3
      const result = await this.s3Service.uploadAvatar(userId, file, mimeType);

      // Update user's avatar in database
      await this.usersService.updateAvatar(userId, result.url, result.key);

      this.logger.log(`Avatar uploaded and saved successfully for user ${userId}`);

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to upload avatar for user ${userId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async deleteAvatar(userId: string): Promise<void> {
    this.logger.log(`Deleting avatar for user: ${userId}`);

    try {
      // Get the current avatar S3 key
      const s3Key = await this.usersService.getAvatarS3Key(userId);

      if (s3Key) {
        // Delete from S3
        await this.s3Service.deleteAvatar(s3Key);
        this.logger.log(`Avatar deleted from S3: ${s3Key}`);
      }

      // Remove avatar from user record
      await this.usersService.removeAvatar(userId);

      this.logger.log(`Avatar deleted successfully for user: ${userId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete avatar for user ${userId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
