/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtVerificationService } from './jwt-verification.service.js';

/**
 * Auth Module for notification-service
 *
 * Provides JWT verification capabilities for WebSocket connections.
 * This is a lightweight auth module that only handles token verification,
 * not full authentication flows.
 */
@Module({
  imports: [ConfigModule],
  providers: [JwtVerificationService],
  exports: [JwtVerificationService],
})
export class AuthModule {}
