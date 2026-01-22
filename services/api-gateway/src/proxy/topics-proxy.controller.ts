import { Controller, Get, Param, Query, Res, Headers } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

@Controller('topics')
export class TopicsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  async getTopics(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: '/topics',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get('search')
  async searchTopics(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: '/topics/search',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id')
  async getTopicById(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id/common-ground')
  async getCommonGroundAnalysis(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/common-ground`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
