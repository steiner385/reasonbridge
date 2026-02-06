/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Inject } from '@nestjs/common';
import { QueueService } from '../queue/queue.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(QueueService) private readonly queueService?: QueueService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'moderation-service',
      queue: this.queueService?.getHealthStatus() || { enabled: false },
    };
  }

  @Get('queue')
  checkQueue() {
    if (!this.queueService) {
      return { status: 'disabled', message: 'Queue service not available' };
    }

    const config = this.queueService.getConfig();
    const health = this.queueService.getHealthStatus();

    return {
      status: config.enabled ? 'ready' : 'disabled',
      timestamp: new Date().toISOString(),
      health,
      config: {
        awsRegion: config.awsRegion,
        serviceName: config.serviceName,
        enabled: config.enabled,
      },
    };
  }
}
