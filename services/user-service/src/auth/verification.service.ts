/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VerificationTokenType } from '@prisma/client';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Verification Token Service
 *
 * Manages verification tokens for user signup, email confirmation, and password reset.
 * Generates, validates, and cleans up verification tokens.
 *
 * Token lifecycle:
 * 1. Generate 6-digit code on signup or password reset request
 * 2. Store in database with type-specific expiration (24 hours for email, 15 minutes for password reset)
 * 3. Verify code on confirmation
 * 4. Invalidate after successful verification or expiration
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly TOKEN_LENGTH = 6;
  private readonly TOKEN_EXPIRATION_HOURS = 24;
  private readonly PASSWORD_RESET_EXPIRATION_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new verification token for a user
   *
   * @param userId - User ID
   * @param email - User's email address
   * @param type - Token type (EMAIL_VERIFICATION or PASSWORD_RESET)
   * @returns 6-digit verification code
   */
  async generateToken(
    userId: string,
    email: string,
    type: VerificationTokenType = VerificationTokenType.EMAIL_VERIFICATION,
  ): Promise<string> {
    try {
      this.logger.debug(`Generating ${type} token for user: ${userId}`);

      // Generate random 6-digit code
      const code = this.generateVerificationCode();

      // Calculate expiration time based on token type
      const expiresAt = new Date();
      if (type === VerificationTokenType.PASSWORD_RESET) {
        expiresAt.setMinutes(expiresAt.getMinutes() + this.PASSWORD_RESET_EXPIRATION_MINUTES);
      } else {
        expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);
      }

      // Invalidate any existing tokens of the same type for this user
      await this.prisma.verificationToken.updateMany({
        where: {
          userId,
          type,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // In E2E mode, delete any existing tokens with the same code to avoid
      // unique constraint violations (token column has global uniqueness).
      // This is safe in E2E because tests run sequentially and verification
      // flows complete quickly.
      if (process.env['E2E_VERIFICATION_CODE']) {
        await this.prisma.verificationToken.deleteMany({
          where: {
            token: code,
          },
        });
      }

      // Create new verification token with attempts initialized to 0
      await this.prisma.verificationToken.create({
        data: {
          userId,
          token: code,
          type,
          expiresAt,
          used: false,
          attempts: 0,
          lockedAt: null,
        },
      });

      this.logger.log(`${type} token generated for user: ${userId}`);
      return code;
    } catch (error: any) {
      this.logger.error(`Failed to generate ${type} token: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate verification token');
    }
  }

  /**
   * Verify a verification code
   *
   * @param email - User's email address
   * @param code - 6-digit verification code
   * @param type - Token type (EMAIL_VERIFICATION or PASSWORD_RESET)
   * @returns User ID if verification succeeds
   * @throws BadRequestException if code is invalid, expired, or max attempts exceeded
   */
  async verifyToken(
    email: string,
    code: string,
    type: VerificationTokenType = VerificationTokenType.EMAIL_VERIFICATION,
  ): Promise<string> {
    try {
      this.logger.debug(`Verifying ${type} token for email: ${email}`);

      // Look up user by email first
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`No user found for email: ${email}`);
        throw new NotFoundException({
          error: 'USER_NOT_FOUND',
          message: 'No user found with this email',
        });
      }

      // Find the most recent unused token of the specified type for this user
      const token = await this.prisma.verificationToken.findFirst({
        where: {
          userId: user.id,
          type,
          used: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!token) {
        this.logger.warn(`No ${type} token found for email: ${email}`);
        throw new NotFoundException({
          error: 'TOKEN_NOT_FOUND',
          message: 'No verification code found for this email',
          details: {
            hint: 'Request a new verification code',
          },
        });
      }

      // Check if token is locked due to too many failed attempts
      if (token.lockedAt) {
        this.logger.warn(`${type} token locked for email: ${email} (too many failed attempts)`);
        throw new BadRequestException({
          error: 'TOKEN_LOCKED',
          message: 'Verification code has been locked due to too many failed attempts',
          details: {
            canResend: true,
            hint: 'Request a new verification code',
          },
        });
      }

      // Check if token has expired
      if (new Date() > token.expiresAt) {
        const expiryMessage =
          type === VerificationTokenType.PASSWORD_RESET
            ? 'valid for 15 minutes'
            : 'valid for 24 hours';
        this.logger.warn(`${type} token expired for email: ${email}`);
        throw new BadRequestException({
          error: 'EXPIRED_CODE',
          message: `Verification code has expired (${expiryMessage})`,
          details: {
            canResend: true,
          },
        });
      }

      // Check if code matches using timing-safe comparison to prevent timing attacks
      const storedBuffer = Buffer.from(token.token, 'utf8');
      const providedBuffer = Buffer.from(code, 'utf8');
      const codeMatches =
        storedBuffer.length === providedBuffer.length &&
        timingSafeEqual(storedBuffer, providedBuffer);

      if (!codeMatches) {
        // Increment attempts counter
        const newAttempts = token.attempts + 1;
        const isLocked = newAttempts >= this.MAX_ATTEMPTS;
        const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - newAttempts);

        // Update token with incremented attempts and lock if necessary
        await this.prisma.verificationToken.update({
          where: { id: token.id },
          data: {
            attempts: newAttempts,
            lockedAt: isLocked ? new Date() : null,
          },
        });

        if (isLocked) {
          this.logger.warn(
            `${type} token locked for email: ${email} after ${newAttempts} failed attempts`,
          );
          throw new BadRequestException({
            error: 'TOKEN_LOCKED',
            message: 'Verification code has been locked due to too many failed attempts',
            details: {
              canResend: true,
              hint: 'Request a new verification code',
            },
          });
        }

        this.logger.warn(
          `Invalid ${type} code for email: ${email} (attempt ${newAttempts}/${this.MAX_ATTEMPTS})`,
        );
        throw new BadRequestException({
          error: 'INVALID_CODE',
          message: 'Verification code is invalid',
          details: {
            remainingAttempts,
          },
        });
      }

      // Mark token as used
      await this.prisma.verificationToken.update({
        where: { id: token.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });

      this.logger.log(`${type} verification successful for email: ${email}`);
      return token.userId;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`${type} verification failed: ${error.message}`, error.stack);
      throw new BadRequestException('Verification failed');
    }
  }

  /**
   * Check if user has a valid verification token
   *
   * @param userId - User ID
   * @returns True if valid token exists
   */
  async hasValidToken(userId: string): Promise<boolean> {
    const token = await this.prisma.verificationToken.findFirst({
      where: {
        userId,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!token;
  }

  /**
   * Get remaining verification attempts
   *
   * @param email - User's email address
   * @returns Number of remaining attempts, or null if no token found
   */
  async getRemainingAttempts(email: string): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    const token = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!token) {
      return null;
    }

    // Return 0 if token is locked, otherwise remaining attempts
    if (token.lockedAt) {
      return 0;
    }

    return Math.max(0, this.MAX_ATTEMPTS - token.attempts);
  }

  /**
   * Clean up expired verification tokens
   * Should be called periodically via cron job
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.verificationToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired verification tokens`);
      return result.count;
    } catch (error: any) {
      this.logger.error(`Failed to cleanup expired tokens: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Generate a random 6-digit verification code
   *
   * In E2E test mode (when E2E_VERIFICATION_CODE env var is set),
   * returns the fixed test code to enable automated testing of
   * the full signup verification flow.
   */
  private generateVerificationCode(): string {
    // Check for E2E test mode - use fixed code for automated testing
    const testCode = process.env['E2E_VERIFICATION_CODE'];
    if (testCode && /^\d{6}$/.test(testCode)) {
      this.logger.debug('Using fixed E2E test verification code');
      return testCode;
    }

    // Generate random 6-digit number
    const min = 100000;
    const max = 999999;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNum.toString();
  }
}
