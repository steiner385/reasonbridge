/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Global, Module } from '@nestjs/common';
import { UserServiceClient } from './user-service.client.js';

/**
 * Module providing HTTP clients for cross-service communication.
 *
 * Marked as @Global() so all modules can inject clients without explicit imports.
 * All clients follow the fire-and-forget pattern for resilience.
 */
@Global()
@Module({
  providers: [UserServiceClient],
  exports: [UserServiceClient],
})
export class ClientsModule {}
