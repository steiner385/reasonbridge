/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { FactCheckController } from './fact-check.controller.js';
import { FactCheckService } from './fact-check.service.js';

/**
 * Module for fact-check functionality
 *
 * Provides endpoints for checking claims against external fact-checking APIs.
 * Depends on ClientsModule (global) for fact-check client injection.
 */
@Module({
  controllers: [FactCheckController],
  providers: [FactCheckService],
  exports: [FactCheckService],
})
export class FactCheckModule {}
