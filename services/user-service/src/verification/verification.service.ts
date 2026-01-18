import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationRequestDto } from './dto/verification-request.dto';
import { VerificationResponseDto } from './dto/verification-response.dto';
import { VideoVerificationService } from './video-challenge.service';
import { VerificationType, VerificationStatus } from '@prisma/client';

/**
 * Verification Service
 * Handles verification requests and management for users
 * Supports multiple verification types: email, phone, government ID, video
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly VERIFICATION_EXPIRY_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private videoVerificationService: VideoVerificationService,
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
    // Check for existing non-expired pending verification of the same type
    const existingVerification = await this.prisma.verificationRecord.findFirst({
      where: {
        userId,
        type: request.type as VerificationType,
        status: VerificationStatus.PENDING,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
    });

    if (existingVerification) {
      throw new BadRequestException(
        `User already has a pending ${request.type} verification. Please wait or cancel it first.`,
      );
    }

    // Create verification record with 24-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.VERIFICATION_EXPIRY_HOURS);

    const verification = await this.prisma.verificationRecord.create({
      data: {
        userId,
        type: request.type as VerificationType,
        status: VerificationStatus.PENDING,
        expiresAt,
        providerReference: request.phoneNumber || request.challengeType || null,
      },
    });

    return this.generateVerificationResponse(verification, request);
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

    if (verification.type === VerificationType.PHONE) {
      return {
        ...baseResponse,
        message: `Verification code will be sent to ${request.phoneNumber}`,
      };
    }

    if (verification.type === VerificationType.GOVERNMENT_ID) {
      return {
        ...baseResponse,
        message: 'Please complete government ID verification via third-party service',
        sessionUrl: 'https://verification-provider.example.com/session', // Mock URL
      };
    }

    if (verification.type === VerificationType.VIDEO) {
      const challenge = this.videoVerificationService.generateChallenge(
        request.challengeType || 'RANDOM_PHRASE',
      );
      const uploadUrl = await this.videoVerificationService.generateUploadUrl(
        verification.userId,
        verification.id,
      );

      return {
        ...baseResponse,
        message: 'Please complete video verification',
        challenge,
        videoUploadUrl: uploadUrl,
        videoMaxFileSize: 100 * 1024 * 1024, // 100MB
        videoMinDurationSeconds: 3,
        videoMaxDurationSeconds: 30,
      };
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
    const verification = await this.prisma.verificationRecord.findUnique({
      where: { id: verificationId },
    });

    if (verification && verification.expiresAt && verification.expiresAt < new Date()) {
      // Auto-mark as expired if past expiry time
      if (verification.status === VerificationStatus.PENDING) {
        await this.markVerificationExpired(verificationId);
        verification.status = VerificationStatus.EXPIRED;
      }
    }

    return verification;
  }

  /**
   * Get pending verifications for a user
   *
   * @param userId - User ID
   * @returns Array of pending verification records
   */
  async getPendingVerifications(userId: string) {
    const verifications = await this.prisma.verificationRecord.findMany({
      where: {
        userId,
        status: VerificationStatus.PENDING,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
    });

    return verifications;
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
    const verification = await this.prisma.verificationRecord.findUnique({
      where: { id: verificationId },
    });

    if (!verification || verification.userId !== userId) {
      throw new Error('Verification not found or unauthorized');
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
   * Mark a specific verification as expired
   *
   * @param verificationId - Verification ID
   */
  private async markVerificationExpired(verificationId: string) {
    await this.prisma.verificationRecord.update({
      where: { id: verificationId },
      data: { status: VerificationStatus.EXPIRED },
    });
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
  async reVerify(
    userId: string,
    verificationType: string,
  ): Promise<VerificationResponseDto> {
    // Mark any existing expired/rejected verifications as cleanup
    const oldVerifications = await this.prisma.verificationRecord.findMany({
      where: {
        userId,
        type: verificationType as VerificationType,
        status: {
          in: [VerificationStatus.EXPIRED, VerificationStatus.REJECTED],
        },
      },
    });

    // Delete associated video uploads for cleanup
    for (const oldVerification of oldVerifications) {
      if (oldVerification.type === VerificationType.VIDEO) {
        await this.prisma.videoUpload.deleteMany({
          where: { verificationId: oldVerification.id },
        });
      }
    }

    // Clean up old verification records (keep only recent for audit trail)
    if (oldVerifications.length > 0) {
      const oldestToKeep = oldVerifications[oldVerifications.length - 1];

      await this.prisma.verificationRecord.deleteMany({
        where: {
          userId,
          type: verificationType as VerificationType,
          status: {
            in: [VerificationStatus.EXPIRED, VerificationStatus.REJECTED],
          },
          createdAt: {
            lt: oldestToKeep.createdAt,
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
    const verification = await this.prisma.verificationRecord.findUnique({
      where: { id: verificationId },
    });

    if (!verification || verification.userId !== userId) {
      throw new Error('Verification not found or unauthorized');
    }

    return this.prisma.verificationRecord.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }
}
