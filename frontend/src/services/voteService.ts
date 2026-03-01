/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from '../lib/api';

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface VoteSummary {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: VoteType | null;
}

export interface VoteResponse {
  id: string;
  userId: string;
  responseId: string;
  voteType: VoteType;
  createdAt: string;
  updatedAt: string;
}

export const voteService = {
  async getVoteSummary(responseId: string): Promise<VoteSummary> {
    return apiClient.get<VoteSummary>(`/responses/${responseId}/votes`);
  },

  async vote(responseId: string, voteType: VoteType): Promise<VoteResponse | { message: string }> {
    return apiClient.post<VoteResponse | { message: string }>(`/responses/${responseId}/vote`, {
      voteType,
    });
  },

  async removeVote(responseId: string): Promise<void> {
    return apiClient.delete(`/responses/${responseId}/vote`);
  },
};
