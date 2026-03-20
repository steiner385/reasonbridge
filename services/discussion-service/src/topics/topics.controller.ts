/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  Request,
  Headers,
  Inject,
} from '@nestjs/common';
// TEMPORARILY DISABLED for debugging hang issue
// import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply as Response } from 'fastify';
import { TopicsService } from './topics.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import { SearchTopicsQueryDto } from './dto/search-topics-query.dto.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { UpdateTopicDto } from './dto/update-topic.dto.js';
import { UpdateTopicStatusDto } from './dto/update-topic-status.dto.js';
import { MergeTopicsDto } from './dto/merge-topics.dto.js';
import { GetCommonGroundQueryDto } from './dto/common-ground-query.dto.js';
import { AddTopicTagDto, type AddTagResponseDto } from './dto/add-topic-tag.dto.js';
// Topic link DTOs moved to topic-links.controller.ts
import { ExportCommonGroundQueryDto } from './dto/export-common-ground-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { TopicsAnalyticsService } from './topics-analytics.service.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@Controller('topics')
export class TopicsController {
  constructor(
    @Inject(TopicsService) private readonly topicsService: TopicsService,
    @Inject(CommonGroundExportService) private readonly exportService: CommonGroundExportService,
    @Inject(TopicsAnalyticsService) private readonly analyticsService: TopicsAnalyticsService,
  ) {}

  /**
   * List topics with filtering and pagination
   * Cached for 5 minutes (300 seconds)
   */
  @Get()
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(300000) // 5 minutes in ms
  async getTopics(@Query() query: GetTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.getTopics(query);
  }

  /**
   * Search topics by query string
   * Cached for 5 minutes (300 seconds)
   */
  @Get('search')
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(300000) // 5 minutes in ms
  async searchTopics(@Query() query: SearchTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.searchTopics(query);
  }

  /**
   * Merge multiple topics into one
   * Feature 016: Topic Management (T044)
   *
   * Authentication: Required (moderator only)
   * Moves all responses from source topics to target, archives sources
   * Creates merge record with 30-day rollback window
   */
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  // TODO: Add ModeratorGuard for proper role check
  async mergeTopics(
    @Body() mergeDto: MergeTopicsDto,
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // Check moderator role (still using request context for role until role is in JWT)
    const isModerator = req.user?.role === 'MODERATOR' || req.user?.role === 'ADMIN' || false;

    if (!isModerator) {
      throw new Error('Only moderators can merge topics.');
    }

    return this.topicsService.mergeTopics(user.sub, mergeDto);
  }

  /**
   * Create a new discussion topic
   * Feature 016: Topic Management (T015, T016)
   *
   * Authentication: Required (user must be logged in)
   * Rate limit: 5 requests per day per user (T016)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 86400000 } }) // 5 per day (86400000ms = 24h)
  async createTopic(
    @Body() createTopicDto: CreateTopicDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TopicResponseDto> {
    return this.topicsService.createTopic(user.sub, createTopicDto);
  }

  /**
   * Update topic status (archive, lock, reopen, etc.)
   * Feature 016: Topic Management (T028)
   *
   * Authentication: Required (user must be logged in)
   * Authorization: Topic creator or moderator
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateTopicStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTopicStatusDto,
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // Check moderator role (still using request context for role until role is in JWT)
    const isModerator = req.user?.role === 'MODERATOR' || req.user?.role === 'ADMIN' || false;

    return this.topicsService.updateTopicStatus(id, user.sub, updateStatusDto.status, isModerator);
  }

  /**
   * Update topic details (title, description, tags)
   * Feature 016: Topic Management (T033)
   *
   * Authentication: Required (user must be logged in)
   * Authorization: Topic creator or moderator
   * Edit reason required for topics older than 24 hours
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateTopic(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // Check moderator role (still using request context for role until role is in JWT)
    const isModerator = req.user?.role === 'MODERATOR' || req.user?.role === 'ADMIN' || false;

    return this.topicsService.updateTopic(id, user.sub, updateTopicDto, isModerator);
  }

  /**
   * Get single topic by ID
   * Cached for 30 minutes (1800 seconds)
   */
  @Get(':id')
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(1800000) // 30 minutes in ms
  async getTopicById(@Param('id') id: string): Promise<TopicResponseDto> {
    return this.topicsService.getTopicById(id);
  }

