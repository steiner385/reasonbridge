/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Put, Param, Body, Headers, Inject } from '@nestjs/common';
import { ReadStateService } from './read-state.service.js';
import type { UpdateReadStateDto } from './dto/update-read-state.dto.js';
import type { ReadStateDto } from './dto/read-state.dto.js';

@Controller('topics')
export class ReadStateController {
  constructor(@Inject(ReadStateService) private readonly readStateService: ReadStateService) {}

  /**
   * Update the read state for the current user in a topic
   * PUT /topics/:topicId/read-state
   */
  @Put(':topicId/read-state')
  async updateReadState(
    @Param('topicId') topicId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateReadStateDto,
  ): Promise<ReadStateDto> {
    return this.readStateService.updateReadState(userId, topicId, dto);
  }

  /**
   * Get the read state for the current user in a topic
   * GET /topics/:topicId/read-state
   */
  @Get(':topicId/read-state')
  async getReadState(
    @Param('topicId') topicId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<ReadStateDto | null> {
    return this.readStateService.getReadState(userId, topicId);
  }
}
