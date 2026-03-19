/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, All, Req, Res, Headers, Inject } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Notification Service Proxy Controller
 * Proxies all /notifications/* requests to the notification service
 */
@Controller('notifications')
export class NotificationProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  /**
   * Proxy all notification service requests
   * Handles: /notifications, /notifications/:id, /notifications/:id/read, etc.
   */
  @All('*')
  async proxyToNotification(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('authorization') authHeader?: string,
  ) {
    // Keep full path including /notifications prefix since the notification service expects it
    // Strip query string from path since we pass it separately in 'query' parameter
    const path = req.url.split('?')[0] || req.url;
    const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    const response = await this.proxyService.proxyToNotificationService({
      method,
      path,
      body: req.body,
      query: req.query as Record<string, string>,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
