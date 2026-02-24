/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ProvisionalAccessStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvisionalAccessDto, AccessRequestDto } from './dto/provisional-access.dto.js';

/**
 * Database provisional access record shape
 */
interface DbProvisionalAccess {
  id: string;
  userId: string;
  topicId: string;
  grantedById: string; // Required in schema - pending requests use userId as self-reference
  reason: string | null;
  expiresAt: Date; // Required in schema - pending requests use epoch date as marker
  status: ProvisionalAccessStatus;
  createdAt: Date;
  user?: { id: string; displayName: string | null; email: string } | null;
  topic?: { id: string; title: string } | null;
  grantedBy?: { id: string; displayName: string | null } | null;
}

/**
 * ProvisionalAccessService - Manages provisional access to tier-restricted topics
 *
 * Handles the full lifecycle of provisional access:
 * - Users request access to topics they don't meet tier requirements for
 * - Topic creators review and approve/deny requests
 * - Approved access grants 30-day temporary access
 * - Topic creators can revoke access at any time
 *
 * @remarks
 * - Access requests are stored as provisional access records with null grantedById
 * - Approved access has grantedById set and a 30-day expiration
 * - Only topic creators can approve, deny, or revoke access
 * - TRUSTED+ users can also sponsor access (mentor system - future feature)
 *
 * @example
 * ```typescript
 * // Request access
 * await provisionalAccessService.requestAccess(userId, topicId, 'I want to contribute');
 *
 * // Topic creator approves
 * await provisionalAccessService.approveAccess(topicId, userId, creatorId, 'Welcome!');
 *
 * // Check user's active access
 * const access = await provisionalAccessService.getUserProvisionalAccess(userId);
 * ```
 */
@Injectable()
export class ProvisionalAccessService {
  private readonly logger = new Logger(ProvisionalAccessService.name);

