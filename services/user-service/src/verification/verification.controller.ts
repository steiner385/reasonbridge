import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { VerificationService } from './verification.service.js';
import { VideoUploadService } from './video-upload.service.js';
import { VerificationRequestDto } from './dto/verification-request.dto.js';
import { VerificationResponseDto } from './dto/verification-response.dto.js';
import { VideoUploadCompleteDto } from './dto/video-upload.dto.js';

/**
 * Verification Controller
 * Handles user verification requests for enhanced trust levels
 * Requires authentication - all endpoints require valid JWT
 */
@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);

  constructor(
    private verificationService: VerificationService,
    private videoUploadService: VideoUploadService,
  ) {}

  /**
   * POST /verification/request
   * Initiates a verification process for the authenticated user
   *
   * Supports multiple verification types:
   * - phone: SMS-based phone number verification
   * - government_id: Government ID verification through third-party provider
   *
   * @param userId - Authenticated user ID (from JWT token)
   * @param request - Verification request details
   * @returns VerificationResponseDto with verification ID and next steps
   *
   * @example
   * // Request phone verification
   * POST /verification/request
   * {
   *   "type": "phone",
   *   "phoneNumber": "+12125551234"
   * }
   *
   * // Response
   * {
   *   "verificationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *   "type": "phone",
   *   "expiresAt": "2026-01-20T18:30:00.000Z",
   *   "message": "A verification code will be sent to your phone number shortly..."
   * }
   */
  @Post('request')
  async requestVerification(
    @CurrentUser() userId: string,
    @Body() request: VerificationRequestDto,
  ): Promise<VerificationResponseDto> {
    this.logger.debug(`Verification request from user ${userId}: type=${request.type}`);
    return this.verificationService.requestVerification(userId, request);
  }

  /**
   * POST /verification/video-upload-complete
   * Confirms video upload completion for video verification
   *
   * Called after user uploads video to the pre-signed S3 URL
   * Validates upload and stores metadata in database
   *
   * @param userId - Authenticated user ID (from JWT token)
   * @param dto - Video upload completion details
   * @returns Confirmation with video upload record ID and expiry details
   *
   * @example
   * // Confirm video upload
   * POST /verification/video-upload-complete
   * {
   *   "verificationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *   "fileName": "verification.webm",
   *   "fileSize": 2097152,
   *   "mimeType": "video/webm"
   * }
   *
   * // Response
   * {
   *   "videoUploadId": "a1b2c3d4-e5f6-4789-0123-456789abcdef",
   *   "verificationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *   "s3Url": "s3://unite-discord-video-verifications/videos/user123/...",
   *   "fileName": "verification.webm",
   *   "fileSize": 2097152,
   *   "completedAt": "2026-01-18T14:30:00.000Z",
   *   "expiresAt": "2026-02-17T14:30:00.000Z",
   *   "message": "Video upload confirmed. Your video is being processed..."
   * }
   */
  @Post('video-upload-complete')
  async confirmVideoUpload(
    @CurrentUser() userId: string,
    @Body() dto: VideoUploadCompleteDto,
  ) {
    this.logger.debug(
      `Video upload confirmation from user ${userId}: verification=${dto.verificationId}`,
    );
    return this.videoUploadService.confirmVideoUpload(userId, dto);
  }
}
