import { IsString, IsNumber, IsPositive } from 'class-validator';

/**
 * DTO for completing a video upload
 */
export class VideoUploadCompleteDto {
  @IsString()
  verificationId!: string;

  @IsString()
  fileName!: string;

  @IsNumber()
  @IsPositive()
  fileSize!: number;

  @IsString()
  mimeType!: string;
}

/**
 * DTO for video upload response
 */
export class VideoUploadResponseDto {
  videoUploadId!: string;
  verificationId!: string;
  s3Url!: string;
  fileName!: string;
  fileSize!: number;
  completedAt!: string;
  expiresAt!: string; // 30 days from now
  message!: string;
}
