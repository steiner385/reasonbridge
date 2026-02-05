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
  Request,
} from '@nestjs/common';
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
import { ExportCommonGroundQueryDto } from './dto/export-common-ground-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { TopicsAnalyticsService } from './topics-analytics.service.js';

@Controller('topics')
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly exportService: CommonGroundExportService,
    private readonly analyticsService: TopicsAnalyticsService,
  ) {}

  @Get()
  async getTopics(@Query() query: GetTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.getTopics(query);
  }

  @Get('search')
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
  // TODO: Add moderator guard once auth module is integrated
  // @UseGuards(JwtAuthGuard, ModeratorGuard)
  async mergeTopics(
    @Body() mergeDto: MergeTopicsDto,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // TODO: Extract userId and validate moderator role once auth is integrated
    const userId = req.user?.id || req.userId;
    const isModerator = req.user?.role === 'MODERATOR' || req.user?.role === 'ADMIN' || false;

    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }

    if (!isModerator) {
      throw new Error('Only moderators can merge topics.');
    }

    return this.topicsService.mergeTopics(userId, mergeDto);
  }

  /**
   * Create a new discussion topic
   * Feature 016: Topic Management (T015, T016)
   *
   * Authentication: Required (user must be logged in)
   * Rate limit: 5 requests per day per user (T016)
   */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 86400000 } }) // 5 per day (86400000ms = 24h)
  // TODO: Add authentication guard once auth module is integrated
  // @UseGuards(JwtAuthGuard)
  async createTopic(
    @Body() createTopicDto: CreateTopicDto,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // TODO: Extract userId from authenticated request once auth is integrated
    // For now, userId should be passed in request context by auth middleware
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }

    return this.topicsService.createTopic(userId, createTopicDto);
  }

  /**
   * Update topic status (archive, lock, reopen, etc.)
   * Feature 016: Topic Management (T028)
   *
   * Authentication: Required (user must be logged in)
   * Authorization: Topic creator or moderator
   */
  @Patch(':id/status')
  // TODO: Add authentication guard once auth module is integrated
  // @UseGuards(JwtAuthGuard)
  async updateTopicStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTopicStatusDto,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // TODO: Extract userId and isModerator from authenticated request once auth is integrated
    const userId = req.user?.id || req.userId;
    const isModerator = req.user?.role === 'MODERATOR' || req.user?.role === 'ADMIN' || false;

    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }

    return this.topicsService.updateTopicStatus(id, userId, updateStatusDto.status, isModerator);
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
  // TODO: Add authentication guard once auth module is integrated
  // @UseGuards(JwtAuthGuard)
  async updateTopic(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @Request() req: any,
  ): Promise<TopicResponseDto> {
    // TODO: Extract userId and isModerator from authenticated request once auth is integrated
    const userId = req.user?.id || req.userId;
    const isModerator = req.user?.role === 'MODERATOR' || req.user?.role === 'ADMIN' || false;

    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }

    return this.topicsService.updateTopic(id, userId, updateTopicDto, isModerator);
  }

  @Get(':id')
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
   * Get analytics for a topic
   * Feature 016: Topic Management (T041)
   *
   * Returns participation metrics, engagement trends, and activity over time
   */
  @Get(':id/analytics')
  async getTopicAnalytics(@Param('id') id: string, @Query('days') days?: string): Promise<any> {
    const daysBack = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getTopicAnalytics(id, daysBack);
  }

  @Get(':id/common-ground')
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
