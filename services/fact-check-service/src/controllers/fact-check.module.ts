/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { FactCheckController } from './fact-check.controller.js';
import { FactCheckService } from '../services/fact-check.service.js';

/**
 * Module for fact-check endpoints
 *
 * T254: POST /fact-check/check endpoint
 */
@Module({
  controllers: [FactCheckController],
  providers: [FactCheckService],
  exports: [FactCheckService],
})
export class FactCheckModule {}
