/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { InternalBotFlaggedController } from './internal-bot-flagged.controller.js';

/**
 * Internal Module
 *
 * Provides internal endpoints for service-to-service communication.
 * These endpoints are not protected by JWT auth since they're
 * for internal microservice calls only.
 */
@Module({
  imports: [PrismaModule],
  controllers: [InternalBotFlaggedController],
})
export class InternalModule {}
