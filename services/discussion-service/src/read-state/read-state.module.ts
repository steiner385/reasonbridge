/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ReadStateController } from './read-state.controller.js';
import { ReadStateService } from './read-state.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ReadStateController],
  providers: [ReadStateService],
  exports: [ReadStateService],
})
export class ReadStateModule {}
