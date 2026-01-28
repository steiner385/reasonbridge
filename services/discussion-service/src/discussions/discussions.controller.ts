/**
 * T016 - Discussion Controller (Feature 009)
 *
 * REST API endpoints for discussion operations
 * Implements T023-T024 in Phase 3 (User Story 1)
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { DiscussionsService, ListDiscussionsQuery } from './discussions.service.js';
import { CreateDiscussionDto } from './dto/create-discussion.dto.js';
import { DiscussionResponseDto, DiscussionDetailDto } from './dto/discussion-response.dto.js';
import { PaginatedResponseDto } from '../dto/pagination.dto.js';

// Placeholder for auth guard (will be implemented in Phase 9)
// For now, we'll extract userId from request.user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
}

@ApiTags('discussions')
@Controller('discussions')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  /**
   * T023 [US1] - Create a new discussion with initial response
   *
   * Rate limit: 5 discussions per day per user
   *
   * @param req - Authenticated request with user info
   * @param dto - Discussion creation data
   * @returns The created discussion with initial response
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'discussion-creation': { limit: 5, ttl: 86400000 } }) // 5 per day
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new discussion',
    description:
      'Creates a discussion with an initial response. Requires verified user account. Rate limited to 5 per day.',
  })
  @ApiResponse({
    status: 201,
    description: 'Discussion created successfully',
    type: DiscussionDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or topic not active',
  })
  @ApiResponse({
    status: 403,
    description: 'User not verified',
  })
  @ApiResponse({
    status: 404,
    description: 'Topic not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (5 discussions per day)',
  })
  async createDiscussion(
    @Req() req: AuthRequest,
    @Body() dto: CreateDiscussionDto,
  ): Promise<DiscussionDetailDto> {
    // TODO: Replace with actual auth guard in Phase 9
    const userId = req.user?.id || 'anonymous';
    return this.discussionsService.createDiscussion(userId, dto);
  }

  /**
   * T024 [US1] - List discussions with filtering and pagination
   *
   * Query parameters:
   * - topicId: Filter by topic ID
   * - status: Filter by status (default: ACTIVE)
   * - sortBy: Sort field (lastActivityAt, createdAt, responseCount)
   * - sortOrder: Sort direction (asc, desc)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50, max: 100)
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of discussions
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @SkipThrottle() // No rate limit on read operations
  @ApiOperation({
    summary: 'List discussions',
    description: 'Retrieve discussions with filtering, sorting, and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Discussions retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async listDiscussions(
    @Query() query: ListDiscussionsQuery,
  ): Promise<PaginatedResponseDto<DiscussionResponseDto>> {
    return this.discussionsService.listDiscussions(query);
  }

  // Future endpoints (Phase 3+):
  // - GET /discussions/:id (getDiscussion)
  // - PATCH /discussions/:id (updateDiscussionStatus - admin only)
}
