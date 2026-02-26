/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ProvisionalAccessService } from './provisional-access.service.js';
import {
  ProvisionalAccessDto,
  AccessRequestDto,
  RequestAccessDto,
  ApproveAccessDto,
} from './dto/provisional-access.dto.js';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

/**
 * ProvisionalAccessController - REST API endpoints for provisional access management
 *
 * Provides endpoints for:
 * - Requesting provisional access to tier-restricted topics
 * - Listing pending access requests (for topic creators)
 * - Approving and denying access requests
 * - Revoking active provisional access
 * - Viewing own active provisional access
 *
 * @remarks
 * All endpoints require JWT authentication.
 * Approval/denial/revocation requires the user to be the topic creator.
 *
 * Provisional access grants 30-day temporary access to restricted topics.
 * This allows lower-tier users to participate in discussions they wouldn't
 * normally have access to, based on the topic creator's discretion.
 *
 * API Endpoints:
 * - POST /topics/:id/request-access - Request provisional access
 * - GET /topics/:id/access-requests - List pending requests (topic creator)
 * - POST /topics/:id/access-requests/:userId/approve - Approve access
 * - POST /topics/:id/access-requests/:userId/deny - Deny access
 * - POST /topics/:id/access/:userId/revoke - Revoke active access
 * - GET /me/provisional-access - List own active access
 */
@Controller()
export class ProvisionalAccessController {
  private readonly logger = new Logger(ProvisionalAccessController.name);

  constructor(
    @Inject(ProvisionalAccessService)
    private readonly provisionalAccessService: ProvisionalAccessService,
  ) {}

