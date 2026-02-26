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
  Query,
  Res,
  Headers,
  Logger,
  Inject,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Contacts Proxy Controller
 *
 * Proxies social media integration endpoints to the contact-service.
 * Handles OAuth connections, contact import, discovery, and invitations.
 * Part of Feature 010 - Social Media Integration (Issue #782)
 */
@Controller('contacts')
export class ContactsProxyController {
  private readonly logger = new Logger(ContactsProxyController.name);

  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  // =============================================================================
  // OAuth Connections
  // =============================================================================

  /**
   * POST /contacts/connections/initiate - Initiate OAuth flow with a social provider
   */
  @Post('connections/initiate')
  async initiateConnection(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'POST',
      path: '/connections/initiate',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /contacts/connections/callback - Handle OAuth callback from provider
   */
  @Post('connections/callback')
  async handleCallback(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'POST',
      path: '/connections/callback',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  // =============================================================================
  // Contacts
  // =============================================================================

  /**
   * POST /contacts/import - Import contacts from a connected social provider
   */
  @Post('import')
  async importContacts(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'POST',
      path: '/contacts/import',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /contacts - List imported contacts with pagination and filtering
   */
  @Get()
  async listContacts(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'GET',
      path: '/contacts',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  // =============================================================================
  // Discovery
  // =============================================================================

  /**
   * GET /contacts/discover - Discover ReasonBridge users from imported contacts
   */
  @Get('discover')
  async discoverUsers(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'GET',
      path: '/contacts/discover',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}

/**
 * Invitations Proxy Controller
 *
 * Proxies invitation endpoints to the contact-service.
 * Handles creating, listing, accepting, and declining topic invitations.
 * Part of Feature 010 - Social Media Integration (Issue #782)
 */
@Controller('invitations')
export class InvitationsProxyController {
  private readonly logger = new Logger(InvitationsProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  /**
   * POST /invitations - Create a topic invitation
   */
  @Post()
  async createInvitation(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'POST',
      path: '/invitations',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /invitations/sent - List sent invitations with pagination
   */
  @Get('sent')
  async listSentInvitations(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'GET',
      path: '/invitations/sent',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /invitations/received - List received invitations with pagination
   */
  @Get('received')
  async listReceivedInvitations(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToContactService({
      method: 'GET',
      path: '/invitations/received',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /invitations/:id/accept - Accept a topic invitation
   */
  @Post(':id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    if (!isValidUUID(id)) {
      this.logger.warn(`Invalid UUID format received for invitation: "${id}"`);
      res.status(400).send({
        statusCode: 400,
        message: `Invalid invitation ID format: expected UUID`,
        error: 'Bad Request',
      });
      return;
    }

    const response = await this.proxyService.proxyToContactService({
      method: 'POST',
      path: `/invitations/${id}/accept`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /invitations/:id/decline - Decline a topic invitation
   */
  @Post(':id/decline')
  async declineInvitation(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    if (!isValidUUID(id)) {
      this.logger.warn(`Invalid UUID format received for invitation: "${id}"`);
      res.status(400).send({
        statusCode: 400,
        message: `Invalid invitation ID format: expected UUID`,
        error: 'Bad Request',
      });
      return;
    }

    const response = await this.proxyService.proxyToContactService({
      method: 'POST',
      path: `/invitations/${id}/decline`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
