/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller.js';
import { SuggestionsService } from '../services/suggestions.service.js';
import { TagSuggester } from '../synthesizers/tag.suggester.js';
import { TopicLinkSuggester } from '../synthesizers/topic-link.suggester.js';
import { BridgingSuggester } from '../synthesizers/bridging.suggester.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * Module for AI-powered suggestions functionality
 * Provides tag, topic-link, and bridging suggestion capabilities
 */
@Module({
  imports: [PrismaModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, TagSuggester, TopicLinkSuggester, BridgingSuggester],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
