/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

const SERVICE_NAME = 'contact-service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe (process is up)' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: SERVICE_NAME };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe alias' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: SERVICE_NAME };
  }

  /**
   * Readiness probe — now performs a real Postgres connectivity check instead of
   * returning a static `{ status: 'ready' }`. Returns 503 when the database is
   * unreachable so orchestrators stop routing traffic to a service with a dead
   * connection pool.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (verifies database connectivity)' })
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
