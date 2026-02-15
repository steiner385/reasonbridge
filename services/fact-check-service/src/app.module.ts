/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { FactCheckModule } from './controllers/fact-check.module.js';
import { CacheModule } from './cache/cache.module.js';

@Module({
  imports: [PrismaModule, HealthModule, ClientsModule, CacheModule, FactCheckModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
