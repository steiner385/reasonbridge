/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { GatewaysModule } from '../gateways/gateways.module.js';
import { CommonGroundNotificationHandler } from './common-ground-notification.handler.js';
import { ModerationNotificationHandler } from './moderation-notification.handler.js';

/**
 * Module for event handlers
 */
@Module({
  imports: [PrismaModule, GatewaysModule],
  providers: [CommonGroundNotificationHandler, ModerationNotificationHandler],
  exports: [CommonGroundNotificationHandler, ModerationNotificationHandler],
})
export class HandlersModule {}
