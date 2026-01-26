import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

/**
 * Verification Token Service
 *
 * Manages email verification tokens for user signup and email confirmation.
 * Generates, validates, and cleans up verification tokens.
 *
 * Token lifecycle:
 * 1. Generate 6-digit code on signup
 * 2. Store in database with 24-hour expiration
 * 3. Verify code on confirmation
 * 4. Invalidate after successful verification or expiration
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly TOKEN_LENGTH = 6;
  private readonly TOKEN_EXPIRATION_HOURS = 24;
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new verification token for a user
   *
   * @param userId - User ID
   * @param email - User's email address
   * @returns 6-digit verification code
   */
  async generateToken(userId: string, email: string): Promise<string> {
    try {
      this.logger.debug(`Generating verification token for user: ${userId}`);

      // Generate random 6-digit code
      const code = this.generateVerificationCode();

      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);

      // Invalidate any existing tokens for this user
      await this.prisma.verificationToken.updateMany({
        where: {
          userId,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // Create new verification token
      await this.prisma.verificationToken.create({
        data: {
          userId,
          email,
          token: code,
          expiresAt,
          attempts: 0,
          used: false,
        },
      });

      this.logger.log(`Verification token generated for user: ${userId}`);
      return code;
    } catch (error: any) {
      this.logger.error(`Failed to generate verification token: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate verification token');
    }
  }

  /**
   * Verify a verification code
   *
   * @param email - User's email address
   * @param code - 6-digit verification code
   * @returns User ID if verification succeeds
   * @throws BadRequestException if code is invalid, expired, or max attempts exceeded
   */
  async verifyToken(email: string, code: string): Promise<string> {
    try {
      this.logger.debug(`Verifying token for email: ${email}`);

      // Find the most recent unused token for this email
      const token = await this.prisma.verificationToken.findFirst({
        where: {
          email,
          used: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!token) {
        this.logger.warn(`No verification token found for email: ${email}`);
        throw new NotFoundException({
          error: 'TOKEN_NOT_FOUND',
          message: 'No verification code found for this email',
          details: {
            hint: 'Request a new verification code',
          },
        });
      }

      // Check if token has expired
      if (new Date() > token.expiresAt) {
        this.logger.warn(`Verification token expired for email: ${email}`);
        throw new BadRequestException({
          error: 'EXPIRED_CODE',
          message: 'Verification code has expired (valid for 24 hours)',
          details: {
            canResend: true,
          },
        });
      }

      // Check if max attempts exceeded
      if (token.attempts >= this.MAX_ATTEMPTS) {
        this.logger.warn(`Max verification attempts exceeded for email: ${email}`);
        throw new BadRequestException({
          error: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum verification attempts exceeded',
          details: {
            canResend: true,
          },
        });
      }

      // Increment attempt counter
      await this.prisma.verificationToken.update({
        where: { id: token.id },
        data: {
          attempts: token.attempts + 1,
        },
      });

      // Check if code matches
      if (token.token !== code) {
        const remainingAttempts = this.MAX_ATTEMPTS - (token.attempts + 1);
        this.logger.warn(`Invalid verification code for email: ${email}, attempts remaining: ${remainingAttempts}`);

        throw new BadRequestException({
          error: 'INVALID_CODE',
          message: 'Verification code is invalid or expired',
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
        },
      });

      this.logger.log(`Verification successful for email: ${email}`);
      return token.userId;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Verification failed: ${error.message}`, error.stack);
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
    const token = await this.prisma.verificationToken.findFirst({
      where: {
        email,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!token) {
      return null;
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
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true },
          ],
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
   */
  private generateVerificationCode(): string {
    // Generate random 6-digit number
    const min = 100000;
    const max = 999999;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNum.toString();
  }
}
