/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicDuplicateController } from './topic-duplicate.controller.js';
import { TopicDuplicateDetectorService } from '../services/topic-duplicate-detector.service.js';
import { CacheModule } from '../cache/cache.module.js';

/**
 * Module for topic duplicate detection
 * Feature 016: Topic Management (T221)
 *
 * Provides semantic similarity analysis for detecting duplicate topics
 * using AI embeddings to enhance trigram-based matching.
 */
@Module({
  imports: [CacheModule],
  controllers: [TopicDuplicateController],
  providers: [TopicDuplicateDetectorService],
  exports: [TopicDuplicateDetectorService],
})
export class TopicDuplicateModule {}
