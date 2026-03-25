/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module.js';
import { InternalSmsController } from './internal-sms.controller.js';

/**
 * Internal Module
 *
 * Provides internal endpoints for service-to-service communication.
 * These endpoints are not protected by JWT auth since they're
 * for internal microservice calls only.
 */
@Module({
  imports: [ServicesModule],
  controllers: [InternalSmsController],
})
export class InternalModule {}
