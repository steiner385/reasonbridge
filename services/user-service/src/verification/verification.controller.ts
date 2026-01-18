import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VerificationService } from './verification.service';
import { VideoUploadService } from './video-upload.service';
import { VerificationRequestDto } from './dto/verification-request.dto';
import { VideoUploadCompleteDto } from './dto/video-upload.dto';

/**
 * Verification Controller
 * Handles verification requests and status checks
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
   * Request a new verification
   *
   * @param userId - Authenticated user ID
   * @param request - Verification request details
   * @returns VerificationResponseDto
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async requestVerification(
    @CurrentUser('sub') userId: string,
    @Body() request: VerificationRequestDto,
  ) {
    this.logger.debug(`User ${userId} requesting ${request.type} verification`);
    return this.verificationService.requestVerification(userId, request);
  }

  /**
   * GET /verification/:verificationId
   * Get verification status
   * Automatically marks as expired if past expiry time
   *
   * @param verificationId - Verification ID
   * @param userId - Authenticated user ID
   * @returns Verification record with current status
   */
  @Get(':verificationId')
  async getVerificationStatus(
    @Param('verificationId') verificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    this.logger.debug(`User ${userId} checking verification status for ${verificationId}`);

    const verification = await this.verificationService.getVerification(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new Error('Verification not found or unauthorized');
    }

    return {
      id: verification.id,
      type: verification.type,
      status: verification.status,
      createdAt: verification.createdAt,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt,
      isExpired: verification.expiresAt && verification.expiresAt < new Date(),
    };
  }

  /**
   * GET /verification/user/pending
   * Get pending verifications for authenticated user
   * Useful for checking if user has any active verification attempts
   *
   * @param userId - Authenticated user ID
   * @returns Array of pending verification records
   */
  @Get('user/pending')
  async getPendingVerifications(@CurrentUser('sub') userId: string) {
    this.logger.debug(`Fetching pending verifications for user ${userId}`);
    return this.verificationService.getPendingVerifications(userId);
  }

  /**
   * PATCH /verification/:verificationId/cancel
   * Cancel a verification attempt
   *
   * @param verificationId - Verification ID to cancel
   * @param userId - Authenticated user ID
   * @returns Updated verification record
   */
  @Patch(':verificationId/cancel')
  async cancelVerification(
    @Param('verificationId') verificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    this.logger.debug(`User ${userId} canceling verification ${verificationId}`);
    return this.verificationService.cancelVerification(verificationId, userId);
  }

  /**
   * PATCH /verification/:verificationId/complete
   * Mark verification as complete/verified
   * Called after successful identity verification
   *
   * @param verificationId - Verification ID
   * @param userId - Authenticated user ID
   * @returns Updated verification record
   */
  @Patch(':verificationId/complete')
  async completeVerification(
    @Param('verificationId') verificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    this.logger.debug(`Completing verification ${verificationId} for user ${userId}`);
    return this.verificationService.completeVerification(verificationId, userId);
  }

  /**
   * POST /verification/:verificationId/re-verify
   * Initiate re-verification process
   * Allows user to request a new verification if previous one expired/failed
   * Cleans up old expired verification attempts
   *
   * @param verificationId - Original verification ID
   * @param userId - Authenticated user ID
   * @returns New VerificationResponseDto
   */
  @Post(':verificationId/re-verify')
  @HttpCode(HttpStatus.CREATED)
  async reVerify(
    @Param('verificationId') verificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    this.logger.debug(`User ${userId} initiating re-verification for ${verificationId}`);

    // Get original verification to determine type
    const originalVerification = await this.verificationService.getVerification(
      verificationId,
    );

    if (!originalVerification || originalVerification.userId !== userId) {
      throw new Error('Verification not found or unauthorized');
    }

    // Re-request verification of the same type
    return this.verificationService.reVerify(userId, originalVerification.type);
  }

  /**
   * POST /verification/video-upload-complete
   * Confirm video upload completion
   *
   * @param userId - Authenticated user ID
   * @param dto - Video upload completion details
   * @returns VideoUploadResponseDto
   */
  @Post('video-upload-complete')
  @HttpCode(HttpStatus.CREATED)
  async confirmVideoUpload(
    @CurrentUser('sub') userId: string,
    @Body() dto: VideoUploadCompleteDto,
  ) {
    this.logger.debug(`User ${userId} confirming video upload for verification ${dto.verificationId}`);
    return this.videoUploadService.confirmVideoUpload(userId, dto);
  }

  /**
   * GET /verification/user/video-uploads
   * Get all video uploads for authenticated user
   * Useful for retrieving upload history
   *
   * @param userId - Authenticated user ID
   * @returns Array of video upload records
   */
  @Get('user/video-uploads')
  async getUserVideoUploads(@CurrentUser('sub') userId: string) {
    this.logger.debug(`Fetching video uploads for user ${userId}`);
    return this.videoUploadService.getUserVideoUploads(userId);
  }

  /**
   * GET /verification/user/history
   * Get verification history for authenticated user
   * Shows all verification attempts (pending, verified, expired, rejected)
   *
   * @param userId - Authenticated user ID
   * @returns Array of verification records
   */
  @Get('user/history')
  async getVerificationHistory(@CurrentUser('sub') userId: string) {
    this.logger.debug(`Fetching verification history for user ${userId}`);
    return this.verificationService.getVerificationHistory(userId);
  }
}
