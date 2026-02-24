/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BotDetectorService } from '../services/bot-detector.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

export interface CreateUserData {
  email: string;
  displayName: string;
  cognitoSub: string;
}

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botDetector: BotDetectorService,
  ) {}

  /**
   * Create a new user in the local database
   * @param data - User creation data including Cognito sub
   * @returns Created user object
   */
  async createUser(data: CreateUserData) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { cognitoSub: data.cognitoSub }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        cognitoSub: data.cognitoSub,
        authMethod: 'EMAIL_PASSWORD',
        verificationLevel: 'BASIC',
        trustScoreAbility: 0.5,
        trustScoreBenevolence: 0.5,
        trustScoreIntegrity: 0.5,
        status: 'ACTIVE',
      },
    });

    return user;
  }

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
   * @throws BadRequestException if id is not a valid UUID
   * @throws NotFoundException if user is not found
   */
  async findById(id: string) {
    // Validate UUID format before querying to prevent Prisma errors
    if (!isValidUUID(id)) {
      this.logger.error(
        `Invalid UUID passed to findById: "${id}" (length: ${id.length}, ` +
          `type: ${typeof id}, charCodes: [${id
            .substring(0, 20)
            .split('')
            .map((c) => c.charCodeAt(0))
            .join(', ')}])`,
      );
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
      );
    }

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
   * Update a user's profile by their user ID
   * @param id - The user's UUID
   * @param updateProfileDto - The fields to update
   * @returns Updated user object
   */
  async updateProfileById(id: string, updateProfileDto: UpdateProfileDto) {
    // First verify the user exists
    await this.findById(id);

    // Update the user
    const updatedUser = await this.prisma.user.update({
      where: { id },
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

    // If suspicious patterns detected, mark for manual review
    // User is notified that additional verification is required (part of verification flow)
    // TODO: integrate with moderation service for review queue when implemented

    return detectionResult;
  }

  /**
   * Follow a user
   * @param followerId - The ID of the user who wants to follow
   * @param followedId - The ID of the user to be followed
   * @returns Follow relationship
   * @throws BadRequestException if user tries to follow themselves
   * @throws NotFoundException if followed user doesn't exist
   * @throws ConflictException if already following
   */
  async followUser(followerId: string, followedId: string) {
    // Validate UUID formats
    if (!isValidUUID(followerId)) {
      throw new BadRequestException(`Invalid follower ID format: expected UUID`);
    }
    if (!isValidUUID(followedId)) {
      throw new BadRequestException(`Invalid followed ID format: expected UUID`);
    }

    // Prevent self-follow
    if (followerId === followedId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Verify the user to follow exists
    const userToFollow = await this.prisma.user.findUnique({
      where: { id: followedId },
    });
    if (!userToFollow) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create the follow relationship
    const follow = await this.prisma.userFollow.create({
      data: {
        followerId,
        followedId,
      },
    });

    this.logger.log(`User ${followerId} followed user ${followedId}`);

    return follow;
  }

  /**
   * Unfollow a user
   * @param followerId - The ID of the user who wants to unfollow
   * @param followedId - The ID of the user to be unfollowed
   * @throws BadRequestException if user tries to unfollow themselves
   * @throws NotFoundException if not following the user
   */
  async unfollowUser(followerId: string, followedId: string) {
    // Validate UUID formats
    if (!isValidUUID(followerId)) {
      throw new BadRequestException(`Invalid follower ID format: expected UUID`);
    }
    if (!isValidUUID(followedId)) {
      throw new BadRequestException(`Invalid followed ID format: expected UUID`);
    }

    // Prevent self-unfollow (shouldn't happen but just in case)
    if (followerId === followedId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    // Check if follow relationship exists
    const existingFollow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    if (!existingFollow) {
      throw new NotFoundException('Not following this user');
    }

    // Delete the follow relationship
    await this.prisma.userFollow.delete({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    this.logger.log(`User ${followerId} unfollowed user ${followedId}`);
  }

  /**
   * Check if a user is following another user
   * @param followerId - The potential follower's ID
   * @param followedId - The potential followed user's ID
   * @returns Whether the follow relationship exists
   */
  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    // Validate UUID formats
    if (!isValidUUID(followerId) || !isValidUUID(followedId)) {
      return false;
    }

    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    return !!follow;
  }

  /**
   * Get follower count for a user
   * @param userId - The user's ID
   * @returns Number of followers
   */
  async getFollowerCount(userId: string): Promise<number> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    return this.prisma.userFollow.count({
      where: { followedId: userId },
    });
  }

  /**
   * Get following count for a user
   * @param userId - The user's ID
   * @returns Number of users being followed
   */
  async getFollowingCount(userId: string): Promise<number> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    return this.prisma.userFollow.count({
      where: { followerId: userId },
    });
  }

  /**
   * Update a user's avatar URL and S3 key
   * @param userId - The user's UUID
   * @param avatarUrl - The public URL of the avatar
   * @param avatarS3Key - The S3 object key for deletion
   * @returns Updated user object
   */
  async updateAvatar(userId: string, avatarUrl: string, avatarS3Key: string) {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    // Verify user exists
    await this.findById(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        avatarS3Key,
      },
    });

    this.logger.log(`Avatar updated for user ${userId}`);

    return updatedUser;
  }

  /**
   * Get a user's current avatar S3 key (for deletion before replacing)
   * @param userId - The user's UUID
   * @returns The S3 key or null if no avatar exists
   */
  async getAvatarS3Key(userId: string): Promise<string | null> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarS3Key: true },
    });

    return user?.avatarS3Key ?? null;
  }

  /**
   * Remove a user's avatar (clear URL and S3 key)
   * @param userId - The user's UUID
   * @returns Updated user object
   */
  async removeAvatar(userId: string) {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    // Verify user exists
    await this.findById(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
        avatarS3Key: null,
      },
    });

    this.logger.log(`Avatar removed for user ${userId}`);

    return updatedUser;
  }

  /**
   * Get a user's followers with pagination
   * @param userId - The user's ID
   * @param options - Pagination options
   * @returns Paginated list of followers
   */
  async getFollowers(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{
    followers: Array<{
      id: string;
      displayName: string | null;
      followedAt: Date;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    const { limit = 20, offset = 0 } = options;

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get followers with user data
    const [follows, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followedId: userId },
        include: {
          follower: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.userFollow.count({
        where: { followedId: userId },
      }),
    ]);

    return {
      followers: follows.map((f) => ({
        id: f.follower.id,
        displayName: f.follower.displayName,
        followedAt: f.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get users a user is following with pagination
   * @param userId - The user's ID
   * @param options - Pagination options
   * @returns Paginated list of followed users
   */
  async getFollowing(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{
    following: Array<{
      id: string;
      displayName: string | null;
      followedAt: Date;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    const { limit = 20, offset = 0 } = options;

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get following with user data
    const [follows, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: userId },
        include: {
          followed: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.userFollow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      following: follows.map((f) => ({
        id: f.followed.id,
        displayName: f.followed.displayName,
        followedAt: f.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }
}
