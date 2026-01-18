import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateResponseDto } from './dto/create-response.dto.js';
import { UpdateResponseDto } from './dto/update-response.dto.js';
import type { ResponseDto, CitedSourceDto, UserSummaryDto } from './dto/response.dto.js';

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all responses for a discussion topic
   * @param topicId - The ID of the topic to get responses for
   * @returns Array of responses for the topic
   */
  async getResponsesForTopic(topicId: string): Promise<ResponseDto[]> {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Fetch all responses for the topic
    const responses = await this.prisma.response.findMany({
      where: { topicId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Order by creation time, oldest first
      },
    });

    // Map to ResponseDto array
    return responses.map((response) => this.mapToResponseDto(response));
  }

  /**
   * Create a new response to a discussion topic
   * @param topicId - The ID of the topic to respond to
   * @param authorId - The ID of the user creating the response
   * @param createResponseDto - The response data
   * @returns The created response
   */
  async createResponse(
    topicId: string,
    authorId: string,
    createResponseDto: CreateResponseDto,
  ): Promise<ResponseDto> {
    // Validate input
    if (!createResponseDto.content || createResponseDto.content.trim().length < 10) {
      throw new BadRequestException('Response content must be at least 10 characters');
    }

    if (createResponseDto.content.length > 10000) {
      throw new BadRequestException('Response content must not exceed 10000 characters');
    }

    // Verify topic exists and is active or seeding
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true, status: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot add responses to archived topics');
    }

    // Verify parent response exists if parentId is provided
    if (createResponseDto.parentId) {
      const parentResponse = await this.prisma.response.findUnique({
        where: { id: createResponseDto.parentId },
        select: { id: true, topicId: true },
      });

      if (!parentResponse) {
        throw new NotFoundException(
          `Parent response with ID ${createResponseDto.parentId} not found`,
        );
      }

      // Verify parent response belongs to the same topic
      if (parentResponse.topicId !== topicId) {
        throw new BadRequestException('Parent response must belong to the same topic');
      }
    }

    // Transform citedSources to JSON format if provided
    let citedSourcesJson: any = null;
    if (createResponseDto.citedSources && createResponseDto.citedSources.length > 0) {
      citedSourcesJson = createResponseDto.citedSources.map((url) => ({
        url,
        title: null,
        extractedAt: new Date().toISOString(),
      }));
    }

    // Create the response
    const response = await this.prisma.response.create({
      data: {
        topicId,
        authorId,
        parentId: createResponseDto.parentId ?? null,
        content: createResponseDto.content.trim(),
        citedSources: citedSourcesJson,
        containsOpinion: createResponseDto.containsOpinion ?? false,
        containsFactualClaims: createResponseDto.containsFactualClaims ?? false,
        status: 'VISIBLE',
        revisionCount: 0,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Handle proposition associations if provided
    if (createResponseDto.propositionIds && createResponseDto.propositionIds.length > 0) {
      // Create ResponseProposition junction records
      await this.prisma.responseProposition.createMany({
        data: createResponseDto.propositionIds.map((propositionId) => ({
          responseId: response.id,
          propositionId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch the complete response with all relations
    const completeResponse = await this.prisma.response.findUnique({
      where: { id: response.id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
    });

    // Map to ResponseDto
    return this.mapToResponseDto(completeResponse!);
  }

  /**
   * Update an existing response
   * @param responseId - The ID of the response to update
   * @param authorId - The ID of the user requesting the update (for authorization)
   * @param updateResponseDto - The updated response data
   * @returns The updated response
   */
  async updateResponse(
    responseId: string,
    authorId: string,
    updateResponseDto: UpdateResponseDto,
  ): Promise<ResponseDto> {
    // Fetch the existing response
    const existingResponse = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        authorId: true,
        topicId: true,
        status: true,
        topic: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!existingResponse) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Authorization: Only the author can edit their response
    if (existingResponse.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own responses');
    }

    // Cannot edit hidden or removed responses
    if (existingResponse.status === 'HIDDEN' || existingResponse.status === 'REMOVED') {
      throw new BadRequestException(
        `Cannot edit responses with status: ${existingResponse.status}`,
      );
    }

    // Cannot edit responses in archived topics
    if (existingResponse.topic.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot edit responses in archived topics');
    }

    // Validate content if provided
    if (updateResponseDto.content !== undefined) {
      if (!updateResponseDto.content || updateResponseDto.content.trim().length < 10) {
        throw new BadRequestException('Response content must be at least 10 characters');
      }

      if (updateResponseDto.content.length > 10000) {
        throw new BadRequestException('Response content must not exceed 10000 characters');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (updateResponseDto.content !== undefined) {
      updateData.content = updateResponseDto.content.trim();
    }

    if (updateResponseDto.containsOpinion !== undefined) {
      updateData.containsOpinion = updateResponseDto.containsOpinion;
    }

    if (updateResponseDto.containsFactualClaims !== undefined) {
      updateData.containsFactualClaims = updateResponseDto.containsFactualClaims;
    }

    if (updateResponseDto.citedSources !== undefined) {
      updateData.citedSources =
        updateResponseDto.citedSources.length > 0
          ? updateResponseDto.citedSources.map((url) => ({
              url,
              title: null,
              extractedAt: new Date().toISOString(),
            }))
          : null;
    }

    // Increment revision count
    updateData.revisionCount = {
      increment: 1,
    };

    // Update the response
    const updatedResponse = await this.prisma.response.update({
      where: { id: responseId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
    });

    // Handle proposition associations if provided
    if (updateResponseDto.propositionIds !== undefined) {
      // Delete existing associations
      await this.prisma.responseProposition.deleteMany({
        where: { responseId },
      });

      // Create new associations if provided
      if (updateResponseDto.propositionIds.length > 0) {
        await this.prisma.responseProposition.createMany({
          data: updateResponseDto.propositionIds.map((propositionId) => ({
            responseId,
            propositionId,
          })),
          skipDuplicates: true,
        });
      }

      // Fetch updated response with new propositions
      const responseWithPropositions = await this.prisma.response.findUnique({
        where: { id: responseId },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
            },
          },
          propositions: {
            include: {
              proposition: {
                select: {
                  id: true,
                  statement: true,
                },
              },
            },
          },
        },
      });

      return this.mapToResponseDto(responseWithPropositions!);
    }

    // Map to ResponseDto
    return this.mapToResponseDto(updatedResponse);
  }

  /**
   * Map Prisma Response model to ResponseDto
   */
  private mapToResponseDto(response: any): ResponseDto {
    const citedSources: CitedSourceDto[] | undefined = response.citedSources
      ? Array.isArray(response.citedSources)
        ? response.citedSources
        : []
      : undefined;

    const author: UserSummaryDto | undefined = response.author
      ? {
          id: response.author.id,
          displayName: response.author.displayName,
        }
      : undefined;

    return {
      id: response.id,
      content: response.content,
      authorId: response.authorId,
      parentId: response.parentId ?? null,
      author,
      citedSources,
      containsOpinion: response.containsOpinion,
      containsFactualClaims: response.containsFactualClaims,
      propositions: response.propositions
        ? response.propositions.map((rp: any) => ({
            id: rp.proposition.id,
            statement: rp.proposition.statement,
            relevanceScore: rp.relevanceScore ? Number(rp.relevanceScore) : undefined,
          }))
        : undefined,
      status: response.status.toLowerCase(),
      revisionCount: response.revisionCount,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }
}
