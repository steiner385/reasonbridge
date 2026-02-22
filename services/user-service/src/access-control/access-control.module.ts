/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service.js';
import { TierGuard } from './tier.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * AccessControlModule - Provides tier-based access control functionality
 *
 * Exports the TierGuard and AccessControlService for use in other modules.
 *
 * @example
 * ```typescript
 * // In another module
 * @Module({
 *   imports: [AccessControlModule],
 *   controllers: [TopicController],
 * })
 * export class TopicModule {}
 *
 * // In controller
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @Post('topics/:topicId/responses')
 * createResponse() { ... }
 * ```
 */
@Module({
  imports: [PrismaModule],
  providers: [AccessControlService, TierGuard],
  exports: [AccessControlService, TierGuard],
})
export class AccessControlModule {}
