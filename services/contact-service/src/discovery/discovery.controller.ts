/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service.js';
import { DiscoveryQueryDto, DiscoveryResponseDto } from './dto/discovered-user.dto.js';

@ApiTags('Discovery')
@ApiBearerAuth()
@Controller('contacts')
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name);

  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('discover')
  @ApiOperation({ summary: 'Discover ReasonBridge users from imported contacts' })
  @ApiResponse({ status: 200, type: DiscoveryResponseDto })
  async discoverUsers(@Query() query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    // TODO: Get userId from JWT token
    const userId = 'placeholder-user-id';

    this.logger.log(`Discovering users for ${userId}`);
    return this.discoveryService.discoverUsers(userId, query);
  }
}
