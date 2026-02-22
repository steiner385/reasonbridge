/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service.js';

@Module({
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
