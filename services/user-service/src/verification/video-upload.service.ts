import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { VideoUploadCompleteDto, VideoUploadResponseDto } from './dto/video-upload.dto';
import { VerificationStatus, VerificationType } from '@prisma/client';

/**
 * Video Upload Service
 * Manages video upload lifecycle for verification
 */
@Injectable()
export class VideoUploadService {
  private readonly logger = new Logger(VideoUploadService.name);
  private s3Client: S3Client;
  private readonly bucket: string;
  private readonly videoMaxFileSize: number;
  private readonly videoUploadWindow: number; // In hours
  private readonly videoRetentionDays: number;

  private readonly validMimeTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ];

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const region = this.configService.get('AWS_REGION', 'us-east-1');
    this.s3Client = new S3Client({ region });
    this.bucket = this.configService.get(
      'S3_VIDEO_VERIFICATION_BUCKET',
      'unite-discord-video-verifications',
    );
    this.videoMaxFileSize = this.configService.get(
      'VIDEO_MAX_FILE_SIZE',
      100 * 1024 * 1024,
    ); // 100MB
    this.videoUploadWindow = this.configService.get(
      'VIDEO_UPLOAD_WINDOW_HOURS',
      2,
    ); // 2 hours to upload
    this.videoRetentionDays = this.configService.get(
      'VIDEO_RETENTION_DAYS',
      30,
    ); // Keep for 30 days
  }

  /**
   * Confirm video upload and create video upload record
   *
   * @param userId - User ID
   * @param dto - Video upload completion details
   * @returns VideoUploadResponseDto with confirmation
   */
  async confirmVideoUpload(
    userId: string,
    dto: VideoUploadCompleteDto,
  ): Promise<VideoUploadResponseDto> {
    // Get verification record
    const verification = await this.prisma.verificationRecord.findUnique({
      where: { id: dto.verificationId },
    });

    if (!verification) {
      throw new BadRequestException('Verification record not found');
    }

    // Validate ownership
    if (verification.userId !== userId) {
      throw new BadRequestException('Unauthorized: verification does not belong to user');
    }

    // Validate verification type
    if (verification.type !== VerificationType.VIDEO) {
      throw new BadRequestException(
        `Invalid verification type: ${verification.type}. Expected VIDEO.`,
      );
    }

    // Validate verification status
    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Verification is not in PENDING state. Current state: ${verification.status}`,
      );
    }

    // Validate upload window (2 hours from creation)
    const now = new Date();
    const uploadWindowEnd = new Date(verification.createdAt.getTime() + this.videoUploadWindow * 60 * 60 * 1000);
    if (now > uploadWindowEnd) {
      throw new BadRequestException(
        'Upload window has expired. Please request a new verification.',
      );
    }

    // Validate file size
    if (dto.fileSize > this.videoMaxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum of ${this.videoMaxFileSize / 1024 / 1024}MB`,
      );
    }

    // Validate MIME type
    if (!this.isValidVideoMimeType(dto.mimeType)) {
      throw new BadRequestException(
        `Invalid video format. Supported formats: ${this.validMimeTypes.join(', ')}`,
      );
    }

    // Calculate S3 key from file name
    const s3Key = `${userId}/${dto.verificationId}/${Date.now()}_${dto.fileName}`;
    const s3Url = `https://${this.bucket}.s3.amazonaws.com/${s3Key}`;

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.videoRetentionDays);

    // Create video upload record
    const videoUpload = await this.prisma.videoUpload.create({
      data: {
        verificationId: dto.verificationId,
        userId,
        s3Key,
        s3Url,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        completedAt: new Date(),
        expiresAt,
      },
    });

    return {
      videoUploadId: videoUpload.id,
      verificationId: videoUpload.verificationId,
      s3Url: videoUpload.s3Url,
      fileName: videoUpload.fileName,
      fileSize: videoUpload.fileSize,
      completedAt: videoUpload.completedAt!.toISOString(),
      expiresAt: videoUpload.expiresAt.toISOString(),
      message: 'Video upload confirmed successfully',
    };
  }

  /**
   * Get video upload by verification ID
   *
   * @param verificationId - Verification ID
   * @returns Video upload record or null
   */
  async getVideoUpload(verificationId: string) {
    return this.prisma.videoUpload.findFirst({
      where: { verificationId },
    });
  }

  /**
   * Get all video uploads for a user
   *
   * @param userId - User ID
   * @returns Array of video upload records
   */
  async getUserVideoUploads(userId: string) {
    return this.prisma.videoUpload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete expired video uploads (cleanup task)
   * Should be run periodically (e.g., daily via cron job)
   *
   * @returns Number of records deleted
   */
  async deleteExpiredVideoUploads(): Promise<number> {
    const now = new Date();

    // Get expired video uploads
    const expiredUploads = await this.prisma.videoUpload.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Delete from S3
    for (const upload of expiredUploads) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: upload.s3Key,
          }),
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete S3 object ${upload.s3Key}`,
          error,
        );
      }
    }

    // Delete from database
    const result = await this.prisma.videoUpload.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    this.logger.debug(`Deleted ${result.count} expired video uploads`);
    return result.count;
  }

  /**
   * Get S3 object metadata to verify file exists
   *
   * @param s3Key - S3 object key
   * @returns Object metadata or null if not found
   */
  async getS3ObjectMetadata(s3Key: string) {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Validate video MIME type
   *
   * @param mimeType - MIME type to validate
   * @returns true if valid, false otherwise
   */
  isValidVideoMimeType(mimeType: string): boolean {
    return this.validMimeTypes.includes(mimeType);
  }
}
