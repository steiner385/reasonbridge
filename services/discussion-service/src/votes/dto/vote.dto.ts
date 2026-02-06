/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VoteDto {
  id: string;
  userId: string;
  responseId: string;
  voteType: 'UPVOTE' | 'DOWNVOTE';
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteSummaryDto {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: 'UPVOTE' | 'DOWNVOTE' | null;
}
