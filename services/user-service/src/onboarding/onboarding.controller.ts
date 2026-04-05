/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Onboarding Controller
 * Handles onboarding endpoints including topic selection
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OnboardingService } from './onboarding.service';
import { SelectTopicsRequestDto } from './dto/select-topics.dto';
import { SelectTopicsResponseDto } from './dto/select-topics-response.dto';
import { MarkOrientationRequestDto, MarkOrientationResponseDto } from './dto/mark-orientation.dto';
import { MarkFirstPostRequestDto } from './dto/mark-first-post.dto';
import { OnboardingCompleteResponseDto } from './dto/onboarding-complete.dto';
import { OnboardingProgressResponseDto } from './dto/onboarding-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ValidationErrorResponseDto, UnauthorizedErrorResponseDto } from '../dto/error.dto';

/**
 * JWT user payload attached to request by auth guard
 */
interface JwtUserPayload {
  id?: string;
  sub?: string;
}

/**
 * Request with authenticated user from JWT
 */
interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}

/**
 * Extract user ID from JWT payload (id or sub claim)
 */
function getUserId(user: JwtUserPayload): string {
  const userId = user.id || user.sub;
  if (!userId) {
    throw new UnauthorizedException('Invalid token: missing user identifier');
  }
  return userId;
}

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(@Inject(OnboardingService) private readonly onboardingService: OnboardingService) {}

  /**
   * T100: POST /onboarding/select-topics
   * Select 2-3 topics during onboarding
   */
  @Post('select-topics')
  @HttpCode(HttpStatus.OK)
  async selectTopics(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SelectTopicsRequestDto,
  ): Promise<SelectTopicsResponseDto> {
    const userId = getUserId(req.user);
    this.logger.log(`POST /onboarding/select-topics - userId: ${userId}`);

    return this.onboardingService.selectTopics(userId, dto);
  }

  /**
   * T113: GET /onboarding/progress
   * Get current onboarding progress
   */
  @Get('progress')
  async getProgress(@Req() req: AuthenticatedRequest): Promise<OnboardingProgressResponseDto> {
    const userId = getUserId(req.user);
    this.logger.log(`GET /onboarding/progress - userId: ${userId}`);

    return this.onboardingService.getOnboardingProgress(userId);
  }

  /**
   * T116: PUT /onboarding/mark-orientation-viewed
   * Mark orientation as viewed
   */
  @Put('mark-orientation-viewed')
  @HttpCode(HttpStatus.OK)
  async markOrientationViewed(
    @Req() req: AuthenticatedRequest,
    @Body() _dto?: MarkOrientationRequestDto,
  ): Promise<MarkOrientationResponseDto> {
    const userId = getUserId(req.user);
    this.logger.log(`PUT /onboarding/mark-orientation-viewed - userId: ${userId}`);

    return this.onboardingService.markOrientationViewed(userId);
  }

  /**
   * T129: PUT /onboarding/mark-first-post
   * Mark first post as made and complete onboarding
   */
  @Put('mark-first-post')
  @HttpCode(HttpStatus.OK)
  async markFirstPost(
    @Req() req: AuthenticatedRequest,
    @Body() dto?: MarkFirstPostRequestDto,
  ): Promise<OnboardingCompleteResponseDto> {
    const userId = getUserId(req.user);
    this.logger.log(`PUT /onboarding/mark-first-post - userId: ${userId}, postId: ${dto?.postId}`);

    return this.onboardingService.markFirstPost(userId, dto?.postId, dto?.discussionId);
  }
}
