/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, Req, Res, Headers, Inject } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

@Controller('auth')
export class AuthProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  @Post('register')
  async register(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/register',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/login',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('refresh')
  async refresh(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/refresh',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('signup')
  async signup(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/signup',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/verify-email',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('resend-verification')
  async resendVerification(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/resend-verification',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
