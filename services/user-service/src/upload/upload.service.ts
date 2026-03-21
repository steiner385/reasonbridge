/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { S3Service, type AvatarUrls } from '../services/s3.service.js';
import { UsersService } from '../users/users.service.js';
import { ImageProcessorService } from '../services/image-processor.service.js';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  private readonly SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  constructor(
    private readonly s3Service: S3Service,
    private readonly usersService: UsersService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  private validateMimeType(mimeType: string): void {
    if (!this.SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException('Unsupported image format');
    }
  }

  private generateHash(file: Buffer): string {
    return createHash('sha256').update(file).digest('hex').substring(0, 8);
  }

  async uploadAvatar(
    userId: string,
    file: Buffer,
    mimeType: string,
  ): Promise<{ avatarUrls: AvatarUrls }> {
    this.logger.log(`Uploading avatar for user ${userId}`);

    try {
      // 1. Validate MIME type (throw 400 if unsupported)
      this.validateMimeType(mimeType);

      // 2. Get old hash for cleanup (before processing)
      const oldHash = await this.usersService.getAvatarHash(userId);

      // 3. Generate new hash from file content
      const newHash = this.generateHash(file);

      // 4. Process image → 6 variants
      const variants = await this.imageProcessor.processAvatar(file);

      // 5. Upload all variants to S3
      const avatarUrls = await this.s3Service.uploadAvatarVariants(userId, newHash, variants);

      // 6. Update database (avatarUrls + avatarHash)
      await this.usersService.updateAvatarUrls(userId, avatarUrls, newHash);

      // 7. Delete old avatar folder asynchronously (non-blocking)
      if (oldHash && oldHash !== newHash) {
        this.s3Service.deleteAvatarFolder(userId, oldHash).catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to delete old avatar folder: ${errorMessage}`);
        });
      }

      this.logger.log(`Avatar uploaded and saved successfully for user ${userId}`);

      return { avatarUrls };
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
