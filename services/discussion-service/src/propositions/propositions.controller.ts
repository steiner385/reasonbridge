/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Param } from '@nestjs/common';
import { PropositionsService } from './propositions.service.js';

@Controller('topics/:topicId/propositions')
export class PropositionsController {
  constructor(private readonly propositionsService: PropositionsService) {}

  @Get()
  async getTopicPropositions(@Param('topicId') topicId: string) {
    return this.propositionsService.findByTopicId(topicId);
  }
}
