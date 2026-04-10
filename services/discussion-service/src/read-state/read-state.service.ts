/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateReadStateDto } from './dto/update-read-state.dto.js';
import type { ReadStateDto } from './dto/read-state.dto.js';

@Injectable()
export class ReadStateService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Update or create the read state for a user in a topic
   * @param userId - The ID of the user
   * @param topicId - The ID of the topic
   * @param dto - The read state update data
   * @returns The updated read state
   * @throws NotFoundException if the topic doesn't exist
   */
  async updateReadState(
    userId: string,
    topicId: string,
    dto: UpdateReadStateDto,
  ): Promise<ReadStateDto> {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // If lastResponseId is provided, verify it exists and belongs to the topic
    if (dto.lastResponseId) {
      const response = await this.prisma.response.findUnique({
        where: { id: dto.lastResponseId },
      });

      if (!response) {
        throw new NotFoundException(`Response with ID ${dto.lastResponseId} not found`);
      }

      if (response.topicId !== topicId) {
        throw new NotFoundException(
          `Response with ID ${dto.lastResponseId} does not belong to topic ${topicId}`,
        );
      }
    }

    // Upsert the read state
    const readState = await this.prisma.userTopicReadState.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
      update: {
        lastReadAt: new Date(),
        lastResponseId: dto.lastResponseId ?? null,
      },
      create: {
        userId,
        topicId,
        lastReadAt: new Date(),
        lastResponseId: dto.lastResponseId ?? null,
      },
    });

    return {
      userId: readState.userId,
      topicId: readState.topicId,
      lastReadAt: readState.lastReadAt,
      lastResponseId: readState.lastResponseId,
    };
  }

  /**
   * Get the current read state for a user in a topic
   * @param userId - The ID of the user
   * @param topicId - The ID of the topic
   * @returns The read state if found, null if user has not read this topic
   * @throws {NotFoundException} When the topic doesn't exist
   */
  async findReadState(userId: string, topicId: string): Promise<ReadStateDto | null> {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    const readState = await this.prisma.userTopicReadState.findUnique({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
    });

    if (!readState) {
      return null;
    }

    return {
      userId: readState.userId,
      topicId: readState.topicId,
      lastReadAt: readState.lastReadAt,
      lastResponseId: readState.lastResponseId,
    };
  }
}
