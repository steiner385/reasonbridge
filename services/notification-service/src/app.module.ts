/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { HandlersModule } from './handlers/handlers.module.js';
import { GatewaysModule } from './gateways/gateways.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ServicesModule } from './services/services.module.js';
import { MetricsModule } from './observability/index.js';

@Module({
  imports: [
    PrismaModule,
    MetricsModule,
    HealthModule,
    HandlersModule,
    GatewaysModule,
    JobsModule,
    ServicesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
