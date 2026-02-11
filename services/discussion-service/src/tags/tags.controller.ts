/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TagsService } from './tags.service.js';
import {
  CreateTagDto,
  UpdateTagDto,
  GetTagsQueryDto,
  SearchTagsDto,
  MergeTagsDto,
} from './dto/tag.dto.js';
import type { TagResponseDto, TagListResponseDto, TagStatisticsDto } from './dto/tag.dto.js';

/**
 * Controller for tag management endpoints
 * Feature 016: Topic Management (T216)
 *
 * Provides REST API for:
 * - Listing and searching tags
 * - Creating, updating, and deleting tags
 * - Merging duplicate tags
 * - Tag statistics and analytics
 */
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * GET /tags
   * List all tags with optional filtering, sorting, and pagination
   */
  @Get()
  async getTags(@Query() query: GetTagsQueryDto): Promise<TagListResponseDto> {
    return this.tagsService.getTags(query);
  }

  /**
   * GET /tags/search
   * Search tags for autocomplete functionality
   */
  @Get('search')
  async searchTags(@Query() query: SearchTagsDto): Promise<TagResponseDto[]> {
    return this.tagsService.searchTags(query);
  }

  /**
   * GET /tags/:id
   * Get a single tag by ID
   */
  @Get(':id')
  async getTagById(@Param('id', ParseUUIDPipe) id: string): Promise<TagResponseDto> {
    return this.tagsService.getTagById(id);
  }

  /**
   * GET /tags/slug/:slug
   * Get a tag by its URL-friendly slug
   */
  @Get('slug/:slug')
  async getTagBySlug(@Param('slug') slug: string): Promise<TagResponseDto> {
    return this.tagsService.getTagBySlug(slug);
  }

  /**
   * GET /tags/:id/statistics
   * Get usage statistics for a tag
   */
  @Get(':id/statistics')
  async getTagStatistics(@Param('id', ParseUUIDPipe) id: string): Promise<TagStatisticsDto> {
    return this.tagsService.getTagStatistics(id);
  }

  /**
   * POST /tags
   * Create a new tag
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTag(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagsService.createTag(dto);
  }

  /**
   * PUT /tags/:id
   * Update an existing tag
   */
  @Put(':id')
  async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tagsService.updateTag(id, dto);
  }

  /**
   * DELETE /tags/:id
   * Delete a tag
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTag(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tagsService.deleteTag(id);
  }

  /**
   * PATCH /tags/merge
   * Merge two tags (moves all associations from source to target)
   */
  @Patch('merge')
  async mergeTags(@Body() dto: MergeTagsDto): Promise<TagResponseDto> {
    return this.tagsService.mergeTags(dto);
  }
}
