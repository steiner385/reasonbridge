/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller.js';
import { TagsService } from './tags.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * Module for tag management functionality
 * Feature 016: Topic Management (T216)
 *
 * Provides tag CRUD operations, search, and analytics
 */
@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
