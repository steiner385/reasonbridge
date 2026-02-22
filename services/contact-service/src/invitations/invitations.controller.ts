/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Body, Param, Query, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service.js';
import { CreateInvitationDto, CreateInvitationResponseDto } from './dto/create-invitation.dto.js';
import {
  InvitationListQueryDto,
  InvitationListResponseDto,
  AcceptInvitationResponseDto,
  DeclineInvitationResponseDto,
} from './dto/invitation-response.dto.js';
import { AuthenticatedRequest } from '../types/request.js';

@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
  private readonly logger = new Logger(InvitationsController.name);

  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a topic invitation' })
  @ApiResponse({ status: 201, type: CreateInvitationResponseDto })
  async createInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvitationDto,
  ): Promise<CreateInvitationResponseDto> {
    const userId = req.user.id;
    this.logger.log(`User ${userId} creating invitation for topic ${dto.topicId}`);
    return this.invitationsService.createInvitation(userId, dto);
  }

  @Get('sent')
  @ApiOperation({ summary: 'List sent invitations with pagination' })
  @ApiResponse({ status: 200, type: InvitationListResponseDto })
  async getSentInvitations(
    @Req() req: AuthenticatedRequest,
    @Query() query: InvitationListQueryDto,
  ): Promise<InvitationListResponseDto> {
    const userId = req.user.id;
    return this.invitationsService.getSentInvitations(userId, query);
  }

  @Get('received')
  @ApiOperation({ summary: 'List received invitations with pagination' })
  @ApiResponse({ status: 200, type: InvitationListResponseDto })
  async getReceivedInvitations(
    @Req() req: AuthenticatedRequest,
    @Query() query: InvitationListQueryDto,
  ): Promise<InvitationListResponseDto> {
    const userId = req.user.id;
    return this.invitationsService.getReceivedInvitations(userId, query);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a topic invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, type: AcceptInvitationResponseDto })
  async acceptInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id') invitationId: string,
  ): Promise<AcceptInvitationResponseDto> {
    const userId = req.user.id;
    this.logger.log(`User ${userId} accepting invitation ${invitationId}`);
    return this.invitationsService.acceptInvitation(invitationId, userId);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a topic invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, type: DeclineInvitationResponseDto })
  async declineInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id') invitationId: string,
  ): Promise<DeclineInvitationResponseDto> {
    const userId = req.user.id;
    this.logger.log(`User ${userId} declining invitation ${invitationId}`);
    await this.invitationsService.declineInvitation(invitationId, userId);
    return { success: true };
  }
}
