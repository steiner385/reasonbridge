/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailModule } from '../email/email.module.js';
import { ParentNotificationService } from './parent-notification.service.js';

/**
 * Module for notification services
 */
@Module({
  imports: [PrismaModule, EmailModule],
  providers: [ParentNotificationService],
  exports: [ParentNotificationService],
})
export class ServicesModule {}