  /**
   * POST /topics/:id/request-access - Request provisional access to a topic
   *
   * Creates a pending access request that must be approved by the topic creator.
   * The user must be authenticated but doesn't need to meet the topic's tier
   * requirements (that's the whole point of provisional access).
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @param id - The topic ID to request access to
   * @param data - Optional reason for the request
   *
   * @example
   * ```
   * POST /topics/topic-123/request-access
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * {
   *   "reason": "I have relevant expertise in this area"
   * }
   *
   * Response: 201 Created
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Post('topics/:id/request-access')
  @HttpCode(HttpStatus.CREATED)
  async requestAccess(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() data: RequestAccessDto,
  ): Promise<void> {
    this.logger.log(`POST /topics/${id}/request-access - User ${user.sub}`);

    await this.provisionalAccessService.requestAccess(user.sub, id, data.reason);
  }

  /**
   * GET /topics/:id/access-requests - List pending access requests for a topic
   *
   * Returns all pending access requests for the specified topic.
   * Only the topic creator can view these requests.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @param id - The topic ID
   * @returns Array of AccessRequestDto sorted by creation date (oldest first)
   *
   * @example
   * ```
   * GET /topics/topic-123/access-requests
   * Authorization: Bearer <token>
   *
   * Response:
   * [
   *   {
   *     "id": "req-1",
   *     "userId": "user-456",
   *     "userName": "John Doe",
   *     "topicId": "topic-123",
   *     "topicTitle": "Advanced Climate Science",
   *     "reason": "I have a PhD in this field",
   *     "createdAt": "2025-01-15T10:30:00Z"
   *   }
   * ]
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Get('topics/:id/access-requests')
  async getAccessRequests(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<AccessRequestDto[]> {
    this.logger.debug(`GET /topics/${id}/access-requests - User ${user.sub}`);

    return this.provisionalAccessService.getAccessRequests(id);
  }

  /**
   * POST /topics/:id/access-requests/:userId/approve - Approve an access request
   *
   * Converts a pending request to active provisional access with 30-day duration.
   * Only the topic creator can approve requests.
   *
   * @param user - JWT payload containing the authenticated user's ID (must be topic creator)
   * @param id - The topic ID
   * @param userId - The user ID whose request is being approved
   * @param data - Optional reason for approval
   * @returns ProvisionalAccessDto with the approved access details
   *
   * @example
   * ```
   * POST /topics/topic-123/access-requests/user-456/approve
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * {
   *   "reason": "Welcome to the discussion!"
   * }
   *
   * Response:
   * {
   *   "id": "prov-789",
   *   "userId": "user-456",
   *   "userName": "John Doe",
   *   "topicId": "topic-123",
   *   "topicTitle": "Advanced Climate Science",
   *   "grantedBy": "creator-123",
   *   "grantedByName": "Topic Creator",
   *   "reason": "Welcome to the discussion!",
   *   "expiresAt": "2025-02-14T10:30:00Z",
   *   "status": "ACTIVE",
   *   "createdAt": "2025-01-15T10:30:00Z"
   * }
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Post('topics/:id/access-requests/:userId/approve')
  async approveAccess(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() data: ApproveAccessDto,
  ): Promise<ProvisionalAccessDto> {
    this.logger.log(`POST /topics/${id}/access-requests/${userId}/approve - By ${user.sub}`);

    return this.provisionalAccessService.approveAccess(id, userId, user.sub, data.reason);
  }

  /**
   * POST /topics/:id/access-requests/:userId/deny - Deny an access request
   *
   * Removes the pending access request.
   * Only the topic creator can deny requests.
   *
   * @param user - JWT payload containing the authenticated user's ID (must be topic creator)
   * @param id - The topic ID
   * @param userId - The user ID whose request is being denied
   *
   * @example
   * ```
   * POST /topics/topic-123/access-requests/user-456/deny
   * Authorization: Bearer <token>
   *
   * Response: 204 No Content
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Post('topics/:id/access-requests/:userId/deny')
  @HttpCode(HttpStatus.NO_CONTENT)
  async denyAccess(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    this.logger.log(`POST /topics/${id}/access-requests/${userId}/deny - By ${user.sub}`);

    await this.provisionalAccessService.denyAccess(id, userId, user.sub);
  }

  /**
   * POST /topics/:id/access/:userId/revoke - Revoke active provisional access
   *
   * Immediately terminates active provisional access.
   * Only the topic creator can revoke access.
   *
   * @param user - JWT payload containing the authenticated user's ID (must be topic creator)
   * @param id - The topic ID
   * @param userId - The user ID whose access is being revoked
   *
   * @example
   * ```
   * POST /topics/topic-123/access/user-456/revoke
   * Authorization: Bearer <token>
   *
   * Response: 204 No Content
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Post('topics/:id/access/:userId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAccess(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    this.logger.log(`POST /topics/${id}/access/${userId}/revoke - By ${user.sub}`);

    await this.provisionalAccessService.revokeAccess(id, userId, user.sub);
  }

  /**
   * GET /me/provisional-access - List current user's active provisional access
   *
   * Returns all active, non-expired provisional access grants for the
   * authenticated user.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @returns Array of ProvisionalAccessDto sorted by creation date (newest first)
   *
   * @example
   * ```
   * GET /me/provisional-access
   * Authorization: Bearer <token>
   *
   * Response:
   * [
   *   {
   *     "id": "prov-789",
   *     "userId": "user-123",
   *     "userName": "Current User",
   *     "topicId": "topic-456",
   *     "topicTitle": "Expert Discussion Forum",
   *     "grantedBy": "creator-789",
   *     "grantedByName": "Topic Creator",
   *     "reason": "Approved based on credentials",
   *     "expiresAt": "2025-02-14T10:30:00Z",
   *     "status": "ACTIVE",
   *     "createdAt": "2025-01-15T10:30:00Z"
   *   }
   * ]
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/provisional-access')
  async getMyProvisionalAccess(@CurrentUser() user: JwtPayload): Promise<ProvisionalAccessDto[]> {
    this.logger.debug(`GET /me/provisional-access - User ${user.sub}`);

    return this.provisionalAccessService.getUserProvisionalAccess(user.sub);
  }
}
