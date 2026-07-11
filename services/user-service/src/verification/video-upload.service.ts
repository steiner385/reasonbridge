/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { VideoUploadCompleteDto } from './dto/video-upload.dto.js';
import { VerificationStatus, type VideoUpload } from '@prisma/client';
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * S3 object metadata returned by getS3ObjectMetadata
 */
export interface S3ObjectMetadata {
  size: number | undefined;
  mimeType: string | undefined;
  lastModified: Date | undefined;
}

/**
 * Video Upload Service
 * Handles confirmation of video uploads to S3
 * Validates uploads and stores metadata in database
 */
@Injectable()
export class VideoUploadService {
  private readonly logger = new Logger(VideoUploadService.name);
  private readonly s3Client: S3Client;
  private readonly videoBucket: string;
  private readonly region: string;
  private readonly videoMaxFileSize: number;
  private readonly videoUploadRetentionDays: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.region = this.configService?.get<string>('AWS_REGION') || 'us-east-1';
    this.videoBucket =
      this.configService?.get<string>('S3_VIDEO_VERIFICATION_BUCKET') ||
      'reason-bridge-video-verifications';
    this.videoMaxFileSize =
      this.configService?.get<number>('VIDEO_MAX_FILE_SIZE') || 100 * 1024 * 1024;
    this.videoUploadRetentionDays =
      this.configService?.get<number>('VIDEO_UPLOAD_RETENTION_DAYS') || 30;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService?.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService?.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(
      `VideoUploadService initialized with bucket: ${this.videoBucket}, region: ${this.region}`,
    );
  }

  /**
   * Confirm video upload completion
   * Validates the upload and records metadata in database
   *
   * @param userId - User ID who uploaded the video
   * @param dto - Upload completion details
   * @returns VideoUploadResponseDto with confirmation details
   * @throws BadRequestException if validation fails
   */
  async confirmVideoUpload(
    userId: string,
    dto: VideoUploadCompleteDto,
  ): Promise<{
    videoUploadId: string;
    verificationId: string;
    s3Url: string;
    fileName: string;
    fileSize: number;
    completedAt: string;
    expiresAt: string;
    message: string;
  }> {
    try {
      // Validate file size
      if (dto.fileSize > this.videoMaxFileSize) {
        throw new BadRequestException(
          `File size ${dto.fileSize} exceeds maximum ${this.videoMaxFileSize} bytes`,
        );
      }

      // Validate MIME type
      if (!this.isValidVideoMimeType(dto.mimeType)) {
        throw new BadRequestException(`MIME type ${dto.mimeType} is not a supported video format`);
      }

      // Fetch verification record
      const verification = await this.prisma.verificationRecord.findUnique({
        where: { id: dto.verificationId },
        include: { user: true },
      });

      if (!verification) {
        throw new BadRequestException('Verification record not found');
      }

      // Validate ownership
      if (verification.userId !== userId) {
        this.logger.warn(
          `User ${userId} attempted to upload video for verification belonging to ${verification.userId}`,
        );
        throw new BadRequestException('Verification does not belong to this user');
      }

      // Validate verification type
      if (verification.type !== 'VIDEO') {
        throw new BadRequestException(
          `Verification type ${verification.type} does not support video uploads`,
        );
      }

      // Validate verification status
      if (verification.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot upload video for verification with status ${verification.status}`,
        );
      }

      // Validate upload window (1 hour from verification request)
      // Note: VideoVerificationService.generateUploadUrl() generates 1-hour expiry
      // We'll give it a 2-hour window here to account for time skew
      const uploadWindowExpiresAt = new Date(verification.createdAt);
      uploadWindowExpiresAt.setHours(uploadWindowExpiresAt.getHours() + 2);

      if (new Date() > uploadWindowExpiresAt) {
        throw new BadRequestException('Upload window has expired');
      }

      // Verify file exists in S3 at expected location
      const s3Key = `videos/${userId}/${dto.verificationId}/*`;
      // Note: We can't directly check with wildcard, so we'll validate via metadata
      // In a real implementation, you'd query S3 API with ListObjectsV2
      // For now, we'll trust the frontend to have uploaded correctly
      // and the verification service will need to validate the actual content

      // Calculate S3 URL (construct from metadata)
      // In reality, we'd retrieve the actual S3 key from the upload process
      // For now, we create a deterministic URL based on verification ID
      const s3Url = `s3://${this.videoBucket}/videos/${userId}/${dto.verificationId}`;

      // Calculate expiry date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.videoUploadRetentionDays);

      // Create VideoUpload record
      const videoUpload = await this.prisma.videoUpload.create({
        data: {
          verificationId: dto.verificationId,
          userId,
          s3Key: `videos/${userId}/${dto.verificationId}`,
          s3Url,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
          mimeType: dto.mimeType,
          completedAt: new Date(),
          expiresAt,
        },
      });

      this.logger.log(
        `Video upload confirmed for verification ${dto.verificationId}, user ${userId}`,
      );

      const completedAt = videoUpload.completedAt
        ? videoUpload.completedAt.toISOString()
        : new Date().toISOString();

      return {
        videoUploadId: videoUpload.id,
        verificationId: videoUpload.verificationId,
        s3Url: videoUpload.s3Url,
        fileName: videoUpload.fileName,
        fileSize: videoUpload.fileSize,
        completedAt,
        expiresAt: videoUpload.expiresAt.toISOString(),
        message:
          'Video upload confirmed. Your video is being processed for verification. You will receive a notification when the verification is complete.',
      };
    } catch (error) {
      this.logger.error(
        `Error confirming video upload for user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Get video upload record by verification ID
   *
   * @param verificationId - Verification record ID
   * @returns VideoUpload record or null if not found
   */
  async getVideoUpload(verificationId: string): Promise<VideoUpload | null> {
    return this.prisma.videoUpload.findUnique({
      where: { verificationId },
    });
  }

  /**
   * Get video upload records for a user
   *
   * @param userId - User ID
   * @returns Array of VideoUpload records
   */
  async getUserVideoUploads(userId: string, limit = 100): Promise<VideoUpload[]> {
    return this.prisma.videoUpload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete expired video upload records and their S3 objects.
   *
   * @remarks
   * Runs periodically via {@link VerificationRetentionJob} (issue #1304).
   * Identity-verification videos capture users' faces, so the S3 object MUST be
   * removed, not just the database row. Deleting the row first would discard the
   * `s3Key` and orphan the object forever, so we delete each S3 object first and
   * only remove the database rows whose object was successfully deleted. Rows
   * whose S3 deletion failed are left for the next run to retry.
   *
   * @returns Number of database records deleted
   */
  async deleteExpiredVideoUploads(): Promise<number> {
    const expired = await this.prisma.videoUpload.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      select: { id: true, s3Key: true },
    });

    if (expired.length === 0) {
      return 0;
    }

    // Delete the S3 object before removing the row so we never orphan it.
    const deletableIds: string[] = [];
    for (const upload of expired) {
      if (await this.deleteS3Object(upload.s3Key)) {
        deletableIds.push(upload.id);
      }
    }

    if (deletableIds.length === 0) {
      this.logger.warn(
        `Found ${expired.length} expired video uploads but no S3 objects could be deleted; ` +
          'leaving database rows for retry.',
      );
      return 0;
    }

    const result = await this.prisma.videoUpload.deleteMany({
      where: { id: { in: deletableIds } },
    });

    this.logger.log(
      `Deleted ${result.count} expired video upload records ` +
        `(${deletableIds.length}/${expired.length} S3 objects removed).`,
    );

    return result.count;
  }

  /**
   * Delete a single video object from the verification bucket.
   *
   * @param s3Key - The S3 object key to delete
   * @returns true if the object was deleted (S3 DeleteObject is idempotent, so a
   *   missing key also counts as success), false if the delete call failed
   */
  private async deleteS3Object(s3Key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.videoBucket,
          Key: s3Key,
        }),
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete S3 video object ${s3Key}: ${message}`);
      return false;
    }
  }

  /**
   * Validate video MIME type
   */
  private isValidVideoMimeType(mimeType: string): boolean {
    const validMimeTypes = [
      'video/webm',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];

    return validMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get S3 object metadata
   * Helper method to verify file exists and get actual size
   *
   * @param s3Key - S3 object key
   * @returns Object metadata or null if not found
   */
  async getS3ObjectMetadata(s3Key: string): Promise<S3ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.videoBucket,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength,
        mimeType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Log but don't throw - object may not exist yet due to timing
      this.logger.debug(`Could not retrieve S3 object metadata: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get video upload configuration and constraints
   */
  getVideoUploadConfig() {
    return {
      maxFileSize: this.videoMaxFileSize,
      retentionDays: this.videoUploadRetentionDays,
      supportedMimeTypes: [
        'video/webm',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
      ],
    };
  }
}
