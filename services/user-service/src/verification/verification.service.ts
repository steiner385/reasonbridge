import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VerificationRequestDto } from './dto/verification-request.dto.js';
import { VerificationResponseDto } from './dto/verification-response.dto.js';
import { randomUUID } from 'crypto';
import { VerificationType, VerificationStatus } from '@prisma/client';

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

  constructor(private prisma: PrismaService) {}

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
      const verificationType = request.type === 'PHONE' ? VerificationType.PHONE : VerificationType.GOVERNMENT_ID;

      // Validate request based on verification type
      if (request.type === 'PHONE') {
        if (!request.phoneNumber) {
          throw new BadRequestException('Phone number is required for phone verification');
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
        if (existingVerification.expiresAt && new Date(existingVerification.expiresAt) > new Date()) {
          this.logger.warn(
            `User ${userId} already has pending ${request.type} verification`,
          );
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

      const verification = await this.prisma.verificationRecord.create({
        data: {
          id: verificationId,
          userId,
          type: verificationType,
          status: VerificationStatus.PENDING,
          expiresAt,
          // Store phone number in provider_reference for phone verification
          ...(request.type === 'PHONE' && { providerReference: request.phoneNumber }),
        },
      });

      this.logger.log(`Verification request created for user ${userId}: ${verificationId}`);

      // Generate appropriate response based on verification type
      return this.generateVerificationResponse(verification, request);
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
  private generateVerificationResponse(
    verification: any,
    request: VerificationRequestDto,
  ): VerificationResponseDto {
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
}
