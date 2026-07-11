/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, All, Req, Res, Headers, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Fact-Check Service Proxy Controller
 * Proxies all /fact-check/* requests to the fact-check service
 */
@ApiTags('fact-check')
@Controller('fact-check')
export class FactCheckProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  /**
   * Proxy all fact-check service requests
   * Handles: POST /fact-check/check, GET /fact-check/:id
   */
  @All('*')
  async proxyToFactCheck(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('authorization') authHeader?: string,
  ) {
    // Extract path after /fact-check
    const path = req.url.replace(/^\/fact-check/, '') || '/';
    const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    const response = await this.proxyService.proxyToFactCheckService({
      method,
      path,
      body: req.body,
      query: req.query as Record<string, string>,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
