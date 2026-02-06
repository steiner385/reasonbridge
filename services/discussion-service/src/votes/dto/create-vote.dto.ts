/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum } from 'class-validator';

export class CreateVoteDto {
  @IsEnum(['UPVOTE', 'DOWNVOTE'])
  voteType!: 'UPVOTE' | 'DOWNVOTE';
}
