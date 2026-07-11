/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { ProcessedImage } from './image-processor.service';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface AvatarUrls {
  small: { webp: string; jpg: string };
  medium: { webp: string; jpg: string };
  large: { webp: string; jpg: string };
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(@Optional() @Inject(ConfigService) private readonly configService?: ConfigService) {
    // Use environment variables as fallback if ConfigService not available
    this.region =
      this.configService?.get<string>('AWS_REGION') ?? process.env['AWS_REGION'] ?? 'us-east-1';
    this.bucket =
      this.configService?.get<string>('S3_AVATAR_BUCKET') ??
      process.env['S3_AVATAR_BUCKET'] ??
      'reason-bridge-avatars';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId:
          this.configService?.get<string>('AWS_ACCESS_KEY_ID') ??
          process.env['AWS_ACCESS_KEY_ID'] ??
          '',
        secretAccessKey:
          this.configService?.get<string>('AWS_SECRET_ACCESS_KEY') ??
          process.env['AWS_SECRET_ACCESS_KEY'] ??
          '',
      },
    });

    this.logger.log(`S3Service initialized with bucket: ${this.bucket}, region: ${this.region}`);
  }

  /**
   * Upload avatar to S3
   * @param userId - User ID to namespace the avatar
   * @param file - File buffer
   * @param mimeType - MIME type of the file
   * @returns Upload result with key and URL
   */
  async uploadAvatar(userId: string, file: Buffer, mimeType: string): Promise<UploadResult> {
    const fileHash = crypto.createHash('md5').update(file).digest('hex');
    const ext = this.getExtensionFromMimeType(mimeType);
    const key = `avatars/${userId}/${fileHash}${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
        CacheControl: 'max-age=31536000', // Cache for 1 year
        Metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`Avatar uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to upload avatar: ${errorMessage}`, errorStack);
      throw new Error(`Failed to upload avatar: ${errorMessage}`);
    }
  }

  /**
   * Delete an arbitrary object from the bucket by key.
   *
   * @param key - S3 object key
   * @throws {Error} When the delete request fails
   *
   * @remarks
   * A general-purpose primitive used, for example, to remove identity
   * verification videos during GDPR/COPPA data deletion.
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`S3 object deleted successfully: ${key}`);
  }

  /**
   * Delete avatar from S3
   * @param key - S3 object key
   */
  async deleteAvatar(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Avatar deleted successfully: ${key}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete avatar: ${errorMessage}`, errorStack);
      throw new Error(`Failed to delete avatar: ${errorMessage}`);
    }
  }

  /**
   * Get a signed URL for an avatar (for private buckets)
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return url;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to generate signed URL: ${errorMessage}`, errorStack);
      throw new Error(`Failed to generate signed URL: ${errorMessage}`);
    }
  }

  /**
   * Upload avatar variants to S3
   * @param userId - User ID to namespace the avatar
   * @param hash - Hash of the avatar for versioning
   * @param variants - Processed image variants
   * @returns Structured URLs for all variants
   */
  async uploadAvatarVariants(
    userId: string,
    hash: string,
    variants: ProcessedImage[],
  ): Promise<AvatarUrls> {
    const uploadedKeys: string[] = [];
    const avatarUrls: AvatarUrls = {
      small: { webp: '', jpg: '' },
      medium: { webp: '', jpg: '' },
      large: { webp: '', jpg: '' },
    };

    try {
      for (const variant of variants) {
        const extension = variant.format === 'jpg' ? 'jpg' : 'webp';
        const key = `avatars/${userId}/${hash}/${variant.size}.${extension}`;
        const contentType = variant.format === 'jpg' ? 'image/jpeg' : 'image/webp';

        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: variant.buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await this.s3Client.send(command);
        uploadedKeys.push(key);

        const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
        avatarUrls[variant.size][variant.format] = url;
      }

      this.logger.log(`Uploaded ${variants.length} avatar variants for user ${userId}`);
      return avatarUrls;
    } catch (error: unknown) {
      // Rollback: delete any files that were uploaded
      this.logger.warn(`Upload failed, rolling back ${uploadedKeys.length} files`);
      for (const key of uploadedKeys) {
        try {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: key,
            }),
          );
        } catch (deleteError: unknown) {
          const deleteMessage =
            deleteError instanceof Error ? deleteError.message : String(deleteError);
          this.logger.error(`Failed to delete ${key} during rollback: ${deleteMessage}`);
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Delete all avatar files for a specific hash
   * @param userId - User ID to namespace the avatar
   * @param hash - Hash of the avatar folder to delete
   */
  async deleteAvatarFolder(userId: string, hash: string): Promise<void> {
    const prefix = `avatars/${userId}/${hash}/`;

    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        this.logger.debug(`No files found in ${prefix}`);
        return;
      }

      for (const object of listResponse.Contents) {
        if (object.Key) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: object.Key,
            }),
          );
        }
      }

      this.logger.log(`Deleted ${listResponse.Contents.length} files from ${prefix}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete avatar folder: ${errorMessage}`, errorStack);
      throw new Error(`Failed to delete avatar folder: ${errorMessage}`);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeTypeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return mimeTypeMap[mimeType] || '.jpg';
  }
}
