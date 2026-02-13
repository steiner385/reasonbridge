/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ActivityEventsController } from './activity-events.controller.js';
import { ActivityEventsService } from './activity-events.service.js';

@Module({
  controllers: [ActivityEventsController],
  providers: [ActivityEventsService],
  exports: [ActivityEventsService],
})
export class ActivityEventsModule {}
