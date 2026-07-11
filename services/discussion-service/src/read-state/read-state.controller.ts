/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Headers,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { ReadStateService } from './read-state.service.js';
// NOTE: Must be a value import (not `import type`). This class is used as an
// @Body() parameter type, so `emitDecoratorMetadata` needs the runtime class
// reference. With verbatimModuleSyntax, `import type` would elide it and tsc
// would emit `Function` as the paramtype, silently breaking ValidationPipe.
import { UpdateReadStateDto } from './dto/update-read-state.dto.js';
import type { ReadStateDto } from './dto/read-state.dto.js';

@Controller('topics')
export class ReadStateController {
  constructor(@Inject(ReadStateService) private readonly readStateService: ReadStateService) {}

  /**
   * Update the read state for the current user in a topic
   * PUT /topics/:topicId/read-state
   * Requires authentication (x-user-id header)
   */
  @Put(':topicId/read-state')
  async updateReadState(
    @Param('topicId') topicId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: UpdateReadStateDto,
  ): Promise<ReadStateDto> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required to update read state');
    }
    return this.readStateService.updateReadState(userId, topicId, dto);
  }

  /**
   * Get the read state for the current user in a topic
   * GET /topics/:topicId/read-state
   * Returns null for unauthenticated users (guests have no read state)
   */
  @Get(':topicId/read-state')
  async getReadState(
    @Param('topicId') topicId: string,
    @Headers('x-user-id') userId: string | undefined,
  ): Promise<ReadStateDto | null> {
    // Guest users have no read state - return null without querying
    if (!userId) {
      return null;
    }
    return this.readStateService.findReadState(userId, topicId);
  }
}
