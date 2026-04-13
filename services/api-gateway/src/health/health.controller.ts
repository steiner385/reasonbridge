/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck, HttpHealthIndicator } from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';

/**
 * Health Check Controller
 *
 * Performs comprehensive health checks including:
 * - API Gateway service status
 * - Backend service connectivity (user-service, discussion-service, notification-service)
 *
 * This ensures the service is not only running but can actually communicate with dependencies.
 * Critical for preventing race conditions in E2E tests where services may report healthy
 * before establishing HTTP connections to backends.
 *
 * @see https://docs.nestjs.com/recipes/terminus
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check with backend connectivity verification',
    description:
      'Returns healthy only if API Gateway can reach all critical backend services. Prevents race conditions in E2E tests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy and all backend services are reachable',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy or cannot reach backend services',
  })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    const userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://user-service:3001',
    );
    const discussionServiceUrl = this.configService.get<string>(
      'DISCUSSION_SERVICE_URL',
      'http://discussion-service:3007',
    );
    const notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://notification-service:3005',
    );

    return this.health.check([
      // Verify user-service is reachable
      () => this.http.pingCheck('user-service', `${userServiceUrl}/health`, { timeout: 3000 }),
      // Verify discussion-service is reachable
      () =>
        this.http.pingCheck('discussion-service', `${discussionServiceUrl}/health`, {
          timeout: 3000,
        }),
      // Verify notification-service is reachable
      () =>
        this.http.pingCheck('notification-service', `${notificationServiceUrl}/health`, {
          timeout: 3000,
        }),
    ]);
  }
}
