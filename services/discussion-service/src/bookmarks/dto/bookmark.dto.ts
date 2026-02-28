/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BookmarkDto {
  id: string;
  userId: string;
  responseId: string;
  createdAt: Date;
  response?: {
    id: string;
    content: string;
    topicId: string;
    topicTitle: string;
    authorDisplayName: string;
    createdAt: Date;
  };
}

export interface BookmarkListDto {
  bookmarks: BookmarkDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface BookmarkStatusDto {
  isBookmarked: boolean;
}
