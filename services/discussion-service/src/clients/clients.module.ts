/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global } from '@nestjs/common';
import { ActivityClientService } from './activity-client.service.js';
import { AiClientService } from './ai-client.service.js';
import { ModerationClientService } from './moderation-client.service.js';

@Global()
@Module({
  providers: [ActivityClientService, AiClientService, ModerationClientService],
  exports: [ActivityClientService, AiClientService, ModerationClientService],
})
export class ClientsModule {}
