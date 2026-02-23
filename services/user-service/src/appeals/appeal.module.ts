/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RankingModule } from '../ranking/ranking.module.js';
import { ExpertiseModule } from '../expertise/expertise.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AppealService } from './appeal.service.js';
import { AppealController } from './appeal.controller.js';

/**
 * AppealModule - Provides tier appeal management services
 *
 * This module encapsulates:
 * - AppealService: Manages appeal submission, approval, and denial
 *
 * @remarks
 * The module exports AppealService for use by other modules that need
 * to manage or query tier appeals.
 *
 * Appeal Types:
 * - GLOBAL_TIER: Request advancement in the global tier ranking system
 * - DOMAIN_EXPERTISE: Request advancement in a specific topic category
 *
 * Appeal Process:
 * 1. User submits appeal (1 per 30 days limit)
 * 2. Selects appeal type: Global Tier or Domain Expertise
 * 3. Provides justification
 * 4. Appeal enters admin queue
 * 5. Admin reviews history, patterns, contributions
 * 6. Resolution: Approve (manual tier bump) or Deny (with explanation)
 * 7. User notified via email and in-app
 *
 * Appeal Statuses:
 * - PENDING: Awaiting admin review
 * - APPROVED: Approved by admin (triggers tier/expertise bump)
 * - DENIED: Denied by admin (with explanation)
 *
 * Anti-Exclusion Safeguard:
 * This appeal system serves as an anti-exclusion safeguard, allowing users
 * who feel they have been incorrectly ranked to request manual review.
 * This prevents the algorithmic ranking system from permanently excluding
 * users who may have valid contributions that aren't captured by automated
 * scoring.
 *
 * @example
 * ```typescript
 * // Import in another module
 * import { AppealModule } from '../appeals/appeal.module.js';
 *
 * @Module({
 *   imports: [AppealModule],
 * })
 * export class SomeModule {}
 * ```
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RankingModule),
    forwardRef(() => ExpertiseModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [AppealController],
  providers: [AppealService],
  exports: [AppealService],
})
export class AppealModule {}
