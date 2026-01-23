import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VerificationRequestDto } from './dto/verification-request.dto.js';
import { VerificationResponseDto } from './dto/verification-response.dto.js';
import { VideoVerificationService } from './video-challenge.service.js';
import { randomUUID } from 'crypto';
import { VerificationType, VerificationStatus } from '@prisma/client';
import { OtpService } from './services/otp.service.js';
import { PhoneValidationService } from './services/phone-validation.service.js';
import {
  PhoneVerificationRequestDto,
  PhoneVerificationVerifyDto,
} from './dto/phone-verification.dto.js';

/**
 * Verification Service
 * Handles verification requests and management for users
 * Supports multiple verification types: phone, government ID
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  // Verification request expiry duration (in hours)
  private readonly VERIFICATION_EXPIRY_HOURS = 24;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_OTP_ATTEMPTS = 3;

  constructor(
    private prisma: PrismaService,
    private videoVerificationService: VideoVerificationService,
    private otpService: OtpService,
    private phoneValidationService: PhoneValidationService,
  ) {}

  /**
   * Request a new verification
   * Initiates the verification process for the specified type
   *
   * @param userId - The user requesting verification
   * @param request - Verification request details (type, phone number, etc.)
   * @returns VerificationResponseDto with verification ID and next steps
   * @throws BadRequestException if request is invalid or user already has pending verification
   */
  async requestVerification(
    userId: string,
    request: VerificationRequestDto,
  ): Promise<VerificationResponseDto> {
    try {
      // Map DTO string type to Prisma enum
      let verificationType: VerificationType;
      if (request.type === 'PHONE') {
        verificationType = VerificationType.PHONE;
      } else if (request.type === 'GOVERNMENT_ID') {
        verificationType = VerificationType.GOVERNMENT_ID;
      } else if (request.type === 'VIDEO') {
        verificationType = VerificationType.VIDEO;
      } else {
        throw new BadRequestException(`Unknown verification type: ${request.type}`);
      }

      // Validate request based on verification type
      if (request.type === 'PHONE') {
        if (!request.phoneNumber) {
          throw new BadRequestException('Phone number is required for phone verification');
        }
      } else if (request.type === 'VIDEO') {
        if (!request.challengeType) {
          throw new BadRequestException('Challenge type is required for video verification');
        }
      }

      // Check for existing pending verification of same type
      const existingVerification = await this.prisma.verificationRecord.findFirst({
        where: {
          userId,
          type: verificationType,
          status: VerificationStatus.PENDING,
        },
      });

      if (existingVerification) {
        // Check if it's still valid
        if (
          existingVerification.expiresAt &&
          new Date(existingVerification.expiresAt) > new Date()
        ) {
          this.logger.warn(`User ${userId} already has pending ${request.type} verification`);
          throw new BadRequestException(
            `A ${request.type} verification is already in progress. Please complete or wait for it to expire.`,
          );
        }
        // If expired, we'll create a new one
      }

      // Create verification record
      const verificationId = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.VERIFICATION_EXPIRY_HOURS);

      // Prepare provider reference based on verification type
      let providerReference: string | null = null;
      if (request.type === 'PHONE' && request.phoneNumber) {
        providerReference = request.phoneNumber;
      } else if (request.type === 'VIDEO' && request.challengeType) {
        // For video, store challenge type in provider reference
        providerReference = request.challengeType;
      }

      const verification = await this.prisma.verificationRecord.create({
        data: {
          id: verificationId,
          userId,
          type: verificationType,
          status: VerificationStatus.PENDING,
          expiresAt,
          ...(providerReference && { providerReference }),
        },
      });

      this.logger.log(`Verification request created for user ${userId}: ${verificationId}`);

      // Generate appropriate response based on verification type
      return await this.generateVerificationResponse(verification, request);
    } catch (error) {
      this.logger.error(
        `Error requesting verification for user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Generate appropriate response based on verification type
   * Contains next steps and necessary information for user
   *
   * @param verification - Created verification record
   * @param request - Original verification request
   * @returns VerificationResponseDto with type-specific information
   */
  private async generateVerificationResponse(
    verification: any,
    request: VerificationRequestDto,
  ): Promise<VerificationResponseDto> {
    const baseResponse: VerificationResponseDto = {
      verificationId: verification.id,
      type: verification.type,
      expiresAt: verification.expiresAt.toISOString(),
    };

    // Add type-specific response details
    if (request.type === 'PHONE') {
      baseResponse.message =
        'A verification code will be sent to your phone number shortly. Check your SMS for the code.';
    } else if (request.type === 'GOVERNMENT_ID') {
      // Placeholder for government ID verification session
      baseResponse.sessionUrl = `https://api.example.com/verify/session/${verification.id}`;
      baseResponse.message =
        'Please visit the link above to complete government ID verification with our partner provider.';
    } else if (request.type === 'VIDEO') {
      // Generate video challenge and upload URL
      if (!request.challengeType) {
        throw new BadRequestException('Challenge type is required for video verification');
      }

      const challenge = this.videoVerificationService.generateChallenge(request.challengeType);
      const uploadUrl = await this.videoVerificationService.generateUploadUrl(
        verification.userId,
        verification.id,
      );
      const constraints = this.videoVerificationService.getVideoConstraints();

      const videoUploadExpiresAt = new Date();
      videoUploadExpiresAt.setHours(videoUploadExpiresAt.getHours() + 1); // 1 hour for upload

      baseResponse.challenge = challenge;
      baseResponse.videoUploadUrl = uploadUrl;
      baseResponse.videoUploadExpiresAt = videoUploadExpiresAt.toISOString();
      baseResponse.videoMaxFileSize = constraints.maxFileSize;
      baseResponse.videoMinDurationSeconds = constraints.minDurationSeconds;
      baseResponse.videoMaxDurationSeconds = constraints.maxDurationSeconds;
      baseResponse.message =
        'Record a video showing your face completing the challenge. Your video will be securely stored and analyzed for authenticity verification.';
    }

    return baseResponse;
  }

  /**
   * Get verification record by ID
   * Used to check verification status
   *
   * @param verificationId - ID of verification record
   * @returns Verification record or null if not found
   */
  async getVerification(verificationId: string) {
    return this.prisma.verificationRecord.findUnique({
      where: { id: verificationId },
    });
  }

  /**
   * Get pending verifications for a user
   *
   * @param userId - User ID
   * @returns Array of pending verification records
   */
  async getPendingVerifications(userId: string) {
    return this.prisma.verificationRecord.findMany({
      where: {
        userId,
        status: VerificationStatus.PENDING,
        expiresAt: {
          gt: new Date(), // Only return non-expired verifications
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending verification
   * User can cancel their verification attempt
   *
   * @param verificationId - ID of verification to cancel
   * @param userId - User ID (for authorization)
   * @returns Updated verification record
   * @throws Error if verification not found or doesn't belong to user
   */
  async cancelVerification(verificationId: string, userId: string) {
    const verification = await this.getVerification(verificationId);

    if (!verification) {
      throw new BadRequestException('Verification not found');
    }

    if (verification.userId !== userId) {
      throw new BadRequestException('Verification does not belong to this user');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending verifications');
    }

    return this.prisma.verificationRecord.update({
      where: { id: verificationId },
      data: { status: VerificationStatus.REJECTED },
    });
  }

  /**
   * Check and mark expired verifications as expired
   * Should be called periodically or when checking verification status
   *
   * @param userId - User ID (optional, if provided only checks user's verifications)
   * @returns Number of verifications marked as expired
   */
  async markExpiredVerifications(userId?: string): Promise<number> {
    const now = new Date();

    const result = await this.prisma.verificationRecord.updateMany({
      where: {
        ...(userId && { userId }),
        status: VerificationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: VerificationStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Marked ${result.count} verification(s) as expired`);
    }

    return result.count;
  }

  /**
   * Initiate re-verification process
   * Allows user to request a new verification of the same type
   * Handles cleanup of previous expired/rejected attempts
   *
   * @param userId - User ID
   * @param verificationType - Type of verification to re-request
   * @returns VerificationResponseDto for new verification attempt
   */
  async reVerify(userId: string, verificationType: string): Promise<VerificationResponseDto> {
    // Mark any expired verifications first
    await this.markExpiredVerifications(userId);

    // Find old verification attempts to clean up
    const oldVerifications = await this.prisma.verificationRecord.findMany({
      where: {
        userId,
        type: verificationType as VerificationType,
        status: {
          in: [VerificationStatus.EXPIRED, VerificationStatus.REJECTED],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Delete associated video uploads for cleanup
    for (const oldVerification of oldVerifications) {
      if (oldVerification.type === VerificationType.VIDEO) {
        await this.prisma.videoUpload.deleteMany({
          where: { verificationId: oldVerification.id },
        });
      }
    }

    // Keep oldest verification for audit trail, delete others
    if (oldVerifications.length > 1) {
      const verificationIdsToDelete = oldVerifications.slice(1).map((v) => v.id);

      await this.prisma.verificationRecord.deleteMany({
        where: {
          id: {
            in: verificationIdsToDelete,
          },
        },
      });
    }

    // Request new verification
    const request: VerificationRequestDto = {
      type: verificationType as any,
    };

    return this.requestVerification(userId, request);
  }

  /**
   * Check if user has active/verified status for a verification type
   *
   * @param userId - User ID
   * @param verificationType - Type of verification to check
   * @returns true if user has verified status for this type
   */
  async isVerified(userId: string, verificationType: string): Promise<boolean> {
    const verification = await this.prisma.verificationRecord.findFirst({
      where: {
        userId,
        type: verificationType as VerificationType,
        status: VerificationStatus.VERIFIED,
      },
    });

    return !!verification;
  }

  /**
   * Get verification history for a user
   *
   * @param userId - User ID
   * @returns Array of all verification records
   */
  async getVerificationHistory(userId: string) {
    return this.prisma.verificationRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Complete verification (mark as VERIFIED)
   * Called after successful verification of identity
   *
   * @param verificationId - Verification ID
   * @param userId - User ID (for authorization)
   * @returns Updated verification record
   */
  async completeVerification(verificationId: string, userId: string) {
    const verification = await this.getVerification(verificationId);

    if (!verification) {
      throw new BadRequestException('Verification not found');
    }

    if (verification.userId !== userId) {
      throw new BadRequestException('Verification does not belong to this user');
    }

    return this.prisma.verificationRecord.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Request phone number verification with OTP
   * Validates phone number format, checks for duplicates, generates and sends OTP
   *
   * @param userId - User requesting phone verification
   * @param request - Phone verification request with phone number
   * @returns Verification record with masked phone number and expiry
   * @throws BadRequestException if phone is invalid or already verified by another user
   */
  async requestPhoneVerification(userId: string, request: PhoneVerificationRequestDto) {
    // Validate phone number format and normalize to E.164
    const validation = this.phoneValidationService.validatePhoneNumber(request.phoneNumber);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error || 'Invalid phone number');
    }

    const normalizedPhone = validation.e164!;

    // Check if this phone is already verified by another user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        phoneVerified: true,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new BadRequestException('This phone number is already verified by another user');
    }

    // Check for existing pending verification for this user
    const existingVerification = await this.prisma.verificationRecord.findFirst({
      where: {
        userId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingVerification) {
      throw new BadRequestException(
        'A phone verification is already in progress. Please complete or wait for it to expire.',
      );
    }

    // Generate OTP
    const otpCode = this.otpService.generateOtp();
    const hashedOtp = await this.otpService.hashOtp(otpCode);

    // Create verification record
    const verificationId = randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    const verification = await this.prisma.verificationRecord.create({
      data: {
        id: verificationId,
        userId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt,
        providerReference: normalizedPhone,
        metadata: {
          hashedOtp,
          attempts: 0,
        },
      },
    });

    // TODO: In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
    // For now, log the OTP to console for development/testing
    this.logger.log(
      `[DEV MODE] OTP for ${this.phoneValidationService.maskPhoneNumber(normalizedPhone)}: ${otpCode}`,
    );
    this.logger.log(`OTP expires at: ${expiresAt.toISOString()}`);

    return {
      verificationId: verification.id,
      phoneNumber: this.phoneValidationService.maskPhoneNumber(normalizedPhone),
      expiresAt: verification.expiresAt.toISOString(),
      message: `A 6-digit verification code has been sent to ${this.phoneValidationService.maskPhoneNumber(normalizedPhone)}`,
    };
  }

  /**
   * Verify phone OTP code and update user trust score
   * Validates OTP, checks expiry and attempt limits, updates user to ENHANCED level
   *
   * @param userId - User verifying their phone
   * @param request - Verification request with verification ID and OTP code
   * @returns Success confirmation with updated trust level
   * @throws BadRequestException if verification fails (invalid code, expired, max attempts)
   */
  async verifyPhoneOTP(userId: string, request: PhoneVerificationVerifyDto) {
    // Find verification record
    const verification = await this.prisma.verificationRecord.findUnique({
      where: { id: request.verificationId },
    });

    if (!verification) {
      throw new BadRequestException('Verification not found');
    }

    if (verification.userId !== userId) {
      throw new BadRequestException('Verification does not belong to this user');
    }

    if (verification.type !== VerificationType.PHONE) {
      throw new BadRequestException('Not a phone verification');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(`Verification is ${verification.status.toLowerCase()}`);
    }

    // Check if expired
    if (verification.expiresAt && new Date() > verification.expiresAt) {
      await this.prisma.verificationRecord.update({
        where: { id: verification.id },
        data: { status: VerificationStatus.EXPIRED },
      });
      throw new BadRequestException('Verification code has expired');
    }

    // Check attempt limit
    const metadata = verification.metadata as any;
    const attempts = metadata.attempts || 0;

    if (attempts >= this.MAX_OTP_ATTEMPTS) {
      await this.prisma.verificationRecord.update({
        where: { id: verification.id },
        data: { status: VerificationStatus.REJECTED },
      });
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new code.',
      );
    }

    // Validate OTP
    const hashedOtp = metadata.hashedOtp;
    const isValid = await this.otpService.validateOtp(request.code, hashedOtp);

    if (!isValid) {
      // Increment attempt counter
      await this.prisma.verificationRecord.update({
        where: { id: verification.id },
        data: {
          metadata: {
            ...metadata,
            attempts: attempts + 1,
          },
        },
      });

      const remainingAttempts = this.MAX_OTP_ATTEMPTS - attempts - 1;
      throw new BadRequestException(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
      );
    }

    // OTP is valid - update verification record
    await this.prisma.verificationRecord.update({
      where: { id: verification.id },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    // Update user with verified phone and trust score boost
    const phoneNumber = verification.providerReference!;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        phoneVerified: true,
        verificationLevel: 'ENHANCED',
        integrityScore: {
          increment: 0.1, // +0.10 boost for phone verification
        },
      },
    });

    this.logger.log(
      `User ${userId} successfully verified phone ${this.phoneValidationService.maskPhoneNumber(phoneNumber)}`,
    );

    return {
      success: true,
      message: 'Phone number verified successfully',
      verificationLevel: 'ENHANCED',
      integrityBoost: 0.1,
    };
  }
}
