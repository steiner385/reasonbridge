/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const SERVICE_NAME = 'recommendation-service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Liveness probe — reports only that the process is up. Kept dependency-free
   * so a transient database blip never causes an orchestrator to kill the pod.
   */
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: SERVICE_NAME };
  }

  /** Explicit liveness alias (for probes configured against /health/live). */
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: SERVICE_NAME };
  }

  /**
   * Readiness probe — verifies the service can actually serve traffic by
   * pinging Postgres. Returns 503 when the database is unreachable so
   * orchestrators stop routing traffic to a service with a dead connection pool
   * (a gap that liveness-only health checks could not detect post-startup).
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
}
