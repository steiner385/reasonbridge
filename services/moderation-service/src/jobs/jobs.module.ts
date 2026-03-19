/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SlaMonitorJob } from './sla-monitor.job.js';

/**
 * Module for scheduled jobs in the moderation service.
 *
 * @remarks
 * Contains cron jobs that run on a schedule:
 * - SlaMonitorJob: SLA compliance checks every 5 minutes
 */
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [SlaMonitorJob],
  exports: [SlaMonitorJob],
})
export class JobsModule {}
