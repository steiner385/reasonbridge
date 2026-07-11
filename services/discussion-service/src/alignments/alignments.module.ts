/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { AlignmentsController } from './alignments.controller.js';
import { AlignmentsService } from './alignments.service.js';
import { AlignmentAggregationService } from './alignment-aggregation.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AlignmentsController],
  providers: [AlignmentsService, AlignmentAggregationService],
  exports: [AlignmentsService, AlignmentAggregationService],
})
export class AlignmentsModule {}
