/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service.js';
import { DiscoveryQueryDto, DiscoveryResponseDto } from './dto/discovered-user.dto.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@ApiTags('Discovery')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name);

  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('discover')
  @ApiOperation({ summary: 'Discover ReasonBridge users from imported contacts' })
  @ApiResponse({ status: 200, type: DiscoveryResponseDto })
  async discoverUsers(
    @CurrentUser() user: JwtPayload,
    @Query() query: DiscoveryQueryDto,
  ): Promise<DiscoveryResponseDto> {
    const userId = user.userId ?? user.sub;

    this.logger.log(`Discovering users for ${userId}`);
    return this.discoveryService.discoverUsers(userId, query);
  }
}
