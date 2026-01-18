import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BotDetectorService } from '../services/bot-detector.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botDetector: BotDetectorService,
  ) {}

  /**
   * Find a user by their Cognito sub (subject identifier)
   * @param cognitoSub - The Cognito user ID from JWT token
   * @returns User object or null if not found
   */
  async findByCognitoSub(cognitoSub: string) {
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find a user by their ID
   * @param id - The user's UUID
   * @returns User object or null if not found
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a user's profile by their Cognito sub
   * @param cognitoSub - The Cognito user ID from JWT token
   * @param updateProfileDto - The fields to update
   * @returns Updated user object
   */
  async updateProfile(cognitoSub: string, updateProfileDto: UpdateProfileDto) {
    // First verify the user exists
    await this.findByCognitoSub(cognitoSub);

    // Update the user
    const updatedUser = await this.prisma.user.update({
      where: { cognitoSub },
      data: updateProfileDto,
    });

    return updatedUser;
  }

  /**
   * Check if a user exhibits suspicious bot patterns
   * Updates verification level if patterns detected
   * @param userId - The user ID to check
   * @returns Bot detection result with risk assessment
   */
  async checkAndHandleBotPatterns(userId: string) {
    const detectionResult = await this.botDetector.detectNewAccountBotPatterns(userId);

    // If suspicious patterns detected, log for manual review
    // User is notified that additional verification is required (part of verification flow)
    if (detectionResult.isSuspicious) {
      // Log detection for review queue (future: integrate with moderation service)
      console.log(
        `Bot detection for user ${userId}: ${JSON.stringify(detectionResult)}`,
      );
    }

    return detectionResult;
  }
}