  /**
   * Get edit history for a topic
   * Feature 016: Topic Management (T034)
   *
   * Returns chronological list of all edits with change details
   */
  @Get(':id/history')
  async getTopicEditHistory(@Param('id') id: string, @Query('limit') limit?: string): Promise<any> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.topicsService.getTopicEditHistory(id, limitNum);
  }

  /**
   * Add a tag to a topic
   * Feature: AI Suggestion Actions (#1054)
   *
   * Used when users accept AI-suggested tags or add their own tags.
   * Tracks tag source for AI feedback loop.
   *
   * Authentication: Required (user must be logged in)
   */
  @Post(':id/tags')
  @UseGuards(JwtAuthGuard)
  async addTagToTopic(
    @Param('id') id: string,
    @Body() addTagDto: AddTopicTagDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AddTagResponseDto> {
    // CREATOR is only used during topic creation; for this endpoint default to AI_SUGGESTED
    const source =
      addTagDto.source === 'AI_SUGGESTED' || addTagDto.source === 'COMMUNITY'
        ? addTagDto.source
        : 'AI_SUGGESTED';
    const tag = await this.topicsService.addTagToTopic(id, user.sub, addTagDto.tag, source);

    return {
      success: true,
      tag,
      topicId: id,
      source,
    };
  }

  // NOTE: Topic link creation is handled by TopicLinksController at topics/:topicId/links
  // The duplicate route was removed to fix FST_ERR_DUPLICATED_ROUTE error.
  // See: topic-links.controller.ts for POST /topics/:topicId/links

  /**
   * Get analytics for a topic
   * Feature 016: Topic Management (T041)
   * Cached for 1 hour (3600 seconds) - acceptable staleness for analytics
   *
   * Returns participation metrics, engagement trends, and activity over time
   */
  @Get(':id/analytics')
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(3600000) // 1 hour in ms
  async getTopicAnalytics(@Param('id') id: string, @Query('days') days?: string): Promise<any> {
    const daysBack = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getTopicAnalytics(id, daysBack);
  }

  /**
   * Get common ground analysis for a topic
   * Cached for 24 hours (86400 seconds) - expensive AI operation
   */
  @Get(':id/common-ground')
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(86400000) // 24 hours in ms
  async getCommonGroundAnalysis(
    @Param('id') id: string,
    @Query() query: GetCommonGroundQueryDto,
  ): Promise<CommonGroundResponseDto> {
    return this.topicsService.getCommonGroundAnalysis(id, query.version);
  }

  @Get(':id/common-ground/export')
  async exportCommonGroundAnalysis(
    @Param('id') id: string,
    @Query() query: ExportCommonGroundQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    // Fetch the analysis
    const analysis = await this.topicsService.getCommonGroundAnalysis(id, query.version);

    // Export in the requested format
    const exportResult = await this.exportService.exportAnalysis(analysis, query.format || 'pdf');

    // Set response headers
    res.header('Content-Type', exportResult.mimeType);
    res.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);

    // Send the data
    if (Buffer.isBuffer(exportResult.data)) {
      res.send(exportResult.data);
    } else {
      res.send(exportResult.data);
    }
  }

  @Get(':id/common-ground/share-link')
  async getCommonGroundShareLink(
    @Param('id') id: string,
    @Query() query: GetCommonGroundQueryDto,
  ): Promise<{ shareUrl: string; analysisId: string }> {
    // Fetch the analysis to ensure it exists
    const analysis = await this.topicsService.getCommonGroundAnalysis(id, query.version);

    // Generate share link (baseUrl should come from config in production)
    const baseUrl = process.env['APP_BASE_URL'] || 'http://localhost:3000';
    const shareUrl = this.exportService.generateShareLink(analysis.id, baseUrl);

    return {
      shareUrl,
      analysisId: analysis.id,
    };
  }
}
