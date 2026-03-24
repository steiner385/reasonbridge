/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Body, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service.js';
import { ImportContactsDto, ImportContactsResponseDto } from './dto/import-contacts.dto.js';
import { ContactListQueryDto, ContactListResponseDto } from './dto/contact-response.dto.js';
import { SocialProviderDto } from '../connections/dto/initiate-connection.dto.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import contacts from connected social provider' })
  @ApiResponse({ status: 201, type: ImportContactsResponseDto })
  async importContacts(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ImportContactsDto,
  ): Promise<ImportContactsResponseDto> {
    const userId = user.userId ?? user.sub;
    const provider = dto.provider || SocialProviderDto.GOOGLE;

    this.logger.log(`Importing contacts from ${provider} for user ${userId}`);
    return this.contactsService.importContacts(userId, provider);
  }

  @Get()
  @ApiOperation({ summary: 'List imported contacts with pagination and filtering' })
  @ApiResponse({ status: 200, type: ContactListResponseDto })
  async getContacts(
    @CurrentUser() user: JwtPayload,
    @Query() query: ContactListQueryDto,
  ): Promise<ContactListResponseDto> {
    const userId = user.userId ?? user.sub;

    return this.contactsService.getContacts(userId, query);
  }
}
