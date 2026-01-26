/**
 * Topic Controller
 * Handles topic retrieval endpoints
 */

import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TopicService } from './topic.service';
import { TopicsResponseDto } from './dto/topics-response.dto';
import { ActivityLevel } from './dto/topic.dto';

@ApiTags('Topics')
@Controller('topics')
export class TopicController {
  private readonly logger = new Logger(TopicController.name);

  constructor(private readonly topicService: TopicService) {}

  /**
   * T093: GET /topics
   * Retrieve available topics with optional filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get available discussion topics',
    description: 'Retrieve all topics with activity levels and optional filtering',
  })
  @ApiQuery({
    name: 'suggestedOnly',
    description: 'Filter to only topics suggested for new users',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'minActivity',
    description: 'Minimum activity level filter',
    required: false,
    enum: ActivityLevel,
  })
  @ApiResponse({
    status: 200,
    description: 'Topics retrieved successfully',
    type: TopicsResponseDto,
  })
  async getTopics(
    @Query('suggestedOnly') suggestedOnly?: string,
    @Query('minActivity') minActivity?: ActivityLevel,
  ): Promise<TopicsResponseDto> {
    this.logger.log(`GET /topics - suggestedOnly: ${suggestedOnly}, minActivity: ${minActivity}`);

    const suggestedOnlyBool = suggestedOnly === 'true';
    return this.topicService.getTopics(suggestedOnlyBool, minActivity);
  }
}
