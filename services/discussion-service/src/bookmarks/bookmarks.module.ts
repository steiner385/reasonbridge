/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller.js';
import { BookmarksService } from './bookmarks.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
