import { Controller, Get, Query, Param } from '@nestjs/common';
import { TopicsService } from './topics.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import { SearchTopicsQueryDto } from './dto/search-topics-query.dto.js';
import { GetCommonGroundQueryDto } from './dto/common-ground-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

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
}
