/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';

/**
 * Health Check Response DTO
 */
class HealthCheckResponse {
  @ApiProperty({ example: 'ok', description: 'Health status', type: String })
  status!: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp of the health check',
    type: String,
  })
  timestamp!: string;

  @ApiProperty({ example: 'api-gateway', description: 'Service name', type: String })
  service!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the API Gateway service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: HealthCheckResponse,
  })
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  /** Explicit liveness alias (for probes configured against /health/live). */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (process is up)' })
  @ApiResponse({ status: 200, description: 'Process is alive', type: HealthCheckResponse })
  live(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  /**
   * Readiness probe. The gateway holds no direct datastore connection — it
   * proxies to downstream services, each of which exposes its own
   * /health/ready backed by a real Postgres check. So the gateway is ready as
   * soon as its process can accept connections; downstream availability is
   * surfaced per-request via the circuit breaker and ProxyExceptionFilter
   * (502/503), not by failing the gateway's own readiness.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (gateway can accept connections)' })
  @ApiResponse({ status: 200, description: 'Gateway is ready', type: HealthCheckResponse })
  ready(): HealthCheckResponse {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }
}
