/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { GeoIpService } from './geo-ip.service.js';

/**
 * Module for geographic IP-based services
 *
 * @remarks
 * Provides services for:
 * - GeoIP country detection with fallback mechanisms
 * - Regional compliance rule determination
 *
 * The GeoIpService uses a mock implementation that can be replaced
 * with a real GeoIP provider (MaxMind, IP2Location, etc.) in production.
 */
@Module({
  providers: [GeoIpService],
  exports: [GeoIpService],
})
export class GeoModule {}
