/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export class ReactionDto {
  id: string;
  responseId: string;
  userId: string;
  userName: string;
  emoji: string;
  createdAt: Date;
}

export class ReactionSummaryDto {
  emoji: string;
  count: number;
  users: { id: string; displayName: string }[];
  userReacted: boolean;
}

export class ReactionListDto {
  reactions: ReactionSummaryDto[];
  totalCount: number;
}
