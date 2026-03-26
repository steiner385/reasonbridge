/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { TopicAccessService } from './topic-access.service.js';
import {
  GrantAccessDto,
  GrantAccessResponseDto,
  CheckAccessResponseDto,
} from './dto/grant-access.dto.js';

/**
 * Controller for topic access management endpoints.
 *
 * @remarks
 * These endpoints are primarily called by other services (contact-service)
 * for granting access when users accept topic invitations.
 *
 * Endpoints:
 * - POST /topics/:topicId/access/:userId - Grant access to user
 * - GET /topics/:topicId/access/:userId - Check if user has access
 */
@Controller('topics')
export class TopicAccessController {
  constructor(
    @Inject(TopicAccessService) private readonly topicAccessService: TopicAccessService,
  ) {}

  /**
   * Grant a user access to a topic.
   *
   * Called by contact-service when a user accepts a topic invitation.
   * Uses fire-and-forget pattern - idempotent and won't fail if access exists.
   *
   * @param topicId - The topic to grant access to
   * @param userId - The user to grant access to
   * @param dto - Optional source and invitation ID
   * @returns Success status and access ID
   */
  @Post(':topicId/access/:userId')
  async grantAccess(
    @Param('topicId') topicId: string,
    @Param('userId') userId: string,
    @Body() dto: GrantAccessDto,
  ): Promise<GrantAccessResponseDto> {
    const result = await this.topicAccessService.grantAccess(
      topicId,
      userId,
      dto.grantedBy,
      dto.source || 'INVITATION',
      dto.invitationId,
    );

    return {
      success: result.success,
      accessId: result.accessId,
      alreadyGranted: result.alreadyGranted,
    };
  }

  /**
   * Check if a user can access a topic.
   *
   * Returns true if:
   * - Topic is PUBLIC
   * - User is the topic creator
   * - User has an explicit TopicAccess record
   *
   * @param topicId - The topic to check access for
   * @param userId - The user to check access for
   * @returns Access status and reason
   */
  @Get(':topicId/access/:userId')
  async checkAccess(
    @Param('topicId') topicId: string,
    @Param('userId') userId: string,
  ): Promise<CheckAccessResponseDto> {
    const result = await this.topicAccessService.checkAccess(topicId, userId);

    return {
      canAccess: result.canAccess,
      reason: result.reason,
    };
  }
}
