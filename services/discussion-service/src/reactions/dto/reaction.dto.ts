/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReactionDto {
  id: string;
  responseId: string;
  userId: string;
  userName: string;
  emoji: string;
  createdAt: Date;
}

export interface ReactionSummaryDto {
  emoji: string;
  count: number;
  users: { id: string; displayName: string }[];
  userReacted: boolean;
}

export interface ReactionListDto {
  reactions: ReactionSummaryDto[];
  totalCount: number;
}
