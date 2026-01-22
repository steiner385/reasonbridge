import { Controller, Get, Query, Param, Res } from '@nestjs/common';
import type { FastifyReply as Response } from 'fastify';
import { TopicsService } from './topics.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import { SearchTopicsQueryDto } from './dto/search-topics-query.dto.js';
import { GetCommonGroundQueryDto } from './dto/common-ground-query.dto.js';
import { ExportCommonGroundQueryDto } from './dto/export-common-ground-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';

@Controller('topics')
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly exportService: CommonGroundExportService,
  ) {}

  @Get()
  async getTopics(@Query() query: GetTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.getTopics(query);
  }

  @Get('search')
  async searchTopics(@Query() query: SearchTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.searchTopics(query);
  }

  @Get(':id')
  async getTopicById(@Param('id') id: string): Promise<TopicResponseDto> {
    return this.topicsService.getTopicById(id);
  }

  @Get(':id/common-ground')
  async getCommonGroundAnalysis(
    @Param('id') id: string,
    @Query() query: GetCommonGroundQueryDto,
  ): Promise<CommonGroundResponseDto> {
    return this.topicsService.getCommonGroundAnalysis(id, query.version);
  }

  @Get(':id/common-ground/export')
  async exportCommonGroundAnalysis(
    @Param('id') id: string,
    @Query() query: ExportCommonGroundQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    // Fetch the analysis
    const analysis = await this.topicsService.getCommonGroundAnalysis(id, query.version);

    // Export in the requested format
    const exportResult = await this.exportService.exportAnalysis(analysis, query.format || 'pdf');

    // Set response headers
    res.header('Content-Type', exportResult.mimeType);
    res.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);

    // Send the data
    if (Buffer.isBuffer(exportResult.data)) {
      res.send(exportResult.data);
    } else {
      res.send(exportResult.data);
    }
  }

  @Get(':id/common-ground/share-link')
  async getCommonGroundShareLink(
    @Param('id') id: string,
    @Query() query: GetCommonGroundQueryDto,
  ): Promise<{ shareUrl: string; analysisId: string }> {
    // Fetch the analysis to ensure it exists
    const analysis = await this.topicsService.getCommonGroundAnalysis(id, query.version);

    // Generate share link (baseUrl should come from config in production)
    const baseUrl = process.env['APP_BASE_URL'] || 'http://localhost:3000';
    const shareUrl = this.exportService.generateShareLink(analysis.id, baseUrl);

    return {
      shareUrl,
      analysisId: analysis.id,
    };
  }
}
