/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContributionsModule - NestJS module for user contributions
 *
 * Provides contribution history functionality for user profiles.
 */

import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller.js';
import { ContributionsService } from './contributions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ContributionsController],
  providers: [ContributionsService],
  exports: [ContributionsService],
})
export class ContributionsModule {}
