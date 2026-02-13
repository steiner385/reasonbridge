/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global } from '@nestjs/common';
import { ActivityClientService } from './activity-client.service.js';

@Global()
@Module({
  providers: [ActivityClientService],
  exports: [ActivityClientService],
})
export class ClientsModule {}
