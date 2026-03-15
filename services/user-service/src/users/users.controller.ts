/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Body,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { OptionalCacheInterceptor } from '../interceptors/optional-cache.interceptor.js';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UserResponseDto, PublicUserResponseDto } from './dto/user-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FeedbackPreferencesService } from '../services/feedback-preferences.service.js';
import {
  UpdateFeedbackPreferencesDto,
  FeedbackToggleDto,
  FeedbackPreferencesResponseDto,
} from './dto/feedback-preferences.dto.js';
import {
  FollowResponseDto,
  FollowStatusDto,
  FollowersResponseDto,
  FollowingResponseDto,
} from './dto/follow.dto.js';
import {
  UpdatePrivacySettingsDto,
  PrivacySettingsResponseDto,
} from './dto/privacy-settings.dto.js';
import { ContributionsService } from '../contributions/contributions.service.js';
import type {
  ContributionType,
  ContributionsResponseDto,
  ContributionStatsDto,
} from '../contributions/dto/contribution.dto.js';

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(FeedbackPreferencesService)
    private readonly feedbackPreferencesService: FeedbackPreferencesService,
    @Inject(ContributionsService)
    private readonly contributionsService: ContributionsService,
  ) {}

  /**
   * GET /users/me - Get current authenticated user's profile
   * Requires Bearer token in Authorization header
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() jwtPayload: JwtPayload): Promise<UserResponseDto> {
    // JWT sub claim now contains user.id (UUID), not cognitoSub
    const user = await this.usersService.findById(jwtPayload.sub);
    return new UserResponseDto(user);
  }

  /**
   * PUT /users/me - Update current authenticated user's profile
   * Requires Bearer token in Authorization header
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // JWT sub claim now contains user.id (UUID), not cognitoSub
    const updatedUser = await this.usersService.updateProfileById(jwtPayload.sub, updateProfileDto);
    return new UserResponseDto(updatedUser);
  }

  /**
   * GET /users/me/feedback - Get current user's feedback preferences
   * Requires Bearer token in Authorization header
   */
  @Get('me/feedback')
  @UseGuards(JwtAuthGuard)
  async getFeedbackPreferences(
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<FeedbackPreferencesResponseDto> {
    // JWT sub claim now contains user.id (UUID), not cognitoSub
    return this.feedbackPreferencesService.getPreferencesById(jwtPayload.sub);
  }

  /**
   * PATCH /users/me/feedback - Update feedback preferences
   * Allows partial updates of feedback preferences
   * Requires Bearer token in Authorization header
   */
  @Patch('me/feedback')
  @UseGuards(JwtAuthGuard)
  async updateFeedbackPreferences(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() updateDto: UpdateFeedbackPreferencesDto,
  ): Promise<FeedbackPreferencesResponseDto> {
    // JWT sub claim now contains user.id (UUID), not cognitoSub
    return this.feedbackPreferencesService.updatePreferencesById(jwtPayload.sub, updateDto);
  }

  /**
   * PUT /users/me/feedback/toggle - Toggle feedback on/off
   * Convenience endpoint for simple enable/disable
   * Requires Bearer token in Authorization header
   */
  @Put('me/feedback/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleFeedback(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() toggleDto: FeedbackToggleDto,
  ): Promise<FeedbackPreferencesResponseDto> {
    // JWT sub claim now contains user.id (UUID), not cognitoSub
    return this.feedbackPreferencesService.toggleFeedbackById(jwtPayload.sub, toggleDto.enabled);
  }

  /**
   * GET /users/me/privacy - Get current user's privacy settings
   * Requires Bearer token in Authorization header
   */
  @Get('me/privacy')
  @UseGuards(JwtAuthGuard)
  async getPrivacySettings(
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<PrivacySettingsResponseDto> {
    return this.usersService.getPrivacySettings(jwtPayload.sub);
  }

  /**
   * PUT /users/me/privacy - Update current user's privacy settings
   * Requires Bearer token in Authorization header
   */
  @Put('me/privacy')
  @UseGuards(JwtAuthGuard)
  async updatePrivacySettings(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() updateDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponseDto> {
    return this.usersService.updatePrivacySettings(jwtPayload.sub, updateDto);
  }

  /**
   * PATCH /users/me/privacy - Partially update current user's privacy settings
   * Requires Bearer token in Authorization header
   */
  @Patch('me/privacy')
  @UseGuards(JwtAuthGuard)
  async patchPrivacySettings(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() updateDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponseDto> {
    return this.usersService.updatePrivacySettings(jwtPayload.sub, updateDto);
  }

  /**
   * GET /users/search - Search users for @mention autocomplete
   * Public endpoint - no authentication required
   * Prioritizes topic participants when topicId is provided
   */
  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('topicId') topicId?: string,
    @Query('limit') limitStr?: string,
  ): Promise<{ id: string; displayName: string }[]> {
    const limit = Math.min(Math.max(parseInt(limitStr || '10', 10) || 10, 1), 50);
    return this.usersService.searchUsers(query, topicId, limit);
  }

  /**
   * GET /users/:id - Get a user's public profile by ID
   * Public endpoint - no authentication required
   * Cached for 30 minutes (1800 seconds)
   */
  @Get(':id')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(1800000) // 30 minutes in ms
  async getUserById(@Param('id') id: string): Promise<PublicUserResponseDto> {
    // Validate UUID format to prevent Prisma errors and aid debugging
    if (!isValidUUID(id)) {
      this.logger.warn(
        `Invalid UUID format in getUserById: "${id}" (length: ${id.length}, ` +
          `charCodes: [${id
            .substring(0, 10)
            .split('')
            .map((c) => c.charCodeAt(0))
            .join(', ')}])`,
      );
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
      );
    }

    this.logger.debug(`Fetching user by ID: ${id}`);
    const [user, followerCount, followingCount] = await Promise.all([
      this.usersService.findById(id),
      this.usersService.getFollowerCount(id),
      this.usersService.getFollowingCount(id),
    ]);
    return new PublicUserResponseDto(user, followerCount, followingCount);
  }

  /**
   * GET /users/:id/contributions - Get a user's contributions with pagination
   * Public endpoint - no authentication required
   */
  @Get(':id/contributions')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  async getUserContributions(
    @Param('id') id: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('type') type?: ContributionType,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<ContributionsResponseDto> {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
      );
    }

    const page = Math.max(parseInt(pageStr || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);

    return this.contributionsService.getContributions(id, { page, limit, type, sortOrder });
  }

  /**
   * GET /users/:id/contributions/stats - Get a user's contribution statistics
   * Public endpoint - no authentication required
   */
  @Get(':id/contributions/stats')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  async getUserContributionStats(@Param('id') id: string): Promise<ContributionStatsDto> {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
      );
    }

    return this.contributionsService.getContributionStats(id);
  }

  /**
   * POST /users/:id/follow - Follow a user
   * Requires Bearer token in Authorization header
   */
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async followUser(
    @CurrentUser() jwtPayload: JwtPayload,
    @Param('id') followedId: string,
  ): Promise<FollowResponseDto> {
    // Validate UUID format
    if (!isValidUUID(followedId)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${followedId.substring(0, 50)}${followedId.length > 50 ? '...' : ''}"`,
      );
    }

    const follow = await this.usersService.followUser(jwtPayload.sub, followedId);

    return new FollowResponseDto({
      success: true,
      message: 'Successfully followed user',
      isFollowing: true,
      followedUserId: followedId,
      followedAt: follow.createdAt,
    });
  }

  /**
   * DELETE /users/:id/follow - Unfollow a user
   * Requires Bearer token in Authorization header
   */
  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowUser(
    @CurrentUser() jwtPayload: JwtPayload,
    @Param('id') followedId: string,
  ): Promise<FollowResponseDto> {
    // Validate UUID format
    if (!isValidUUID(followedId)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${followedId.substring(0, 50)}${followedId.length > 50 ? '...' : ''}"`,
      );
    }

    await this.usersService.unfollowUser(jwtPayload.sub, followedId);

    return new FollowResponseDto({
      success: true,
      message: 'Successfully unfollowed user',
      isFollowing: false,
      followedUserId: followedId,
    });
  }

  /**
   * GET /users/:id/follow - Check follow status for a user
   * Requires Bearer token in Authorization header
   * Returns follow status and counts
   */
  @Get(':id/follow')
  @UseGuards(JwtAuthGuard)
  async getFollowStatus(
    @CurrentUser() jwtPayload: JwtPayload,
    @Param('id') userId: string,
  ): Promise<FollowStatusDto> {
    // Validate UUID format
    if (!isValidUUID(userId)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${userId.substring(0, 50)}${userId.length > 50 ? '...' : ''}"`,
      );
    }

    const [isFollowing, followerCount, followingCount] = await Promise.all([
      this.usersService.isFollowing(jwtPayload.sub, userId),
      this.usersService.getFollowerCount(userId),
      this.usersService.getFollowingCount(userId),
    ]);

    return new FollowStatusDto({
      isFollowing,
      followerCount,
      followingCount,
    });
  }

  /**
   * GET /users/:id/followers - Get a user's followers
   * Public endpoint - no authentication required
   * Supports pagination via limit and offset query params
   * Cached for 1 hour (3600 seconds)
   */
  @Get(':id/followers')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(3600000) // 1 hour in ms
  async getFollowers(
    @Param('id') userId: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<FollowersResponseDto> {
    // Validate UUID format
    if (!isValidUUID(userId)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${userId.substring(0, 50)}${userId.length > 50 ? '...' : ''}"`,
      );
    }

    // Parse pagination params with defaults
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0);

    const result = await this.usersService.getFollowers(userId, { limit, offset });

    return new FollowersResponseDto(result);
  }

  /**
   * GET /users/:id/following - Get users a user is following
   * Public endpoint - no authentication required
   * Supports pagination via limit and offset query params
   * Cached for 1 hour (3600 seconds)
   */
  @Get(':id/following')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(3600000) // 1 hour in ms
  async getFollowing(
    @Param('id') userId: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<FollowingResponseDto> {
    // Validate UUID format
    if (!isValidUUID(userId)) {
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${userId.substring(0, 50)}${userId.length > 50 ? '...' : ''}"`,
      );
    }

    // Parse pagination params with defaults
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0);

    const result = await this.usersService.getFollowing(userId, { limit, offset });

    return new FollowingResponseDto(result);
  }
}
