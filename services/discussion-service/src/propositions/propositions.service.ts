/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePropositionDto } from './dto/create-proposition.dto.js';
import type { PropositionResponseDto } from './dto/create-proposition.dto.js';

/**
 * Service for managing propositions
 * Feature 016: Topic Management - Propositions (T213)
 */
@Injectable()
export class PropositionsService {
  private readonly logger = new Logger(PropositionsService.name);

  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * Find propositions for a topic with pagination
   *
   * @param topicId - The topic ID
   * @param limit - Maximum number of propositions to return (default: 100, max: 500)
   * @param offset - Number of propositions to skip (default: 0)
   * @returns Paginated list of propositions
   */
  async findByTopicId(topicId: string, limit = 100, offset = 0) {
    // Enforce maximum limit to prevent excessive data fetching
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const safeOffset = Math.max(0, offset);

    return this.prisma.proposition.findMany({
      where: { topicId },
      include: {
        responses: {
          select: { responseId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip: safeOffset,
    });
  }

  /**
   * Create a single proposition for a topic
   * @param topicId - The topic ID to create the proposition for
   * @param creatorId - The user ID creating the proposition
   * @param dto - The proposition data
   * @returns The created proposition
   */
  async createProposition(
    topicId: string,
    creatorId: string,
    dto: CreatePropositionDto,
  ): Promise<PropositionResponseDto> {
    // Verify the topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // If parent proposition is specified, verify it exists and belongs to the same topic
    if (dto.parentPropositionId) {
      const parentProposition = await this.prisma.proposition.findUnique({
        where: { id: dto.parentPropositionId },
      });

      if (!parentProposition) {
        throw new NotFoundException(
          `Parent proposition with ID ${dto.parentPropositionId} not found`,
        );
      }

      if (parentProposition.topicId !== topicId) {
        throw new NotFoundException(`Parent proposition does not belong to this topic`);
      }
    }

    const proposition = await this.prisma.proposition.create({
      data: {
        topicId,
        statement: dto.statement,
        source: 'USER_CREATED',
        creatorId,
        parentPropositionId: dto.parentPropositionId || null,
        supportCount: 0,
        opposeCount: 0,
        nuancedCount: 0,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Created proposition ${proposition.id} for topic ${topicId}`);

    return this.mapToResponseDto(proposition);
  }

  /**
   * Create multiple initial propositions for a topic
   * Used during topic creation to set up initial propositions
   * @param topicId - The topic ID
   * @param creatorId - The user ID creating the propositions
   * @param statements - Array of proposition statements
   * @returns Array of created propositions
   */
  async createInitialPropositions(
    topicId: string,
    creatorId: string,
    statements: string[],
  ): Promise<PropositionResponseDto[]> {
    if (!statements || statements.length === 0) {
      return [];
    }

    this.logger.log(`Creating ${statements.length} initial propositions for topic ${topicId}`);

    const propositions = await this.prisma.$transaction(
      statements.map((statement) =>
        this.prisma.proposition.create({
          data: {
            topicId,
            statement,
            source: 'USER_CREATED',
            creatorId,
            supportCount: 0,
            opposeCount: 0,
            nuancedCount: 0,
            status: 'ACTIVE',
          },
        }),
      ),
    );

    this.logger.log(
      `Successfully created ${propositions.length} propositions for topic ${topicId}`,
    );

    return propositions.map((p) => this.mapToResponseDto(p));
  }

  /**
   * Map a Prisma proposition to response DTO
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma Proposition with dynamic includes
  private mapToResponseDto(proposition: any): PropositionResponseDto {
    return {
      id: proposition.id,
      topicId: proposition.topicId,
      statement: proposition.statement,
      source: proposition.source,
      creatorId: proposition.creatorId,
      parentPropositionId: proposition.parentPropositionId,
      supportCount: proposition.supportCount,
      opposeCount: proposition.opposeCount,
      nuancedCount: proposition.nuancedCount,
      consensusScore: proposition.consensusScore ? Number(proposition.consensusScore) : null,
      status: proposition.status,
      createdAt: proposition.createdAt,
    };
  }
}
