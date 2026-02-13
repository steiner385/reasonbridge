/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ActivityEventsService } from './activity-events.service.js';
import { CreateActivityEventDto, ActivityEventResponseDto } from './dto/create-event.dto.js';

/**
 * Internal API for creating activity events
 * Called by other services (discussion-service) when activities occur
 */
@Controller('events')
export class ActivityEventsController {
  constructor(private readonly eventsService: ActivityEventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() dto: CreateActivityEventDto): Promise<ActivityEventResponseDto> {
    return this.eventsService.createEvent(dto);
  }
}
