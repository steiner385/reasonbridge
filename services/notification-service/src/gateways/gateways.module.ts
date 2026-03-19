/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class GatewaysModule {}
