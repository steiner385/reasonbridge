import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { VerificationService } from './verification.service.js';
import { VerificationRequestDto } from './dto/verification-request.dto.js';
import { VerificationResponseDto } from './dto/verification-response.dto.js';

/**
 * Verification Controller
 * Handles user verification requests for enhanced trust levels
 * Requires authentication - all endpoints require valid JWT
 */
@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);

  constructor(private verificationService: VerificationService) {}

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
}
