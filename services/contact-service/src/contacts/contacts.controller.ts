/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service.js';
import { ImportContactsDto, ImportContactsResponseDto } from './dto/import-contacts.dto.js';
import { ContactListQueryDto, ContactListResponseDto } from './dto/contact-response.dto.js';
import { SocialProviderDto } from '../connections/dto/initiate-connection.dto.js';

// TODO: Add JWT auth guard once integrated with auth module
// For now, we'll use a placeholder userId

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import contacts from connected social provider' })
  @ApiResponse({ status: 201, type: ImportContactsResponseDto })
  async importContacts(@Body() dto: ImportContactsDto): Promise<ImportContactsResponseDto> {
    // TODO: Get userId from JWT token
    const userId = 'placeholder-user-id';
    const provider = dto.provider || SocialProviderDto.GOOGLE;

    this.logger.log(`Importing contacts from ${provider} for user ${userId}`);
    return this.contactsService.importContacts(userId, provider);
  }

  @Get()
  @ApiOperation({ summary: 'List imported contacts with pagination and filtering' })
  @ApiResponse({ status: 200, type: ContactListResponseDto })
  async getContacts(@Query() query: ContactListQueryDto): Promise<ContactListResponseDto> {
    // TODO: Get userId from JWT token
    const userId = 'placeholder-user-id';

    return this.contactsService.getContacts(userId, query);
  }
}
