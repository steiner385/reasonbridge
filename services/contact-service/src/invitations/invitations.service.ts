/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscussionServiceClient } from '../clients/discussion-service.client.js';
import { CreateInvitationDto, CreateInvitationResponseDto } from './dto/create-invitation.dto.js';
import {
  InvitationListQueryDto,
  InvitationListResponseDto,
  AcceptInvitationResponseDto,
  InvitationStatusDto,
} from './dto/invitation-response.dto.js';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discussionClient: DiscussionServiceClient,
  ) {}

  async createInvitation(
    inviterId: string,
    dto: CreateInvitationDto,
  ): Promise<CreateInvitationResponseDto> {
    // Prevent self-invitation
    if (dto.inviteeUserId === inviterId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    // Check for existing pending invitation
    const existing = await this.prisma.topicInvitation.findFirst({
      where: {
        topicId: dto.topicId,
        inviterId,
        OR: [
          { inviteeUserId: dto.inviteeUserId || undefined },
          { inviteeEmail: dto.inviteeEmail || undefined },
        ],
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new BadRequestException('Invitation already sent');
    }

    // Generate secure token and expiry
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await this.prisma.topicInvitation.create({
      data: {
        topicId: dto.topicId,
        inviterId,
        inviteeUserId: dto.inviteeUserId || null,
        inviteeEmail: dto.inviteeEmail || null,
        message: dto.message || null,
        status: 'PENDING',
        token,
        expiresAt,
      },
    });

    this.logger.log(`Created invitation ${invitation.id} for topic ${dto.topicId}`);

    return {
      id: invitation.id,
      topicId: invitation.topicId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<AcceptInvitationResponseDto> {
    const invitation = await this.prisma.topicInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviteeUserId && invitation.inviteeUserId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation already ${invitation.status.toLowerCase()}`);
    }

    await this.prisma.topicInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });

    this.logger.log(`Invitation ${invitationId} accepted by user ${userId}`);

    // Grant topic access (fire-and-forget - failures are logged but don't block acceptance)
    await this.discussionClient.grantTopicAccess(invitation.topicId, userId, invitationId);

    return {
      success: true,
      topicId: invitation.topicId,
      redirectUrl: `/topics/${invitation.topicId}`,
    };
  }

  async declineInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.prisma.topicInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviteeUserId && invitation.inviteeUserId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.prisma.topicInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
      },
    });

    this.logger.log(`Invitation ${invitationId} declined by user ${userId}`);
  }

  async getSentInvitations(
    userId: string,
    query: InvitationListQueryDto,
  ): Promise<InvitationListResponseDto> {
    const { status, limit = 50, page = 1 } = query;
    const offset = (page - 1) * limit;

    const where: Prisma.TopicInvitationWhereInput = { inviterId: userId };
    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      this.prisma.topicInvitation.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.topicInvitation.count({ where }),
    ]);

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        topicId: inv.topicId,
        inviterId: inv.inviterId,
        inviteeUserId: inv.inviteeUserId || undefined,
        inviteeEmail: inv.inviteeEmail || undefined,
        status: inv.status as InvitationStatusDto,
        message: inv.message || undefined,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        respondedAt: inv.respondedAt || undefined,
      })),
      total,
      hasMore: offset + invitations.length < total,
    };
  }

  async getReceivedInvitations(
    userId: string,
    query: InvitationListQueryDto,
  ): Promise<InvitationListResponseDto> {
    const { status, limit = 50, page = 1 } = query;
    const offset = (page - 1) * limit;

    const where: Prisma.TopicInvitationWhereInput = { inviteeUserId: userId };
    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      this.prisma.topicInvitation.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.topicInvitation.count({ where }),
    ]);

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        topicId: inv.topicId,
        inviterId: inv.inviterId,
        inviteeUserId: inv.inviteeUserId || undefined,
        inviteeEmail: inv.inviteeEmail || undefined,
        status: inv.status as InvitationStatusDto,
        message: inv.message || undefined,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        respondedAt: inv.respondedAt || undefined,
      })),
      total,
      hasMore: offset + invitations.length < total,
    };
  }
}
