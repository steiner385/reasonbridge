/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ExpertiseCalculatorService } from './expertise-calculator.service.js';
import { ExpertiseService } from './expertise.service.js';

/**
 * ExpertiseModule - Provides domain expertise management services
 *
 * This module encapsulates:
 * - ExpertiseCalculatorService: Calculates expertise scores and determines levels
 * - ExpertiseService: Orchestration layer for expertise CRUD operations
 *
 * @remarks
 * The module exports both ExpertiseService (for high-level operations) and
 * ExpertiseCalculatorService (for direct access to scoring algorithms).
 *
 * Expertise tracking is based on:
 * - Response count in topics with a specific tag (engagement)
 * - Average quality scores of responses (quality)
 * - Verified domain credentials (credential boost)
 * - Time since first response in category (tenure)
 *
 * @example
 * ```typescript
 * // Import in another module
 * import { ExpertiseModule } from '../expertise/expertise.module.js';
 *
 * @Module({
 *   imports: [ExpertiseModule],
 * })
 * export class SomeModule {}
 * ```
 */
@Module({
  imports: [PrismaModule],
  providers: [ExpertiseCalculatorService, ExpertiseService],
  exports: [ExpertiseService, ExpertiseCalculatorService],
})
export class ExpertiseModule {}
