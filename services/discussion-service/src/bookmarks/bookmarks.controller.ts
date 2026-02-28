/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';
import type { CreateBookmarkDto } from './dto/create-bookmark.dto.js';
import type { BookmarkDto, BookmarkListDto, BookmarkStatusDto } from './dto/bookmark.dto.js';

@Controller('bookmarks')
export class BookmarksController {
  constructor(@Inject(BookmarksService) private readonly bookmarksService: BookmarksService) {}

  /**
   * Add a bookmark
   * POST /bookmarks
   */
  @Post()
  async addBookmark(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateBookmarkDto,
  ): Promise<BookmarkDto> {
    return this.bookmarksService.addBookmark(userId, dto);
  }

  /**
   * Remove a bookmark
   * DELETE /bookmarks/:responseId
   */
  @Delete(':responseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBookmark(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<void> {
    return this.bookmarksService.removeBookmark(userId, responseId);
  }

  /**
   * Get user's bookmarks
   * GET /bookmarks?limit=20&offset=0
   */
  @Get()
  async getBookmarks(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<BookmarkListDto> {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.bookmarksService.getBookmarks(userId, parsedLimit, parsedOffset);
  }

  /**
   * Check if a response is bookmarked
   * GET /bookmarks/:responseId/status
   */
  @Get(':responseId/status')
  async getBookmarkStatus(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<BookmarkStatusDto> {
    return this.bookmarksService.getBookmarkStatus(userId, responseId);
  }
}
