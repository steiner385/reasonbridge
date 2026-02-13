/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateActivityEventDto, ActivityEventResponseDto } from './dto/create-event.dto.js';

@Injectable()
export class ActivityEventsService {
  private readonly logger = new Logger(ActivityEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new activity event
   * Called by other services when activities occur
   */
  async createEvent(dto: CreateActivityEventDto): Promise<ActivityEventResponseDto> {
    const event = await this.prisma.activityEvent.create({
      data: {
        userId: dto.userId,
        activityType: dto.activityType,
        targetId: dto.targetId,
        targetType: dto.targetType,
        targetTitle: dto.targetTitle,
        targetSlug: dto.targetSlug,
      },
    });

    this.logger.log(
      `Created activity event: ${dto.activityType} by user ${dto.userId} for ${dto.targetType} ${dto.targetId}`,
    );

    return {
      id: event.id,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
