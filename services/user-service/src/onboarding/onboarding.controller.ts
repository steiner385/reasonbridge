/**
 * Onboarding Controller
 * Handles onboarding endpoints including topic selection
 */

import { Controller, Post, Get, Put, Body, UseGuards, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { SelectTopicsRequestDto } from './dto/select-topics.dto';
import { SelectTopicsResponseDto } from './dto/select-topics-response.dto';
import { MarkOrientationRequestDto, MarkOrientationResponseDto } from './dto/mark-orientation.dto';
import { MarkFirstPostRequestDto } from './dto/mark-first-post.dto';
import { OnboardingCompleteResponseDto } from './dto/onboarding-complete.dto';
import { OnboardingProgressResponseDto } from './dto/onboarding-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ValidationErrorResponseDto, UnauthorizedErrorResponseDto } from '../dto/error.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * T100: POST /onboarding/select-topics
   * Select 2-3 topics during onboarding
   */
  @Post('select-topics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select topic interests during onboarding',
    description: 'Choose 2-3 topics to personalize your experience. Priorities: 1=highest, 3=lowest.',
  })
  @ApiBody({ type: SelectTopicsRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topics selected successfully',
    type: SelectTopicsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input (wrong number of topics, invalid priorities, etc.)',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    type: UnauthorizedErrorResponseDto,
  })
  async selectTopics(@Req() req: any, @Body() dto: SelectTopicsRequestDto): Promise<SelectTopicsResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`POST /onboarding/select-topics - userId: ${userId}`);

    return this.onboardingService.selectTopics(userId, dto);
  }

  /**
   * T113: GET /onboarding/progress
   * Get current onboarding progress
   */
  @Get('progress')
  @ApiOperation({
    summary: 'Get onboarding progress',
    description: 'Retrieve current onboarding step and completion percentage',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding progress retrieved successfully',
    type: OnboardingProgressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    type: UnauthorizedErrorResponseDto,
  })
  async getProgress(@Req() req: any): Promise<OnboardingProgressResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`GET /onboarding/progress - userId: ${userId}`);

    return this.onboardingService.getOnboardingProgress(userId);
  }

  /**
   * T116: PUT /onboarding/mark-orientation-viewed
   * Mark orientation as viewed
   */
  @Put('mark-orientation-viewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark orientation as viewed',
    description: 'Update onboarding progress after user completes orientation',
  })
  @ApiBody({ type: MarkOrientationRequestDto, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orientation marked as viewed successfully',
    type: MarkOrientationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    type: UnauthorizedErrorResponseDto,
  })
  async markOrientationViewed(
    @Req() req: any,
    @Body() dto?: MarkOrientationRequestDto,
  ): Promise<MarkOrientationResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`PUT /onboarding/mark-orientation-viewed - userId: ${userId}`);

    return this.onboardingService.markOrientationViewed(userId);
  }

  /**
   * T129: PUT /onboarding/mark-first-post
   * Mark first post as made and complete onboarding
   */
  @Put('mark-first-post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark first post as made',
    description: 'Update onboarding progress after user creates their first post. Completes onboarding.',
  })
  @ApiBody({ type: MarkFirstPostRequestDto, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'First post marked successfully. Onboarding completed.',
    type: OnboardingCompleteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    type: UnauthorizedErrorResponseDto,
  })
  async markFirstPost(
    @Req() req: any,
    @Body() dto?: MarkFirstPostRequestDto,
  ): Promise<OnboardingCompleteResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`PUT /onboarding/mark-first-post - userId: ${userId}, postId: ${dto?.postId}`);

    return this.onboardingService.markFirstPost(userId, dto?.postId, dto?.discussionId);
  }
}
