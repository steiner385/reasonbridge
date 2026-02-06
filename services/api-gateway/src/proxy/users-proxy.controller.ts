/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Put, Body, Param, Res, Headers, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

@Controller('users')
export class UsersProxyController {
  private readonly logger = new Logger(UsersProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  @Get('me')
  async getCurrentUser(
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/users/me',
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Put('me')
  async updateCurrentUser(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'PUT',
      path: '/users/me',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id')
  async getUserById(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Validate UUID format before proxying to prevent Prisma errors
    if (!isValidUUID(id)) {
      this.logger.warn(
        `Invalid UUID format received for user lookup: "${id}" (length: ${id.length}, first 20 chars: "${id.substring(0, 20)}")`,
      );
      res.status(400).send({
        statusCode: 400,
        message: `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
        error: 'Bad Request',
      });
      return;
    }

    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: `/users/${id}`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
