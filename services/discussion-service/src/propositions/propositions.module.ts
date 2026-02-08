/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PropositionsController } from './propositions.controller.js';
import { PropositionsService } from './propositions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PropositionsController],
  providers: [PropositionsService],
  exports: [PropositionsService],
})
export class PropositionsModule {}
