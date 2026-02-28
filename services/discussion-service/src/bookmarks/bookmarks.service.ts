/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateBookmarkDto } from './dto/create-bookmark.dto.js';
import type { BookmarkDto, BookmarkListDto, BookmarkStatusDto } from './dto/bookmark.dto.js';

@Injectable()
export class BookmarksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Add a bookmark to a response
   * @param userId - The ID of the user adding the bookmark
   * @param dto - The bookmark data containing the responseId
   * @returns The created bookmark
   * @throws NotFoundException if the response doesn't exist
   * @throws ConflictException if the bookmark already exists
   */
  async addBookmark(userId: string, dto: CreateBookmarkDto): Promise<BookmarkDto> {
    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: dto.responseId },
      include: {
        topic: {
          select: { id: true, title: true },
        },
        author: {
          select: { displayName: true },
        },
      },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${dto.responseId} not found`);
    }

    // Check if bookmark already exists
    const existing = await this.prisma.bookmark.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId: dto.responseId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Bookmark already exists');
    }

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        responseId: dto.responseId,
      },
      include: {
        response: {
          include: {
            topic: {
              select: { id: true, title: true },
            },
            author: {
              select: { displayName: true },
            },
          },
        },
      },
    });

    return {
      id: bookmark.id,
      userId: bookmark.userId,
      responseId: bookmark.responseId,
      createdAt: bookmark.createdAt,
      response: {
        id: bookmark.response.id,
        content: bookmark.response.content,
        topicId: bookmark.response.topic.id,
        topicTitle: bookmark.response.topic.title,
        authorDisplayName: bookmark.response.author.displayName || 'Anonymous',
        createdAt: bookmark.response.createdAt,
      },
    };
  }

  /**
   * Remove a bookmark from a response
   * @param userId - The ID of the user removing the bookmark
   * @param responseId - The ID of the response to unbookmark
   * @throws NotFoundException if the bookmark doesn't exist
   */
  async removeBookmark(userId: string, responseId: string): Promise<void> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId,
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmark.id },
    });
  }

  /**
   * Get all bookmarks for a user with pagination
   * @param userId - The ID of the user
   * @param limit - Maximum number of bookmarks to return (default 20)
   * @param offset - Number of bookmarks to skip (default 0)
   * @returns Paginated list of bookmarks with response details
   */
  async getBookmarks(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<BookmarkListDto> {
    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        include: {
          response: {
            include: {
              topic: {
                select: { id: true, title: true },
              },
              author: {
                select: { displayName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);

    return {
      bookmarks: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        userId: bookmark.userId,
        responseId: bookmark.responseId,
        createdAt: bookmark.createdAt,
        response: {
          id: bookmark.response.id,
          content: bookmark.response.content,
          topicId: bookmark.response.topic.id,
          topicTitle: bookmark.response.topic.title,
          authorDisplayName: bookmark.response.author.displayName || 'Anonymous',
          createdAt: bookmark.response.createdAt,
        },
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Check if a response is bookmarked by a user
   * @param userId - The ID of the user
   * @param responseId - The ID of the response
   * @returns Whether the response is bookmarked
   */
  async getBookmarkStatus(userId: string, responseId: string): Promise<BookmarkStatusDto> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId,
        },
      },
    });

    return { isBookmarked: !!bookmark };
  }
}
