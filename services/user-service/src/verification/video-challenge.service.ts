import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import type { VideoChallenge } from './dto/verification-response.dto.js';

/**
 * Random phrases for phrase-based video challenges
 * User must say one of these phrases during their video
 */
const RANDOM_PHRASES = [
  'I am a real human being',
  'Verify my authenticity',
  'This is my video verification',
  'Accept my verification',
  'I consent to this verification',
  'Confirm my identity',
  'Validate my account',
  'Authenticate my presence',
  'Secure my account',
  'Trust me now',
];

/**
 * Random gestures for gesture-based video challenges
 * User must perform one of these gestures during their video
 */
const RANDOM_GESTURES = [
  'Show both thumbs up',
  'Nod your head three times',
  'Blink your eyes slowly',
  'Smile and wave',
  'Make a peace sign with your hand',
];

/**
 * Video Verification Service
 * Handles generation of video verification challenges
 * and pre-signed URLs for video upload to S3
 */
@Injectable()
export class VideoVerificationService {
  private readonly logger = new Logger(VideoVerificationService.name);
  private readonly s3Client: S3Client;
  private readonly videoBucket: string;
  private readonly region: string;
  private readonly videoMaxFileSize: number;
  private readonly videoMinDurationSeconds: number;
  private readonly videoMaxDurationSeconds: number;
  private readonly videoUploadUrlExpiresIn: number;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.videoBucket =
      this.configService.get<string>('S3_VIDEO_VERIFICATION_BUCKET') ||
      'unite-discord-video-verifications';

    // Video constraints
    this.videoMaxFileSize = this.configService.get<number>(
      'VIDEO_MAX_FILE_SIZE',
    ) || 100 * 1024 * 1024; // 100MB default
    this.videoMinDurationSeconds = this.configService.get<number>(
      'VIDEO_MIN_DURATION_SECONDS',
    ) || 3;
    this.videoMaxDurationSeconds = this.configService.get<number>(
      'VIDEO_MAX_DURATION_SECONDS',
    ) || 30;
    this.videoUploadUrlExpiresIn = this.configService.get<number>(
      'VIDEO_UPLOAD_URL_EXPIRES_IN',
    ) || 3600; // 1 hour

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ) || '',
      },
    });

    this.logger.log(
      `VideoVerificationService initialized with bucket: ${this.videoBucket}, region: ${this.region}`,
    );
  }

  /**
   * Generate a random video challenge
   * Creates a challenge of the specified type that user must complete
   *
   * @param challengeType - Type of challenge (RANDOM_PHRASE, RANDOM_GESTURE, TIMESTAMP)
   * @returns VideoChallenge with type, instruction, and optional random value
   */
  generateChallenge(
    challengeType: 'RANDOM_PHRASE' | 'RANDOM_GESTURE' | 'TIMESTAMP',
  ): VideoChallenge {
    switch (challengeType) {
      case 'RANDOM_PHRASE':
        return this.generatePhraseChallenge();
      case 'RANDOM_GESTURE':
        return this.generateGestureChallenge();
      case 'TIMESTAMP':
        return this.generateTimestampChallenge();
      default:
        throw new BadRequestException(`Unknown challenge type: ${challengeType}`);
    }
  }

  /**
   * Generate a random phrase challenge
   * User must speak a randomly selected phrase during video
   */
  private generatePhraseChallenge(): VideoChallenge {
    const randomPhrase =
      RANDOM_PHRASES[Math.floor(Math.random() * RANDOM_PHRASES.length)];

    return {
      type: 'RANDOM_PHRASE',
      instruction: `Say the following phrase clearly in your video: "${randomPhrase}"`,
      randomValue: randomPhrase as string,
    };
  }

  /**
   * Generate a random gesture challenge
   * User must perform a randomly selected gesture during video
   */
  private generateGestureChallenge(): VideoChallenge {
    const randomGesture =
      RANDOM_GESTURES[Math.floor(Math.random() * RANDOM_GESTURES.length)];

    return {
      type: 'RANDOM_GESTURE',
      instruction: `Perform this action in your video: ${randomGesture}`,
      randomValue: randomGesture as string,
    };
  }

  /**
   * Generate a timestamp challenge
   * User must show the current timestamp during video
   * This proves video is being recorded live
   */
  private generateTimestampChallenge(): VideoChallenge {
    const now = new Date();
    const timestamp = now.toISOString();

    return {
      type: 'TIMESTAMP',
      instruction:
        'Display the current timestamp on your screen during the video. You can use your phone, computer clock, or any visible time display.',
      timestamp,
    };
  }

  /**
   * Generate a pre-signed S3 URL for video upload
   * User uploads video to this URL using PUT request
   *
   * @param userId - User ID for namespacing in S3
   * @param verificationId - Verification record ID
   * @param filename - Original filename of video being uploaded
   * @returns Pre-signed URL for video upload
   */
  async generateUploadUrl(
    userId: string,
    verificationId: string,
    filename: string = 'video.webm',
  ): Promise<string> {
    try {
      // Generate unique key for this video
      const fileHash = randomBytes(16).toString('hex');
      const ext = this.getExtensionFromFilename(filename);
      const key = `videos/${userId}/${verificationId}/${fileHash}${ext}`;

      // Create PutObject command for pre-signed URL
      const command = new PutObjectCommand({
        Bucket: this.videoBucket,
        Key: key,
        ContentType: 'video/webm',
        Metadata: {
          userId,
          verificationId,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Generate pre-signed URL
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.videoUploadUrlExpiresIn,
      });

      this.logger.log(
        `Generated video upload URL for user ${userId}, verification ${verificationId}`,
      );

      return url;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate video upload URL: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to generate video upload URL');
    }
  }

  /**
   * Get video constraints for frontend validation
   */
  getVideoConstraints() {
    return {
      maxFileSize: this.videoMaxFileSize,
      minDurationSeconds: this.videoMinDurationSeconds,
      maxDurationSeconds: this.videoMaxDurationSeconds,
    };
  }

  /**
   * Get file extension from filename
   */
  private getExtensionFromFilename(filename: string): string {
    const match = filename.match(/\.[^.]*$/);
    return match ? match[0] : '.webm';
  }
}
