import { Controller, Get, Query, Param } from '@nestjs/common';
import { TopicsService } from './topics.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import { SearchTopicsQueryDto } from './dto/search-topics-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  async getTopics(
    @Query() query: GetTopicsQueryDto,
  ): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.getTopics(query);
  }

  @Get('search')
  async searchTopics(
    @Query() query: SearchTopicsQueryDto,
  ): Promise<PaginatedTopicsResponseDto> {
    return this.topicsService.searchTopics(query);
  }

  @Get(':id')
  async getTopicById(@Param('id') id: string): Promise<TopicResponseDto> {
    return this.topicsService.getTopicById(id);
  }
}
