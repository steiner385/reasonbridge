/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global } from '@nestjs/common';
import { GoogleFactCheckClient } from './google-fact-check.client.js';

/**
 * Module for external API clients
 * T253: External fact-check API client implementation
 */
@Global()
@Module({
  providers: [GoogleFactCheckClient],
  exports: [GoogleFactCheckClient],
})
export class ClientsModule {}
