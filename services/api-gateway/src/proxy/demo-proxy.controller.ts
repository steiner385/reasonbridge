import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Demo Proxy Controller
 *
 * Routes public demo endpoints to the user-service.
 * These endpoints are used by the landing page to showcase
 * the platform's capabilities without requiring authentication.
 */
@Controller('demo')
export class DemoProxyController {
  private readonly logger = new Logger(DemoProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  /**
   * GET /demo/discussions
   * Returns curated demo discussions for the landing page
   */
  @Get('discussions')
  async getDemoDiscussions(
    @Query('limit') limit?: string,
    @Query('sessionId') sessionId?: string,
    @Res() res?: FastifyReply,
  ) {
    const query: Record<string, string> = {};
    if (limit) query['limit'] = limit;
    if (sessionId) query['sessionId'] = sessionId;

    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/demo/discussions',
      query,
    });

    res?.status(response.status).send(response.data);
  }

  /**
   * GET /demo/credentials
   * Returns demo user credentials for testing
   */
  @Get('credentials')
  async getDemoCredentials(@Res() res?: FastifyReply) {
    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/demo/credentials',
    });

    res?.status(response.status).send(response.data);
  }

  /**
   * GET /demo/personas
   * Returns information about demo personas
   */
  @Get('personas')
  async getDemoPersonas(@Query('role') role?: string, @Res() res?: FastifyReply) {
    const query: Record<string, string> = {};
    if (role) query['role'] = role;

    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/demo/personas',
      query,
    });

    res?.status(response.status).send(response.data);
  }

  /**
   * GET /demo/status
   * Returns demo environment status
   */
  @Get('status')
  async getDemoStatus(@Res() res?: FastifyReply) {
    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/demo/status',
    });

    res?.status(response.status).send(response.data);
  }
}
