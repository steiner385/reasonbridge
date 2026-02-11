/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, IsEnum, Length, IsUUID } from 'class-validator';

/**
 * DTO for creating a new proposition
 * Feature 016: Topic Management - Initial Propositions (T213)
 */
export class CreatePropositionDto {
  /**
   * Proposition statement (10-1000 characters)
   * This is the core claim or position being proposed
   */
  @IsString()
  @Length(10, 1000, {
    message: 'Proposition statement must be between 10 and 1000 characters',
  })
  statement!: string;

  /**
   * Optional parent proposition ID for hierarchical propositions
   */
  @IsOptional()
  @IsUUID('4', {
    message: 'Parent proposition ID must be a valid UUID',
  })
  parentPropositionId?: string;
}

/**
 * DTO for initial propositions when creating a topic
 * Simplified version that only requires the statement
 */
export class InitialPropositionDto {
  /**
   * Proposition statement (10-1000 characters)
   */
  @IsString()
  @Length(10, 1000, {
    message: 'Proposition statement must be between 10 and 1000 characters',
  })
  statement!: string;
}

/**
 * Response DTO for proposition data
 */
export interface PropositionResponseDto {
  id: string;
  topicId: string;
  statement: string;
  source: 'AI_IDENTIFIED' | 'USER_CREATED';
  creatorId: string | null;
  parentPropositionId: string | null;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number | null;
  status: 'ACTIVE' | 'MERGED' | 'ARCHIVED';
  createdAt: Date;
}
