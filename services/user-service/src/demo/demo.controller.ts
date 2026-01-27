import { Controller, Get, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { DemoService } from './demo.service.js';
import {
  DemoDiscussionsResponseDto,
  GetDemoDiscussionsQueryDto,
} from './dto/demo-discussion.dto.js';

/**
 * Controller for demo content endpoints
 * Provides pre-authentication demonstration of platform value
 */
@Controller('demo')
export class DemoController {
  private readonly logger = new Logger(DemoController.name);

  constructor(private readonly demoService: DemoService) {}

  /**
   * GET /demo/discussions
   * Returns curated discussion examples for landing page demo
   *
   * No authentication required - public endpoint
   *
   * @param query - Query parameters (limit, sessionId)
   * @returns Demo discussions with social proof metrics
   */
  @Get('discussions')
  @HttpCode(HttpStatus.OK)
  async getDemoDiscussions(
    @Query() query: GetDemoDiscussionsQueryDto,
  ): Promise<DemoDiscussionsResponseDto> {
    this.logger.log(
      `GET /demo/discussions - limit: ${query.limit || 5}, sessionId: ${query.sessionId || 'none'}`,
    );

    return this.demoService.getDemoDiscussions(query.limit, query.sessionId);
  }
}
