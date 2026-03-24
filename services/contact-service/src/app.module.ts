/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { DiscoveryModule } from './discovery/discovery.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env files in order: local service config, then root monorepo config
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    ConnectionsModule,
    ContactsModule,
    DiscoveryModule,
    InvitationsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
