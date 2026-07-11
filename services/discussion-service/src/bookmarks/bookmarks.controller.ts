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
  UseGuards,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';
// NOTE: Must be a value import (not `import type`). This class is used as an
// @Body() parameter type, so `emitDecoratorMetadata` needs the runtime class
// reference. With verbatimModuleSyntax, `import type` would elide it and tsc
// would emit `Function` as the paramtype, silently breaking ValidationPipe.
import { CreateBookmarkDto } from './dto/create-bookmark.dto.js';
import type { BookmarkDto, BookmarkListDto, BookmarkStatusDto } from './dto/bookmark.dto.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@Controller('bookmarks')
export class BookmarksController {
  constructor(@Inject(BookmarksService) private readonly bookmarksService: BookmarksService) {}

  /**
   * Add a bookmark
   * POST /bookmarks
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async addBookmark(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBookmarkDto,
  ): Promise<BookmarkDto> {
    return this.bookmarksService.addBookmark(user.sub, dto);
  }

  /**
   * Remove a bookmark
   * DELETE /bookmarks/:responseId
   */
  @Delete(':responseId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBookmark(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.bookmarksService.removeBookmark(user.sub, responseId);
  }

  /**
   * Get user's bookmarks
   * GET /bookmarks?limit=20&offset=0
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getBookmarks(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<BookmarkListDto> {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.bookmarksService.getBookmarks(user.sub, parsedLimit, parsedOffset);
  }

  /**
   * Check if a response is bookmarked
   * GET /bookmarks/:responseId/status
   */
  @Get(':responseId/status')
  @UseGuards(JwtAuthGuard)
  async getBookmarkStatus(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<BookmarkStatusDto> {
    return this.bookmarksService.getBookmarkStatus(user.sub, responseId);
  }
}
