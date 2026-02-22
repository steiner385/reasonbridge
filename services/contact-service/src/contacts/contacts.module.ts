/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller.js';
import { ContactsService } from './contacts.service.js';
import { ContactHashService } from './contact-hash.service.js';
import { GoogleContactsProvider } from './providers/google-contacts.provider.js';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService, ContactHashService, GoogleContactsProvider],
  exports: [ContactsService, ContactHashService],
})
export class ContactsModule {}
