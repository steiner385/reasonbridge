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
  Inject,
} from '@nestjs/common';
import { isValidUUID } from '@reason-bridge/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BotDetectorService, type BotDetectionResult } from '../services/bot-detector.service.js';
import type { User, UserFollow } from '@prisma/client';
import { ModerationServiceClient } from '../clients/moderation-service.client.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import {
  ProfileVisibility,
  TrustVisibility,
  PrivacySettingsResponseDto,
  type UpdatePrivacySettingsDto,
} from './dto/privacy-settings.dto.js';
import {
  NotificationPreferencesResponseDto,
  type UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto.js';
import type { AvatarUrls } from '../services/s3.service.js';

export interface CreateUserData {
  email: string;
  displayName: string;
  cognitoSub: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BotDetectorService) private readonly botDetector: BotDetectorService,
    @Inject(ModerationServiceClient) private readonly moderationClient: ModerationServiceClient,
  ) {}

  /**
   * Create a new user in the local database
   * @param data - User creation data including Cognito sub
   * @returns Created user object
   */
  async createUser(data: CreateUserData): Promise<User> {
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
  async findByCognitoSub(cognitoSub: string): Promise<User> {
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
  async findById(id: string): Promise<User> {
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
      include: {
        privacySettings: true,
      },
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
  async updateProfile(cognitoSub: string, updateProfileDto: UpdateProfileDto): Promise<User> {
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
  async updateProfileById(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
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
  async checkAndHandleBotPatterns(userId: string): Promise<BotDetectionResult> {
    const detectionResult = await this.botDetector.detectNewAccountBotPatterns(userId);

    // If suspicious patterns detected, flag for moderator review
    // Uses fire-and-forget pattern - failures don't block the detection flow
    if (detectionResult.isSuspicious) {
      this.logger.log(
        `Bot patterns detected for user ${userId}, risk score: ${detectionResult.riskScore}`,
      );

      // Flag user for moderation review (fire-and-forget)
      this.moderationClient
        .tryFlagUserAsBot({
          userId,
          riskScore: detectionResult.riskScore,
          patterns: detectionResult.patterns,
          reasoning: detectionResult.reasoning,
        })
        .catch((error) => {
          // Log but don't throw - moderation is non-blocking
          this.logger.warn(
            `Failed to flag user ${userId} for moderation: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    }

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
  async followUser(followerId: string, followedId: string): Promise<UserFollow> {
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
  async unfollowUser(followerId: string, followedId: string): Promise<void> {
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
  async updateAvatar(userId: string, avatarUrl: string, avatarS3Key: string): Promise<User> {
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
   * Find a user's current avatar S3 key (for deletion before replacing).
   *
   * @param userId - The user's UUID
   * @returns The S3 key if found, null if no avatar exists
   * @throws {BadRequestException} When userId is not a valid UUID
   */
  async findAvatarS3Key(userId: string): Promise<string | null> {
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
  async removeAvatar(userId: string): Promise<User> {
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

  /**
   * Search users for @mention autocomplete
   * Prioritizes topic participants over other users
   * @param query - Search query string (matches displayName or email)
   * @param topicId - Optional topic ID to prioritize participants
   * @param limit - Maximum number of results (default 10)
   * @returns Array of users with id and displayName
   */
  async searchUsers(
    query: string,
    topicId?: string,
    limit = 10,
  ): Promise<{ id: string; displayName: string }[]> {
    if (!query || query.length < 1) return [];

    // First, get topic participants if topicId provided
    let participantIds: string[] = [];
    if (topicId) {
      if (!isValidUUID(topicId)) {
        throw new BadRequestException(`Invalid topic ID format: expected UUID`);
      }
      const participants = await this.prisma.response.findMany({
        where: { topicId },
        select: { authorId: true },
        distinct: ['authorId'],
        take: 1000, // Limit to prevent unbounded results
      });
      participantIds = participants.map((p) => p.authorId);
    }

    // Search users matching query.
    // SECURITY: match on displayName ONLY. Matching on email allowed anyone to
    // submit a full/partial email (or domain) and learn whether an active
    // account exists plus its display name — linking real-world emails to
    // platform identities (privacy leak / account enumeration). @mention
    // autocomplete only ever needs display names.
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { displayName: { contains: query, mode: 'insensitive' } },
          { accountStatus: 'ACTIVE' },
        ],
      },
      select: { id: true, displayName: true },
      take: limit * 2, // Get extra to sort
      orderBy: { displayName: 'asc' },
    });

    // Sort: participants first, then others
    const participantSet = new Set(participantIds);
    const sorted = users.sort((a, b) => {
      const aIsParticipant = participantSet.has(a.id);
      const bIsParticipant = participantSet.has(b.id);
      if (aIsParticipant && !bIsParticipant) return -1;
      if (!aIsParticipant && bIsParticipant) return 1;
      return 0;
    });

    return sorted.slice(0, limit).map((u) => ({
      id: u.id,
      displayName: u.displayName || 'Anonymous',
    }));
  }

  /**
   * Get a user's privacy settings
   * Returns defaults if no settings exist yet
   * @param userId - The user's UUID
   * @returns Privacy settings with metadata
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettingsResponseDto> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    // Verify user exists
    await this.findById(userId);

    // Get existing settings or create defaults
    let settings = await this.prisma.userPrivacySettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create default settings for the user
      settings = await this.prisma.userPrivacySettings.create({
        data: {
          userId,
          activityHistory: ProfileVisibility.PUBLIC,
          detailedTrustScores: ProfileVisibility.PUBLIC,
          followerList: ProfileVisibility.PUBLIC,
          followingList: ProfileVisibility.PUBLIC,
        },
      });
      this.logger.log(`Created default privacy settings for user ${userId}`);
    }

    return new PrivacySettingsResponseDto(
      userId,
      {
        activityHistory: settings.activityHistory as ProfileVisibility,
        detailedTrustScores: settings.detailedTrustScores as TrustVisibility,
        followerList: settings.followerList as ProfileVisibility,
        followingList: settings.followingList as ProfileVisibility,
      },
      settings.updatedAt,
    );
  }

  /**
   * Update a user's privacy settings
   * @param userId - The user's UUID
   * @param updateDto - Partial privacy settings to update
   * @returns Updated privacy settings with metadata
   */
  async updatePrivacySettings(
    userId: string,
    updateDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponseDto> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    // Verify user exists
    await this.findById(userId);

    // Upsert settings (create if not exists, update if exists)
    const settings = await this.prisma.userPrivacySettings.upsert({
      where: { userId },
      create: {
        userId,
        activityHistory: updateDto.activityHistory ?? ProfileVisibility.PUBLIC,
        detailedTrustScores: updateDto.detailedTrustScores ?? TrustVisibility.PUBLIC,
        followerList: updateDto.followerList ?? ProfileVisibility.PUBLIC,
        followingList: updateDto.followingList ?? ProfileVisibility.PUBLIC,
      },
      update: {
        ...(updateDto.activityHistory !== undefined && {
          activityHistory: updateDto.activityHistory,
        }),
        ...(updateDto.detailedTrustScores !== undefined && {
          detailedTrustScores: updateDto.detailedTrustScores,
        }),
        ...(updateDto.followerList !== undefined && {
          followerList: updateDto.followerList,
        }),
        ...(updateDto.followingList !== undefined && {
          followingList: updateDto.followingList,
        }),
      },
    });

    this.logger.log(`Updated privacy settings for user ${userId}`);

    return new PrivacySettingsResponseDto(
      userId,
      {
        activityHistory: settings.activityHistory as ProfileVisibility,
        detailedTrustScores: settings.detailedTrustScores as TrustVisibility,
        followerList: settings.followerList as ProfileVisibility,
        followingList: settings.followingList as ProfileVisibility,
      },
      settings.updatedAt,
    );
  }

  /**
   * Check if a viewer can see a specific section of a user's profile
   * @param targetUserId - The profile being viewed
   * @param viewerId - The user viewing the profile (null if anonymous)
   * @param section - Which section to check
   * @returns Whether the viewer can see the section
   */
  async canViewSection(
    targetUserId: string,
    viewerId: string | null,
    section: 'activityHistory' | 'detailedTrustScores' | 'followerList' | 'followingList',
  ): Promise<boolean> {
    if (!isValidUUID(targetUserId)) {
      return false;
    }

    // Users can always view their own profile sections
    if (viewerId === targetUserId) {
      return true;
    }

    // Get the target user's privacy settings
    let settings = await this.prisma.userPrivacySettings.findUnique({
      where: { userId: targetUserId },
    });

    // Default to public if no settings exist
    if (!settings) {
      return true;
    }

    const visibility = settings[section] as ProfileVisibility;

    // PUBLIC is visible to everyone
    if (visibility === ProfileVisibility.PUBLIC) {
      return true;
    }

    // PRIVATE is visible only to the user themselves (already handled above)
    if (visibility === ProfileVisibility.PRIVATE) {
      return false;
    }

    // FOLLOWERS_ONLY requires checking the follow relationship
    if (visibility === ProfileVisibility.FOLLOWERS_ONLY) {
      if (!viewerId || !isValidUUID(viewerId)) {
        return false;
      }
      return this.isFollowing(viewerId, targetUserId);
    }

    return false;
  }

  /**
   * Update user's avatar URLs and hash
   * @param userId - User ID
   * @param avatarUrls - Structured URLs for all avatar variants
   * @param avatarHash - Hash used for S3 folder path
   * @throws BadRequestException if userId is not a valid UUID
   * @throws NotFoundException if user is not found
   */
  async updateAvatarUrls(
    userId: string,
    avatarUrls: AvatarUrls,
    avatarHash: string,
  ): Promise<void> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    // Verify user exists
    await this.findById(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrls: avatarUrls as never,
        avatarHash,
      },
    });
  }

  /**
   * Find a user's avatar hash for S3 folder management.
   *
   * @param userId - The user's UUID
   * @returns Avatar hash if found, null if not set
   * @throws {BadRequestException} When userId is not a valid UUID
   */
  async findAvatarHash(userId: string): Promise<string | null> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarHash: true },
    });

    return user?.avatarHash ?? null;
  }

  /**
   * Get a user's notification preferences
   * @param userId - The user's UUID
   * @returns Notification preferences with metadata
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        notifyByEmail: true,
        notifyByPush: true,
        fcmToken: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return new NotificationPreferencesResponseDto(
      userId,
      {
        emailNotifications: user.notifyByEmail,
        pushNotifications: user.notifyByPush,
        // weeklyDigest is stored as notifyByEmail for now (single email preference)
        // TODO: Add separate weeklyDigest field to User model if needed
        weeklyDigest: user.notifyByEmail,
      },
      user.updatedAt,
      !!user.fcmToken,
    );
  }

  /**
   * Update a user's notification preferences
   * @param userId - The user's UUID
   * @param updateDto - Partial notification preferences to update
   * @returns Updated notification preferences with metadata
   */
  async updateNotificationPreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    if (!isValidUUID(userId)) {
      throw new BadRequestException(`Invalid user ID format: expected UUID`);
    }

    // Verify user exists
    await this.findById(userId);

    // Build update data
    const updateData: { notifyByEmail?: boolean; notifyByPush?: boolean } = {};

    if (updateDto.emailNotifications !== undefined) {
      updateData.notifyByEmail = updateDto.emailNotifications;
    }

    if (updateDto.pushNotifications !== undefined) {
      updateData.notifyByPush = updateDto.pushNotifications;
    }

    // weeklyDigest uses the same field as emailNotifications for now
    if (updateDto.weeklyDigest !== undefined && updateDto.emailNotifications === undefined) {
      updateData.notifyByEmail = updateDto.weeklyDigest;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        notifyByEmail: true,
        notifyByPush: true,
        fcmToken: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Updated notification preferences for user ${userId}`);

    return new NotificationPreferencesResponseDto(
      userId,
      {
        emailNotifications: user.notifyByEmail,
        pushNotifications: user.notifyByPush,
        weeklyDigest: user.notifyByEmail,
      },
      user.updatedAt,
      !!user.fcmToken,
    );
  }
}
