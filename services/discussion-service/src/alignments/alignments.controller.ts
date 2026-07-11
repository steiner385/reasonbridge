/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { AlignmentsService } from './alignments.service.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';
import { SetAlignmentDto } from './dto/set-alignment.dto.js';
import type { AlignmentDto } from './dto/alignment.dto.js';

/**
 * Alignment endpoints require a verified JWT. The user id is derived from the
 * verified token (user.sub) rather than a caller-supplied x-user-id header, so
 * the endpoints cannot be spoofed if the service port is reachable directly
 * (issue #1301).
 */
@Controller('propositions')
@UseGuards(JwtAuthGuard)
export class AlignmentsController {
  constructor(@Inject(AlignmentsService) private readonly alignmentsService: AlignmentsService) {}

  /**
   * Get user's alignment on a proposition
   * GET /propositions/:propositionId/alignment
   *
   * Returns user's alignment if exists, null otherwise
   */
  @Get(':propositionId/alignment')
  async getUserAlignment(
    @Param('propositionId') propositionId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AlignmentDto | null> {
    return this.alignmentsService.findUserAlignment(propositionId, user.sub);
  }

  /**
   * Set or update alignment on a proposition
   * PUT /propositions/:propositionId/alignment
   *
   * Creates new alignment or updates existing one
   */
  @Put(':propositionId/alignment')
  @HttpCode(HttpStatus.OK)
  async setAlignment(
    @Param('propositionId') propositionId: string,
    @CurrentUser() user: JwtPayload,
    @Body() setAlignmentDto: SetAlignmentDto,
  ): Promise<AlignmentDto> {
    return this.alignmentsService.setAlignment(propositionId, user.sub, setAlignmentDto);
  }

  /**
   * Remove alignment from a proposition
   * DELETE /propositions/:propositionId/alignment
   */
  @Delete(':propositionId/alignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAlignment(
    @Param('propositionId') propositionId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.alignmentsService.removeAlignment(propositionId, user.sub);
  }
}
