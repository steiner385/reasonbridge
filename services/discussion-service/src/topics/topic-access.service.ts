/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessSource } from '@prisma/client';

export interface GrantAccessResult {
  success: boolean;
  accessId?: string;
  alreadyGranted?: boolean;
}

export interface CheckAccessResult {
  canAccess: boolean;
  reason?: 'public' | 'creator' | 'explicit_grant' | 'denied';
}

/**
 * Service for managing explicit topic access grants.
 *
 * @remarks
 * This service handles access control for private/unlisted topics:
 * - Grant access when users accept topic invitations
 * - Check if users can access specific topics
 * - Support direct grants by moderators/creators
 *
 * Access is granted through multiple channels:
 * - INVITATION: User accepted an invitation
 * - DIRECT_GRANT: Moderator/creator granted access directly
 * - CREATOR: Automatic access for topic creator
 */
@Injectable()
export class TopicAccessService {
  private readonly logger = new Logger(TopicAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grant a user access to a topic.
   *
   * @param topicId - The topic to grant access to
   * @param userId - The user to grant access to
   * @param grantedBy - Optional ID of user granting access
   * @param source - How the access was granted (default: INVITATION)
   * @param invitationId - Optional invitation ID that triggered the grant
   * @returns Grant result with success status and access ID
   */
  async grantAccess(
    topicId: string,
    userId: string,
    grantedBy?: string,
    source: AccessSource = 'INVITATION',
    invitationId?: string,
  ): Promise<GrantAccessResult> {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true, visibility: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    // Use upsert to handle idempotent access grants
    const access = await this.prisma.topicAccess.upsert({
      where: {
        topicId_userId: { topicId, userId },
      },
      create: {
        topicId,
        userId,
        grantedBy,
        source,
        invitationId,
      },
      update: {
        // Only update if source is "better" (DIRECT_GRANT > INVITATION)
        // For now, don't overwrite existing grants
      },
    });

    // Check if this was a new grant or existing
    const wasNew = access.grantedAt.getTime() > Date.now() - 1000;

    this.logger.log(
      `${wasNew ? 'Granted' : 'Confirmed existing'} access to topic ${topicId} for user ${userId} via ${source}`,
    );

    return {
      success: true,
      accessId: access.id,
      alreadyGranted: !wasNew,
    };
  }

  /**
   * Check if a user can access a topic.
   *
   * @param topicId - The topic to check access for
   * @param userId - The user to check access for
   * @returns Access check result with reason
   */
  async checkAccess(topicId: string, userId: string): Promise<CheckAccessResult> {
    // Get topic with visibility and creator info
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        visibility: true,
        creatorId: true,
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    // Public topics are accessible to everyone
    if (topic.visibility === 'PUBLIC') {
      return { canAccess: true, reason: 'public' };
    }

    // Topic creator always has access
    if (topic.creatorId === userId) {
      return { canAccess: true, reason: 'creator' };
    }

    // Check for explicit access grant
    const access = await this.prisma.topicAccess.findUnique({
      where: {
        topicId_userId: { topicId, userId },
      },
    });

    if (access) {
      return { canAccess: true, reason: 'explicit_grant' };
    }

    // No access
    return { canAccess: false, reason: 'denied' };
  }

  /**
   * Revoke a user's access to a topic.
   *
   * @param topicId - The topic to revoke access from
   * @param userId - The user to revoke access from
   * @returns True if access was revoked, false if no access existed
   */
  async revokeAccess(topicId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.topicAccess.delete({
        where: {
          topicId_userId: { topicId, userId },
        },
      });

      this.logger.log(`Revoked access to topic ${topicId} for user ${userId}`);
      return true;
    } catch (error) {
      // Not found errors are expected if access didn't exist
      if ((error as { code?: string }).code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List all users with explicit access to a topic.
   *
   * @param topicId - The topic to list access for
   * @returns Array of access records
   */
  async listTopicAccess(topicId: string) {
    return this.prisma.topicAccess.findMany({
      where: { topicId },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
