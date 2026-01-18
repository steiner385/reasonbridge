import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import type { ScreeningResult } from '../services/content-screening.service.js';
import { ContentScreeningService } from '../services/content-screening.service.js';

export interface ScreenContentRequest {
  contentId: string;
  content: string;
}

export interface ScreenContentResponse {
  screening_result: ScreeningResult;
  recommendations: string[];
}

@Controller('moderation')
export class ModerationController {
  constructor(private readonly screeningService: ContentScreeningService) {}

  @Post('screen')
  async screenContent(
    @Body() request: ScreenContentRequest,
  ): Promise<ScreenContentResponse> {
    if (!request.contentId || !request.content) {
      throw new BadRequestException(
        'contentId and content are required fields',
      );
    }

    if (request.content.trim().length === 0) {
      throw new BadRequestException('content cannot be empty');
    }

    if (request.content.length > 10000) {
      throw new BadRequestException('content exceeds maximum length of 10000');
    }

    const screening_result = await this.screeningService.screenContent(
      request.contentId,
      request.content,
    );

    const recommendations = this.screeningService.getRecommendations(
      screening_result,
    );

    return {
      screening_result,
      recommendations,
    };
  }
}
