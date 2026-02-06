/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { BedrockService } from './bedrock.service.js';

@Module({
  providers: [BedrockService],
  exports: [BedrockService],
})
export class AiModule {}
