import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AlignmentDto } from './dto/alignment.dto.js';
import type { SetAlignmentDto } from './dto/set-alignment.dto.js';
import { AlignmentAggregationService } from './alignment-aggregation.service.js';

@Injectable()
export class AlignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregationService: AlignmentAggregationService,
  ) {}

  /**
   * Set or update user alignment on a proposition
   * Creates new alignment or updates existing one
   */
  async setAlignment(
    propositionId: string,
    userId: string,
    setAlignmentDto: SetAlignmentDto,
  ): Promise<AlignmentDto> {
    // Verify proposition exists
    const proposition = await this.prisma.proposition.findUnique({
      where: { id: propositionId },
    });

    if (!proposition) {
      throw new NotFoundException(`Proposition with ID ${propositionId} not found`);
    }

    // Validate nuanceExplanation is provided when stance is NUANCED
    if (setAlignmentDto.stance === 'NUANCED' && !setAlignmentDto.nuanceExplanation) {
      throw new BadRequestException('nuanceExplanation is required when stance is NUANCED');
    }

    // Check for existing alignment
    const existingAlignment = await this.prisma.alignment.findUnique({
      where: {
        userId_propositionId: {
          userId,
          propositionId,
        },
      },
    });

    // Update existing alignment
    if (existingAlignment) {
      const updatedAlignment = await this.prisma.alignment.update({
        where: { id: existingAlignment.id },
        data: {
          stance: setAlignmentDto.stance,
          nuanceExplanation: setAlignmentDto.nuanceExplanation || null,
        },
      });

      // Update proposition aggregates after alignment change
      await this.aggregationService.updatePropositionAggregates(propositionId);

      return this.mapToAlignmentDto(updatedAlignment);
    }

    // Create new alignment
    const newAlignment = await this.prisma.alignment.create({
      data: {
        userId,
        propositionId,
        stance: setAlignmentDto.stance,
        nuanceExplanation: setAlignmentDto.nuanceExplanation || null,
      },
    });

    // Update proposition aggregates after new alignment
    await this.aggregationService.updatePropositionAggregates(propositionId);

    return this.mapToAlignmentDto(newAlignment);
  }

  /**
   * Remove user alignment from a proposition
   */
  async removeAlignment(propositionId: string, userId: string): Promise<void> {
    const alignment = await this.prisma.alignment.findUnique({
      where: {
        userId_propositionId: {
          userId,
          propositionId,
        },
      },
    });

    if (!alignment) {
      throw new NotFoundException('Alignment not found');
    }

    await this.prisma.alignment.delete({
      where: { id: alignment.id },
    });

    // Update proposition aggregates after alignment removal
    await this.aggregationService.updatePropositionAggregates(propositionId);
  }

  /**
   * Get user's alignment on a proposition (if exists)
   */
  async getUserAlignment(propositionId: string, userId: string): Promise<AlignmentDto | null> {
    const alignment = await this.prisma.alignment.findUnique({
      where: {
        userId_propositionId: {
          userId,
          propositionId,
        },
      },
    });

    if (!alignment) {
      return null;
    }

    return this.mapToAlignmentDto(alignment);
  }

  private mapToAlignmentDto(alignment: {
    id: string;
    stance: string;
    nuanceExplanation: string | null;
    createdAt: Date;
  }): AlignmentDto {
    const dto: AlignmentDto = {
      id: alignment.id,
      stance: alignment.stance as 'SUPPORT' | 'OPPOSE' | 'NUANCED',
      createdAt: alignment.createdAt,
    };

    if (alignment.nuanceExplanation) {
      dto.nuanceExplanation = alignment.nuanceExplanation;
    }

    return dto;
  }
}
