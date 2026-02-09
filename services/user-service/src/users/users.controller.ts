/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Put,
  Patch,
  Param,
  UseGuards,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
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
    private readonly usersService: UsersService,
    private readonly feedbackPreferencesService: FeedbackPreferencesService,
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
   * GET /users/:id - Get a user's public profile by ID
   * Public endpoint - no authentication required
   */
  @Get(':id')
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
    const user = await this.usersService.findById(id);
    return new PublicUserResponseDto(user);
  }
}
