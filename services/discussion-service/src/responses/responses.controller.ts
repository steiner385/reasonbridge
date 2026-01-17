import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ResponsesService } from './responses.service.js';
import { CreateResponseDto } from './dto/create-response.dto.js';
import type { ResponseDto } from './dto/response.dto.js';

@Controller('topics')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  /**
   * POST /topics/:topicId/responses
   * Create a new response to a discussion topic
   *
   * @param topicId - The ID of the topic to respond to
   * @param createResponseDto - The response data
   * @returns The created response
   */
  @Post(':topicId/responses')
  @HttpCode(HttpStatus.CREATED)
  async createResponse(
    @Param('topicId') topicId: string,
    @Body() createResponseDto: CreateResponseDto,
  ): Promise<ResponseDto> {
    // TODO: Extract authorId from JWT token when auth is implemented
    // For now, using a placeholder. This should be replaced with:
    // @Req() request: FastifyRequest
    // const authorId = request.user.id;
    const authorId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    return this.responsesService.createResponse(topicId, authorId, createResponseDto);
  }
}
