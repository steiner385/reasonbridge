/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Put, Param, Body, Inject, UseGuards } from '@nestjs/common';
import { ReadStateService } from './read-state.service.js';
import { JwtAuthGuard, OptionalAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';
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
   *
   * Requires a verified JWT. The user id is derived from the verified token
   * (user.sub) rather than a caller-supplied x-user-id header, so the endpoint
   * cannot be spoofed if the service port is reachable directly (issue #1301).
   */
  @Put(':topicId/read-state')
  @UseGuards(JwtAuthGuard)
  async updateReadState(
    @Param('topicId') topicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateReadStateDto,
  ): Promise<ReadStateDto> {
    return this.readStateService.updateReadState(user.sub, topicId, dto);
  }

  /**
   * Get the read state for the current user in a topic
   * GET /topics/:topicId/read-state
   *
   * Accessible to guests (returns null when unauthenticated). When a token is
   * present it is verified by OptionalAuthGuard and the user id is taken from
   * the verified payload, never from the x-user-id header (issue #1301).
   */
  @Get(':topicId/read-state')
  @UseGuards(OptionalAuthGuard)
  async getReadState(
    @Param('topicId') topicId: string,
    @CurrentUser() user: JwtPayload | null,
  ): Promise<ReadStateDto | null> {
    // Guest users have no read state - return null without querying
    if (!user?.sub) {
      return null;
    }
    return this.readStateService.findReadState(user.sub, topicId);
  }
}
