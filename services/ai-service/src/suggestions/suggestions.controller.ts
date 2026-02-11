/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { SuggestionsService } from '../services/suggestions.service.js';
import { TagSuggestionsRequestDto, TagSuggestionsResponseDto } from './dto/tag-suggestions.dto.js';
import {
  TopicLinkSuggestionsRequestDto,
  TopicLinkSuggestionsResponseDto,
  TopicLinkDto,
} from './dto/topic-link-suggestions.dto.js';
import { BridgingSuggestionsResponseDto } from './dto/bridging-suggestions.dto.js';
import { FramingSuggestionsRequestDto } from './dto/framing-suggestions.dto.js';
import type { FramingSuggestionsResponseDto } from './dto/framing-suggestions.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Controller for AI-powered suggestion endpoints
 */
@Controller('suggest')
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly prisma: PrismaService,
  ) {}

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
      ? result.linkSuggestions.map((link) => ({
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

  /**
   * Get bridging suggestions for a topic
   * GET /suggest/bridging-suggestions/:topicId
   *
   * Analyzes propositions and alignments to suggest ways to bridge different perspectives
   *
   * @param topicId The topic ID to analyze
   * @returns Bridging suggestions with common ground analysis
   */
  @Get('bridging-suggestions/:topicId')
  @HttpCode(HttpStatus.OK)
  async getBridgingSuggestions(
    @Param('topicId') topicId: string,
  ): Promise<BridgingSuggestionsResponseDto> {
    // Verify the topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Generate bridging suggestions
    const result = await this.suggestionsService.generateBridgingSuggestions(topicId);

    return {
      topicId,
      suggestions: result.suggestions,
      overallConsensusScore: result.overallConsensusScore,
      conflictAreas: result.conflictAreas,
      commonGroundAreas: result.commonGroundAreas,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning,
      attribution: 'AI Assistant',
    };
  }

  /**
   * Get framing suggestions for a topic
   * POST /suggest/framing
   *
   * Analyzes title and description to suggest more neutral, clear, and inclusive framings
   * Feature 016: Topic Management - AI Framing Suggestions (T215)
   *
   * @param dto Request containing title, description, and optional context
   * @returns Framing suggestions with neutrality, clarity, and inclusivity scores
   */
  @Post('framing')
  @HttpCode(HttpStatus.OK)
  async suggestFraming(
    @Body() dto: FramingSuggestionsRequestDto,
  ): Promise<FramingSuggestionsResponseDto> {
    const result = await this.suggestionsService.generateFramingSuggestions(
      dto.title,
      dto.description,
      dto.context,
    );

    return {
      originalTitle: result.originalTitle,
      suggestedTitle: result.suggestedTitle,
      suggestions: result.suggestions,
      neutralityScore: result.neutralityScore,
      clarityScore: result.clarityScore,
      inclusivityScore: result.inclusivityScore,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning,
      attribution: 'AI Assistant',
    };
  }
}
