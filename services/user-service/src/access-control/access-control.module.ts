/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { AccessControlService } from './access-control.service.js';
import { TierGuard } from './tier.guard.js';
import { ProvisionalAccessService } from './provisional-access.service.js';
import { ProvisionalAccessController } from './provisional-access.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * AccessControlModule - Provides tier-based access control functionality
 *
 * This module encapsulates:
 * - AccessControlService: Core access control logic for tier/expertise checks
 * - TierGuard: Guard for protecting routes with tier requirements
 * - ProvisionalAccessService: Manages provisional access requests and grants
 * - ProvisionalAccessController: REST API for provisional access management
 *
 * Exports the TierGuard, AccessControlService, and ProvisionalAccessService
 * for use in other modules.
 *
 * @remarks
 * Provisional Access API Endpoints:
 * - POST /topics/:id/request-access - Request provisional access
 * - GET /topics/:id/access-requests - List pending requests (topic creator)
 * - POST /topics/:id/access-requests/:userId/approve - Approve access
 * - POST /topics/:id/access-requests/:userId/deny - Deny access
 * - POST /topics/:id/access/:userId/revoke - Revoke active access
 * - GET /me/provisional-access - List own active access
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
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [ProvisionalAccessController],
  providers: [AccessControlService, TierGuard, ProvisionalAccessService],
  exports: [AccessControlService, TierGuard, ProvisionalAccessService],
})
export class AccessControlModule {}
