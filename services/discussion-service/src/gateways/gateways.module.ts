/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global } from '@nestjs/common';
import { DiscussionGateway } from './discussion.gateway.js';

/**
 * Module for WebSocket gateways
 * Marked as global so the gateway can be injected into services
 */
@Global()
@Module({
  providers: [DiscussionGateway],
  exports: [DiscussionGateway],
})
export class GatewaysModule {}
