/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Inject,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueueService } from '../queue/queue.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SERVICE_NAME = 'moderation-service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(QueueService) private readonly queueService?: QueueService,
  ) {}

  /**
   * Liveness probe — process is up. Kept dependency-free so a transient
   * database blip never causes an orchestrator to kill the pod.
   */
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: SERVICE_NAME,
      queue: this.queueService?.getHealthStatus() || { enabled: false },
    };
  }

  /** Explicit liveness alias (for probes configured against /health/live). */
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: SERVICE_NAME };
  }

  /**
   * Readiness probe — verifies the service can serve traffic by pinging
   * Postgres. Returns 503 when the database is unreachable so orchestrators
   * stop routing traffic to a service with a dead connection pool.
   */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: SERVICE_NAME,
        checks: { database: 'up' },
        queue: this.queueService?.getHealthStatus() || { enabled: false },
      };
    } catch (error) {
      this.logger.error(`Readiness check failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        service: SERVICE_NAME,
        checks: { database: 'down' },
      });
    }
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
