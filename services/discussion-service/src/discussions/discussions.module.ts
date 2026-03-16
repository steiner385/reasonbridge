/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T016 - Discussion Module (Feature 009)
 *
 * Module for managing discussion threads within topics
 * Includes discussion creation, listing, and metrics
 */

import { Module } from '@nestjs/common';
import { DiscussionsController } from './discussions.controller.js';
import { DiscussionsService } from './discussions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
