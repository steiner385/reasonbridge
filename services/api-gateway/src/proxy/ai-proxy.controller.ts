/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, All, Req, Res, Headers } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * AI Service Proxy Controller
 * Proxies all /ai/* requests to the AI service
 */
@Controller('ai')
export class AiProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Proxy all AI service requests
   * Handles: /ai/feedback/preview, /ai/suggest/*, etc.
   */
  @All('*')
  async proxyToAi(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('authorization') authHeader?: string,
  ) {
    // Extract path after /ai
    const path = req.url.replace(/^\/ai/, '') || '/';
    const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    const response = await this.proxyService.proxyToAiService({
      method,
      path,
      body: req.body,
      query: req.query as Record<string, string>,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
