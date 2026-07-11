/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { GatewaysModule } from '../gateways/gateways.module.js';
import { InternalSmsController } from './internal-sms.controller.js';
import { InternalSlaBreachController } from './internal-sla-breach.controller.js';
import { InternalModerationController } from './internal-moderation.controller.js';

/**
 * Internal Module
 *
 * Provides internal endpoints for service-to-service communication.
 * These endpoints are not protected by JWT auth since they're
 * for internal microservice calls only.
 */
@Module({
  imports: [ServicesModule, PrismaModule, GatewaysModule],
  controllers: [InternalSmsController, InternalSlaBreachController, InternalModerationController],
})
export class InternalModule {}
