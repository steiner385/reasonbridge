/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { GroomingController } from './grooming.controller.js';
import { GroomingDetectorService } from '../services/grooming-detector.service.js';

/**
 * Module for grooming detection functionality
 *
 * @remarks
 * This module exposes the GroomingDetectorService via REST API endpoints.
 * It is used by the moderation-service to integrate grooming detection
 * into the content screening pipeline for child-friendly topics.
 *
 * Endpoints:
 * - POST /ai/grooming/analyze - Quick pattern detection
 * - POST /ai/grooming/detailed - Full analysis for moderator review
 */
@Module({
  controllers: [GroomingController],
  providers: [GroomingDetectorService],
  exports: [GroomingDetectorService],
})
export class GroomingModule {}
