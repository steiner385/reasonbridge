/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

/**
 * Health Module
 *
 * Provides comprehensive health checking with backend service connectivity verification.
 * Uses @nestjs/terminus for reliable health checks that prevent race conditions.
 */
@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
