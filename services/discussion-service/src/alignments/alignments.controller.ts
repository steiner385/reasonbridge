import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AlignmentsService } from './alignments.service.js';
import { SetAlignmentDto } from './dto/set-alignment.dto.js';
import type { AlignmentDto } from './dto/alignment.dto.js';

@Controller('propositions')
export class AlignmentsController {
  constructor(private readonly alignmentsService: AlignmentsService) {}

  /**
   * Get user's alignment on a proposition
   * GET /propositions/:propositionId/alignment
   *
   * Returns user's alignment if exists, null otherwise
   */
  @Get(':propositionId/alignment')
  async getUserAlignment(
    @Param('propositionId') propositionId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<AlignmentDto | null> {
    return this.alignmentsService.getUserAlignment(propositionId, userId);
  }

  /**
   * Set or update alignment on a proposition
   * PUT /propositions/:propositionId/alignment
   *
   * Creates new alignment or updates existing one
   */
  @Put(':propositionId/alignment')
  @HttpCode(HttpStatus.OK)
  async setAlignment(
    @Param('propositionId') propositionId: string,
    @Headers('x-user-id') userId: string,
    @Body() setAlignmentDto: SetAlignmentDto,
  ): Promise<AlignmentDto> {
    return this.alignmentsService.setAlignment(propositionId, userId, setAlignmentDto);
  }

  /**
   * Remove alignment from a proposition
   * DELETE /propositions/:propositionId/alignment
   */
  @Delete(':propositionId/alignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAlignment(
    @Param('propositionId') propositionId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<void> {
    await this.alignmentsService.removeAlignment(propositionId, userId);
  }
}
