/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, Res, Headers, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { ProxyService } from './proxy.service.js';

/**
 * Rate limits for auth endpoints (requests per minute)
 * These match the user-service throttle limits to provide defense-in-depth
 * In test mode, limits are relaxed to avoid test flakiness
 */
const isTest = process.env['NODE_ENV'] === 'test';
const THROTTLE_LIMITS = {
  register: isTest ? 10000 : 3, // 3/min in prod
  login: isTest ? 10000 : 5, // 5/min in prod
  refresh: isTest ? 10000 : 10, // 10/min in prod
  verifyEmail: isTest ? 10000 : 5, // 5/min in prod
  resendVerification: isTest ? 10000 : 3, // 3/min in prod
  forgotPassword: isTest ? 10000 : 3, // 3/min in prod
  resetPassword: isTest ? 10000 : 5, // 5/min in prod
};

@ApiTags('auth')
@Controller('auth')
export class AuthProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created; verification email sent' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  @Throttle({ default: { limit: THROTTLE_LIMITS.register, ttl: 60000 } })
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
  @ApiOperation({ summary: 'Authenticate a user and return access/refresh tokens' })
  @ApiResponse({ status: 200, description: 'Authentication succeeded; tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @Throttle({ default: { limit: THROTTLE_LIMITS.login, ttl: 60000 } })
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
  @Throttle({ default: { limit: THROTTLE_LIMITS.refresh, ttl: 60000 } })
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
  @Throttle({ default: { limit: THROTTLE_LIMITS.register, ttl: 60000 } })
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
  @Throttle({ default: { limit: THROTTLE_LIMITS.verifyEmail, ttl: 60000 } })
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
  @Throttle({ default: { limit: THROTTLE_LIMITS.resendVerification, ttl: 60000 } })
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

  @Post('forgot-password')
  @Throttle({ default: { limit: THROTTLE_LIMITS.forgotPassword, ttl: 60000 } })
  async forgotPassword(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/forgot-password',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: THROTTLE_LIMITS.resetPassword, ttl: 60000 } })
  async resetPassword(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/auth/reset-password',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
