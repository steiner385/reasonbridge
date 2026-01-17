import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region =
      this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucket =
      this.configService.get<string>('S3_AVATAR_BUCKET') ||
      'unite-discord-avatars';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(
      `S3Service initialized with bucket: ${this.bucket}, region: ${this.region}`
    );
  }

  /**
   * Upload avatar to S3
   * @param userId - User ID to namespace the avatar
   * @param file - File buffer
   * @param mimeType - MIME type of the file
   * @returns Upload result with key and URL
   */
  async uploadAvatar(
    userId: string,
    file: Buffer,
    mimeType: string
  ): Promise<UploadResult> {
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
