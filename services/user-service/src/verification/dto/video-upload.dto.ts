/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsUUID, IsNumber, Min, Max } from 'class-validator';

/**
 * DTO for confirming video upload completion
 * Frontend sends this after uploading video to S3 pre-signed URL
 */
export class VideoUploadCompleteDto {
  /**
   * ID of the verification record this video belongs to
   */
  @IsUUID()
  verificationId!: string;

  /**
   * Original filename of the uploaded video
   */
  @IsString()
  fileName!: string;

  /**
   * File size in bytes
   */
  @IsNumber()
  @Min(1)
  @Max(104857600) // 100MB
  fileSize!: number;

  /**
   * MIME type of the video
   */
  @IsString()
  mimeType!: string;
}

/**
 * Response DTO for video upload completion
 * Confirms the video has been recorded and stored
 */
export class VideoUploadResponseDto {
  /**
   * ID of the video upload record
   */
  videoUploadId!: string;

  /**
   * Verification record ID
   */
  verificationId!: string;

  /**
   * S3 URL where the video is stored (may be private)
   */
  s3Url!: string;

  /**
   * Original filename
   */
  fileName!: string;

  /**
   * File size in bytes
   */
  fileSize!: number;

  /**
   * When the upload was confirmed
   */
  completedAt!: string; // ISO 8601 datetime

  /**
   * When this video upload record expires from storage
   * Videos are auto-deleted after 30 days
   */
  expiresAt!: string; // ISO 8601 datetime

  /**
   * Next steps for the user
   */
  message!: string;
}
