import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller.js';
import { SuggestionsService } from '../services/suggestions.service.js';
import { TagSuggester } from '../synthesizers/tag.suggester.js';
import { TopicLinkSuggester } from '../synthesizers/topic-link.suggester.js';

/**
 * Module for AI-powered suggestions functionality
 * Provides tag and topic-link suggestion capabilities
 */
@Module({
  controllers: [SuggestionsController],
  providers: [SuggestionsService, TagSuggester, TopicLinkSuggester],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