  /**
   * Duration of provisional access in days
   */
  private readonly ACCESS_DURATION_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Request provisional access to a restricted topic
   *
   * Creates a pending access request that must be approved by the topic creator.
   *
   * @param cognitoSub - The user's Cognito sub (from JWT)
   * @param topicId - The topic to request access to
   * @param reason - Optional reason for the request
   * @throws NotFoundException if user or topic does not exist
   * @throws BadRequestException if topic doesn't allow provisional access or request exists
   */
  async requestAccess(cognitoSub: string, topicId: string, reason?: string): Promise<void> {
    // Get user's internal ID
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // Get topic and verify it allows provisional access
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        title: true,
        creatorId: true,
        allowProvisionalAccess: true,
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (!topic.allowProvisionalAccess) {
      throw new BadRequestException('Topic does not allow provisional access');
    }

    // Check for existing request or active access
    // Pending requests use epoch date (Jan 1, 1970) as expiresAt marker
    // with grantedById === userId (self-referential)
    const epochDate = new Date(0);
    const existing = await this.prisma.provisionalAccess.findFirst({
      where: {
        userId: user.id,
        topicId,
        // Don't allow new requests if there's already a pending request or active access
        OR: [
          { expiresAt: epochDate }, // Pending request (epoch date marker)
          {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
          }, // Active access
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Access request already exists or access already granted');
    }

    // Create pending request (grantedById is null until approved)
    await this.prisma.provisionalAccess.create({
      data: {
        userId: user.id,
        topicId,
        grantedById: user.id, // Temporarily set to user's own ID (will be updated on approval)
        reason: reason ?? null,
        status: 'ACTIVE', // Will be marked as pending via grantedById === userId check
        expiresAt: new Date(0), // Set to epoch as marker for pending request
      },
    });

    this.logger.log(`Access request created: user ${user.id} for topic ${topicId}`);
  }

  /**
   * Get pending access requests for a topic
   *
   * Returns all pending requests that need approval from the topic creator.
   *
   * @param topicId - The topic to get requests for
   * @returns Array of AccessRequestDto
   */
  async getAccessRequests(topicId: string): Promise<AccessRequestDto[]> {
    // Pending requests are those where expiresAt is the epoch date (Jan 1, 1970)
    // This is a marker value indicating the request hasn't been approved yet
    const epochDate = new Date(0);
    const requests = await this.prisma.provisionalAccess.findMany({
      where: {
        topicId,
        expiresAt: epochDate, // Epoch date marker for pending requests
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
        topic: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return requests.map((req) => this.toAccessRequestDto(req));
  }

  /**
   * Approve a provisional access request
   *
   * Converts a pending request to active access with 30-day expiration.
   *
   * @param topicId - The topic ID
   * @param userId - The user's internal ID (not cognitoSub)
   * @param granterCognitoSub - The granter's Cognito sub (from JWT)
   * @param reason - Optional reason for approval
   * @returns ProvisionalAccessDto with the approved access
   * @throws NotFoundException if request, topic, or granter not found
   * @throws ForbiddenException if granter is not the topic creator
   */
  async approveAccess(
    topicId: string,
    userId: string,
    granterCognitoSub: string,
    reason?: string,
  ): Promise<ProvisionalAccessDto> {
    // Get granter's internal ID
    const granter = await this.prisma.user.findUnique({
      where: { cognitoSub: granterCognitoSub },
      select: { id: true, displayName: true },
    });

    if (!granter) {
      throw new NotFoundException('Granter user not found');
    }

    // Get topic and verify granter is the creator
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true, title: true, creatorId: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.creatorId !== granter.id) {
      throw new ForbiddenException('Only the topic creator can approve access requests');
    }

    // Find the pending request (where expiresAt is epoch date marker)
    const pendingRequest = await this.prisma.provisionalAccess.findFirst({
      where: {
        userId,
        topicId,
        expiresAt: new Date(0), // Pending request marker
      },
    });

    if (!pendingRequest) {
      throw new NotFoundException('No pending access request found');
    }

    // Calculate 30-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.ACCESS_DURATION_DAYS);

    // Update to active access
    const updatedAccess = await this.prisma.provisionalAccess.update({
      where: { id: pendingRequest.id },
      data: {
        grantedById: granter.id,
        reason: reason ?? pendingRequest.reason,
        status: 'ACTIVE',
        expiresAt,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
        topic: {
          select: { id: true, title: true },
        },
        grantedBy: {
          select: { id: true, displayName: true },
        },
      },
    });

    this.logger.log(`Access approved: user ${userId} for topic ${topicId} by ${granter.id}`);

    return this.toProvisionalAccessDto(updatedAccess);
  }

  /**
   * Deny a provisional access request
   *
   * Removes the pending request from the database.
   *
   * @param topicId - The topic ID
   * @param userId - The user's internal ID
   * @param denierCognitoSub - The denier's Cognito sub (from JWT)
   * @throws NotFoundException if request, topic, or denier not found
   * @throws ForbiddenException if denier is not the topic creator
   */
  async denyAccess(topicId: string, userId: string, denierCognitoSub: string): Promise<void> {
    // Get denier's internal ID
    const denier = await this.prisma.user.findUnique({
      where: { cognitoSub: denierCognitoSub },
      select: { id: true },
    });

    if (!denier) {
      throw new NotFoundException('User not found');
    }

    // Get topic and verify denier is the creator
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true, creatorId: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.creatorId !== denier.id) {
      throw new ForbiddenException('Only the topic creator can deny access requests');
    }

    // Find the pending request
    const pendingRequest = await this.prisma.provisionalAccess.findFirst({
      where: {
        userId,
        topicId,
        expiresAt: new Date(0), // Pending request marker
      },
    });

    if (!pendingRequest) {
      throw new NotFoundException('No pending access request found');
    }

    // Delete the request
    await this.prisma.provisionalAccess.delete({
      where: { id: pendingRequest.id },
    });

    this.logger.log(`Access denied: user ${userId} for topic ${topicId} by ${denier.id}`);
  }

  /**
   * Revoke active provisional access
   *
   * Marks active access as revoked, immediately terminating access.
   *
   * @param topicId - The topic ID
   * @param userId - The user's internal ID
   * @param revokerCognitoSub - The revoker's Cognito sub (from JWT)
   * @throws NotFoundException if access, topic, or revoker not found
   * @throws ForbiddenException if revoker is not the topic creator
   */
  async revokeAccess(topicId: string, userId: string, revokerCognitoSub: string): Promise<void> {
    // Get revoker's internal ID
    const revoker = await this.prisma.user.findUnique({
      where: { cognitoSub: revokerCognitoSub },
      select: { id: true },
    });

    if (!revoker) {
      throw new NotFoundException('User not found');
    }

    // Get topic and verify revoker is the creator
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true, creatorId: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.creatorId !== revoker.id) {
      throw new ForbiddenException('Only the topic creator can revoke access');
    }

    // Find active access
    const activeAccess = await this.prisma.provisionalAccess.findFirst({
      where: {
        userId,
        topicId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeAccess) {
      throw new NotFoundException('No active provisional access found');
    }

    // Revoke the access
    await this.prisma.provisionalAccess.update({
      where: { id: activeAccess.id },
      data: { status: 'REVOKED' },
    });

    this.logger.log(`Access revoked: user ${userId} for topic ${topicId} by ${revoker.id}`);
  }

  /**
   * Get a user's active provisional access records
   *
   * Returns all active, non-expired access grants for a user.
   *
   * @param cognitoSub - The user's Cognito sub
   * @returns Array of ProvisionalAccessDto
   * @throws NotFoundException if user not found
   */
  async getUserProvisionalAccess(cognitoSub: string): Promise<ProvisionalAccessDto[]> {
    // Get user's internal ID
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get active access records
    // Active access has expiresAt > now (not the epoch date marker for pending)
    const accessRecords = await this.prisma.provisionalAccess.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        // Only approved access (not pending - which uses epoch date marker)
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
        topic: {
          select: { id: true, title: true },
        },
        grantedBy: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accessRecords.map((access) => this.toProvisionalAccessDto(access));
  }

  /**
   * Convert database record to ProvisionalAccessDto
   */
  private toProvisionalAccessDto(access: DbProvisionalAccess): ProvisionalAccessDto {
    return new ProvisionalAccessDto({
      id: access.id,
      userId: access.userId,
      userName: access.user?.displayName ?? access.user?.email ?? 'Unknown',
      topicId: access.topicId,
      topicTitle: access.topic?.title ?? 'Unknown',
      grantedBy: access.grantedById,
      grantedByName: access.grantedBy?.displayName ?? 'Unknown',
      reason: access.reason ?? undefined,
      expiresAt: access.expiresAt,
      status: access.status,
      createdAt: access.createdAt,
    });
  }

  /**
   * Convert database record to AccessRequestDto
   */
  private toAccessRequestDto(access: DbProvisionalAccess): AccessRequestDto {
    return new AccessRequestDto({
      id: access.id,
      userId: access.userId,
      userName: access.user?.displayName ?? access.user?.email ?? 'Unknown',
      topicId: access.topicId,
      topicTitle: access.topic?.title ?? 'Unknown',
      reason: access.reason ?? undefined,
      createdAt: access.createdAt,
    });
  }
}
