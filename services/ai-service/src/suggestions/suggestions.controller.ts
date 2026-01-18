import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SuggestionsService } from '../services/suggestions.service.js';
import {
  TagSuggestionsRequestDto,
  TagSuggestionsResponseDto,
} from './dto/tag-suggestions.dto.js';
import {
  TopicLinkSuggestionsRequestDto,
  TopicLinkSuggestionsResponseDto,
  TopicLinkDto,
} from './dto/topic-link-suggestions.dto.js';

/**
 * Controller for AI-powered suggestion endpoints
 */
@Controller('suggest')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  /**
   * Generate tag suggestions for a topic
   * POST /suggest/tags
   *
   * @param dto Request containing title and content
   * @returns Tag suggestions with confidence and reasoning
   */
  @Post('tags')
  @HttpCode(HttpStatus.OK)
  async suggestTags(@Body() dto: TagSuggestionsRequestDto): Promise<TagSuggestionsResponseDto> {
    const result = await this.suggestionsService.generateTagSuggestions(dto.title, dto.content);

    return {
      suggestions: result.suggestions,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning,
      attribution: 'AI Assistant',
    };
  }

  /**
   * Generate topic link suggestions
   * POST /suggest/topic-links
   *
   * @param dto Request containing topicId, title, and content
   * @returns Topic link suggestions with relationship types, confidence, and reasoning
   */
  @Post('topic-links')
  @HttpCode(HttpStatus.OK)
  async suggestTopicLinks(
    @Body() dto: TopicLinkSuggestionsRequestDto,
  ): Promise<TopicLinkSuggestionsResponseDto> {
    // TODO: In the future, fetch existing topics from database if not provided
    const existingTopics = dto.existingTopicIds ? [] : undefined;

    const result = await this.suggestionsService.generateTopicLinkSuggestions(
      dto.topicId,
      dto.title,
      dto.content,
      existingTopics,
    );

    // Map internal TopicLinkSuggestion to DTO format
    const linkSuggestions: TopicLinkDto[] = result.linkSuggestions
      ? result.linkSuggestions.map(link => ({
          targetTopicId: link.targetTopicId,
          relationshipType: link.relationshipType,
          reasoning: link.reasoning,
        }))
      : [];

    return {
      suggestions: result.suggestions,
      linkSuggestions,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning,
      attribution: 'AI Assistant',
    };
  }
}
