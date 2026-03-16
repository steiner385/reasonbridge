/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { VotesController } from './votes.controller.js';
import { VotesService } from './votes.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
