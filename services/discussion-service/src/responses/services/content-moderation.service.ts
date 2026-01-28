import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModerateResponseDto, ModerationActionResponseDto } from '../dto/moderate-response.dto.js';

/**
 * Service for handling content moderation operations
 * Supports hiding and removing responses with proper audit trail
 */
@Injectable()
export class ContentModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hide a response from public view
   * The response is not deleted but is marked as HIDDEN
   *
   * @param responseId - The ID of the response to hide
   * @param moderatorId - The ID of the user performing the moderation (must be moderator)
   * @param moderateDto - The moderation action details
   * @returns Information about the moderation action performed
   */
  async hideResponse(
    responseId: string,
    moderatorId: string,
    moderateDto: ModerateResponseDto,
  ): Promise<ModerationActionResponseDto> {
    if (moderateDto.action !== 'hide') {
      throw new BadRequestException('Action must be "hide" for this operation');
    }

    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        status: true,
        authorId: true,
        topicId: true,
      },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Cannot hide already removed content
    if (response.status === 'REMOVED') {
      throw new BadRequestException('Cannot hide a response that has been removed');
    }

    // Cannot hide already hidden content (idempotent)
    if (response.status === 'HIDDEN') {
      return this.buildModerationResponse(responseId, 'hide', moderatorId, moderateDto.reason);
    }

    // Update response status to HIDDEN
    await this.prisma.response.update({
      where: { id: responseId },
      data: {
        status: 'HIDDEN',
      },
    });

    return this.buildModerationResponse(responseId, 'hide', moderatorId, moderateDto.reason);
  }

  /**
   * Remove a response entirely
   * The response is deleted from the database
   *
   * @param responseId - The ID of the response to remove
   * @param moderatorId - The ID of the user performing the moderation (must be moderator)
   * @param moderateDto - The moderation action details
   * @returns Information about the moderation action performed
   */
  async removeResponse(
    responseId: string,
    moderatorId: string,
    moderateDto: ModerateResponseDto,
  ): Promise<ModerationActionResponseDto> {
    if (moderateDto.action !== 'remove') {
      throw new BadRequestException('Action must be "remove" for this operation');
    }

    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        status: true,
        authorId: true,
        topicId: true,
      },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Update response status to REMOVED
    await this.prisma.response.update({
      where: { id: responseId },
      data: {
        status: 'REMOVED',
      },
    });

    return this.buildModerationResponse(responseId, 'remove', moderatorId, moderateDto.reason);
  }

  /**
   * Restore a hidden response back to visible
   * Can only restore responses that are currently hidden
   *
   * @param responseId - The ID of the response to restore
   * @param moderatorId - The ID of the user performing the restoration
   * @param reason - Reason for restoring the response
   */
  async restoreResponse(
    responseId: string,
    moderatorId: string,
    reason: string,
  ): Promise<ModerationActionResponseDto> {
    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        status: true,
        authorId: true,
      },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Can only restore hidden responses, not removed ones
    if (response.status !== 'HIDDEN') {
      throw new BadRequestException(
        `Cannot restore response with status: ${response.status}. Only HIDDEN responses can be restored.`,
      );
    }

    // Update response status back to VISIBLE
    await this.prisma.response.update({
      where: { id: responseId },
      data: {
        status: 'VISIBLE',
      },
    });

    return this.buildModerationResponse(responseId, 'restore', moderatorId, reason);
  }

  /**
   * Get the current moderation status of a response
   * @param responseId - The ID of the response
   */
  async getResponseModerationStatus(responseId: string) {
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        status: true,
        authorId: true,
        topicId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    return {
      responseId: response.id,
      status: response.status,
      isHidden: response.status === 'HIDDEN',
      isRemoved: response.status === 'REMOVED',
      isVisible: response.status === 'VISIBLE',
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  /**
   * Get all responses with a specific moderation status in a topic
   * @param topicId - The ID of the topic
   * @param status - The status filter (VISIBLE, HIDDEN, or REMOVED)
   */
  async getResponsesByStatus(topicId: string, status: 'VISIBLE' | 'HIDDEN' | 'REMOVED') {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    return this.prisma.response.findMany({
      where: {
        topicId,
        status,
      },
      select: {
        id: true,
        status: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Build standardized moderation response DTO
   */
  private buildModerationResponse(
    responseId: string,
    action: 'hide' | 'remove' | 'restore',
    moderatorId: string,
    reason: string,
  ): ModerationActionResponseDto {
    // Map action to status for display
    const statusMap: Record<string, 'hidden' | 'removed'> = {
      hide: 'hidden',
      remove: 'removed',
      restore: 'hidden', // After restore, status becomes visible, but we report what happened
    };

    return {
      responseId,
      action: action as 'hide' | 'remove',
      actionTimestamp: new Date(),
      moderatorId,
      reason,
      newStatus: action === 'restore' ? 'hidden' : (statusMap[action] as 'hidden' | 'removed'),
      appealable: action !== 'remove', // Hidden content can be appealed, removed cannot
    };
  }
}
