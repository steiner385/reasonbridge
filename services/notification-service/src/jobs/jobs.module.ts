/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailModule } from '../email/email.module.js';
import { ParentDigestJob } from './parent-digest.job.js';

/**
 * Module for scheduled jobs.
 *
 * @remarks
 * Contains cron jobs that run on a schedule:
 * - ParentDigestJob: Weekly digest emails to parents (Sunday 9 AM UTC)
 *
 * TODO: Enable @nestjs/schedule when dependency is added:
 * ```typescript
 * import { ScheduleModule } from '@nestjs/schedule';
 *
 * @Module({
 *   imports: [ScheduleModule.forRoot(), PrismaModule, EmailModule],
 *   ...
 * })
 * ```
 */
@Module({
  imports: [PrismaModule, EmailModule],
  providers: [ParentDigestJob],
  exports: [ParentDigestJob],
})
export class JobsModule {}
