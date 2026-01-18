import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Video Challenge Service
 * Generates video challenges and manages S3 upload URLs for video verification
 */
@Injectable()
export class VideoVerificationService {
  private readonly logger = new Logger(VideoVerificationService.name);
  private s3Client: S3Client;
  private readonly bucket: string;
  private readonly videoMaxFileSize: number;
  private readonly videoMinDuration: number;
  private readonly videoMaxDuration: number;
  private readonly uploadUrlExpiry: number;

  private readonly randomPhrases = [
    'The quick brown fox jumps over the lazy dog',
    'Verification is important for security',
    'Hello, my name is being verified today',
    'I am a real person and I verify my identity',
    'Today is a good day for verification',
  ];

  private readonly randomGestures = [
    'Smile and look directly at the camera',
    'Nod your head up and down',
    'Turn your head left and right',
    'Blink your eyes three times',
    'Give a thumbs up gesture',
  ];

  constructor(private configService: ConfigService) {
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
    this.videoMinDuration = this.configService.get(
      'VIDEO_MIN_DURATION_SECONDS',
      3,
    );
    this.videoMaxDuration = this.configService.get(
      'VIDEO_MAX_DURATION_SECONDS',
      30,
    );
    this.uploadUrlExpiry = this.configService.get(
      'VIDEO_UPLOAD_URL_EXPIRES_IN',
      3600,
    ); // 1 hour
  }

  /**
   * Generate a video challenge based on type
   *
   * @param challengeType - Type of challenge (RANDOM_PHRASE, RANDOM_GESTURE, TIMESTAMP)
   * @returns Challenge object with instructions
   */
  generateChallenge(
    challengeType: 'RANDOM_PHRASE' | 'RANDOM_GESTURE' | 'TIMESTAMP' = 'RANDOM_PHRASE',
  ) {
    switch (challengeType) {
      case 'RANDOM_PHRASE':
        return this.generatePhraseChallenge();
      case 'RANDOM_GESTURE':
        return this.generateGestureChallenge();
      case 'TIMESTAMP':
        return this.generateTimestampChallenge();
      default:
        return this.generatePhraseChallenge();
    }
  }

  /**
   * Generate a random phrase challenge
   */
  private generatePhraseChallenge() {
    const randomPhrase = this.randomPhrases[
      Math.floor(Math.random() * this.randomPhrases.length)
    ];
    return {
      type: 'RANDOM_PHRASE',
      instruction: 'Please say the following phrase clearly and naturally:',
      randomValue: randomPhrase,
    };
  }

  /**
   * Generate a random gesture challenge
   */
  private generateGestureChallenge() {
    const randomGesture = this.randomGestures[
      Math.floor(Math.random() * this.randomGestures.length)
    ];
    return {
      type: 'RANDOM_GESTURE',
      instruction: 'Please perform the following action:',
      randomValue: randomGesture,
    };
  }

  /**
   * Generate a timestamp challenge
   */
  private generateTimestampChallenge() {
    const timestamp = new Date().toISOString();
    return {
      type: 'TIMESTAMP',
      instruction:
        'Please display this timestamp while showing your face (you can hold it on a phone or paper)',
      timestamp,
    };
  }

  /**
   * Generate a pre-signed S3 URL for video upload
   *
   * @param userId - User ID
   * @param verificationId - Verification ID
   * @returns Pre-signed URL for uploading video
   */
  async generateUploadUrl(userId: string, verificationId: string): Promise<string> {
    const key = `${userId}/${verificationId}/${Date.now()}.mp4`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: 'video/mp4',
      Metadata: {
        'userId': userId,
        'verificationId': verificationId,
        'uploadedAt': new Date().toISOString(),
      },
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.uploadUrlExpiry,
      });
      return url;
    } catch (error) {
      this.logger.error('Failed to generate S3 upload URL', error);
      throw error;
    }
  }

  /**
   * Get video constraints
   */
  getVideoConstraints() {
    return {
      maxFileSize: this.videoMaxFileSize,
      minDurationSeconds: this.videoMinDuration,
      maxDurationSeconds: this.videoMaxDuration,
    };
  }
}
