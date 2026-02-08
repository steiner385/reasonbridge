/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PropositionsService {
  constructor(private prisma: PrismaService) {}

  async findByTopicId(topicId: string) {
    return this.prisma.proposition.findMany({
      where: { topicId },
      include: {
        responses: {
          select: { responseId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
