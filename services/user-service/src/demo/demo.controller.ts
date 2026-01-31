import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { DemoService } from './demo.service.js';
import { DemoResetService } from './demo-reset.service.js';
import {
  DemoDiscussionsResponseDto,
  GetDemoDiscussionsQueryDto,
} from './dto/demo-discussion.dto.js';
import { DemoCredentialsResponseDto } from './dto/demo-credentials.dto.js';
import { DemoPersonasResponseDto, GetDemoPersonasQueryDto } from './dto/demo-persona.dto.js';
import { ResetOptionsDto, ResetResultDto } from './dto/reset-options.dto.js';
import { DemoStatusDto } from './dto/demo-status.dto.js';

/**
 * Controller for demo content endpoints
 * Provides pre-authentication demonstration of platform value
 */
@Controller('demo')
export class DemoController {
  private readonly logger = new Logger(DemoController.name);

  constructor(
    private readonly demoService: DemoService,
    private readonly demoResetService: DemoResetService,
  ) {}

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

  /**
   * GET /demo/credentials
   * Returns credential hints for all demo personas
   *
   * No authentication required - public endpoint
   * Does NOT return actual passwords, only hints
   *
   * @returns Credential hints with password pattern explanation
   */
  @Get('credentials')
  @HttpCode(HttpStatus.OK)
  async getDemoCredentials(): Promise<DemoCredentialsResponseDto> {
    this.logger.log('GET /demo/credentials - returning credential hints');

    return this.demoService.getDemoCredentials();
  }

  /**
   * GET /demo/personas
   * Returns detailed information about demo personas
   *
   * No authentication required - public endpoint
   *
   * @param query - Optional role filter
   * @returns Demo persona details with trust scores and profiles
   */
  @Get('personas')
  @HttpCode(HttpStatus.OK)
  async getDemoPersonas(@Query() query: GetDemoPersonasQueryDto): Promise<DemoPersonasResponseDto> {
    this.logger.log(`GET /demo/personas - role filter: ${query.role || 'none'}`);

    return this.demoService.getDemoPersonas(query.role);
  }

  /**
   * GET /demo/status
   * Returns current demo environment status including data counts and health
   *
   * No authentication required - public endpoint
   *
   * @returns Demo environment status
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getDemoStatus(): Promise<DemoStatusDto> {
    this.logger.log('GET /demo/status - returning environment status');

    return this.demoResetService.getStatus();
  }

  /**
   * POST /demo/reset
   * Resets demo environment to seed state
   *
   * ADMIN ONLY - Requires admin authentication
   * Only available in demo mode (DEMO_MODE=true)
   *
   * @param options - Reset options
   * @returns Reset result with counts
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDemo(@Body() options: ResetOptionsDto): Promise<ResetResultDto> {
    this.logger.log('POST /demo/reset - resetting demo environment');

    // Check if demo mode is enabled
    if (process.env['DEMO_MODE'] !== 'true') {
      throw new ForbiddenException('Reset is only available in demo mode');
    }

    // In production, this would also check for admin role via @UseGuards(AdminGuard)
    // For now, we rely on the DEMO_MODE check

    return this.demoResetService.reset(options);
  }
}
