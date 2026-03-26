/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { DiscussionServiceClient } from '../clients/discussion-service.client.js';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, DiscussionServiceClient],
  exports: [InvitationsService],
})
export class InvitationsModule {}
